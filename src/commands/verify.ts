import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { getGuildConfig, upsertGuildConfig } from '../config/store';
import { generateOtp, verifyOtp, pendingOtp } from '../utils/otp';
import { sendOtpEmail } from '../utils/mailer';
import { logger, generateRequestId } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${local.length > 2 ? '***' : ''}@${domain}`;
}

const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('🔐 Verifica tu correo con código OTP')
  .addSubcommand((sub) =>
    sub
      .setName('start')
      .setDescription('🔐 Envía código OTP a tu correo')
      .addStringOption((opt) =>
        opt.setName('email').setDescription('Correo a verificar').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('code')
      .setDescription('✅ Confirma código OTP recibido')
      .addStringOption((opt) => opt.setName('otp').setDescription('Código OTP').setRequired(true)),
  );

/**
 * Ejecuta el comando verify para el proceso de verificación por correo
 * @param {any} interaction - La interacción de Discord
 * @returns {Promise<void>}
 */
async function execute(interaction: any) {
  const requestId = generateRequestId();
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const member = interaction.member;
  const cfg = guildId ? getGuildConfig(guildId) : undefined;

  logger.info('Verify command started', {
    requestId,
    subcommand: sub,
    userId: member.id,
    guildId,
  });

  if (!cfg?.roles.verify || !cfg?.roles.verifyJaveriana) {
    logger.warn('Verify roles not configured', { requestId, guildId });
    return interaction.reply({
      content:
        'Roles de verificación no configurados. Usa /setup para configurar ambos roles (normal y Javeriana).',
      flags: 1 << 6,
    });
  }

  if (sub === 'start') {
    // Rate limiting: 30s cooldown
    const rateLimitKey = `verify:${guildId}:${member.id}`;
    const rateCheck = checkRateLimit(rateLimitKey, 30000);

    if (!rateCheck.allowed) {
      const seconds = Math.ceil(rateCheck.remainingMs! / 1000);
      logger.info('Verify rate limited', {
        requestId,
        userId: member.id,
        guildId,
        remainingSeconds: seconds,
      });
      return interaction.reply({
        content: `Debes esperar ${seconds}s antes de solicitar otro código.`,
        flags: 1 << 6,
      });
    }

    const emailRaw = interaction.options.getString('email', true).trim();
    const email = emailRaw.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      logger.warn('Invalid email format', {
        requestId,
        email: maskEmail(email),
        userId: member.id,
      });
      return interaction.reply({
        content: 'Correo inválido. Usa un formato válido.',
        flags: 1 << 6,
      });
    }

    const existing = pendingOtp(guildId, member.id);
    if (existing) {
      logger.info('User already has pending OTP', {
        requestId,
        userId: member.id,
        guildId,
      });
      return interaction.reply({
        content: 'Ya tienes un OTP pendiente, revisa tu correo.',
        flags: 1 << 6,
      });
    }

    // Prevent the same email being verified by more than 2 different users
    const verifiedMap = cfg.verificationEmails || {};
    const existingUserForEmail = verifiedMap[email];

    if (existingUserForEmail && existingUserForEmail !== member.id) {
      logger.warn('Email already used by another user', {
        requestId,
        email: maskEmail(email),
        userId: member.id,
        existingUser: existingUserForEmail,
        guildId,
      });
      return interaction.reply({
        content: 'Este correo ya fue usado por otro usuario. No se puede reutilizar.',
        flags: 1 << 6,
      });
    }

    // Verificar si el usuario intenta re-verificarse con el mismo correo
    if (existingUserForEmail === member.id) {
      const isNewEmailJaveriana = email.endsWith('@javeriana.edu.co');

      // Verificar si el usuario ya tiene un correo Javeriano registrado
      const userHasJaverianaEmail = Object.entries(verifiedMap).some(
        ([verifiedEmail, userId]) =>
          userId === member.id && verifiedEmail.endsWith('@javeriana.edu.co'),
      );

      if (userHasJaverianaEmail) {
        // Ya tiene verificación Javeriana, no permitir cambio
        logger.warn('User already has Javeriana verification', {
          requestId,
          userId: member.id,
          guildId,
          attemptedEmail: maskEmail(email),
        });
        return interaction.reply({
          content: 'Ya tienes verificación con correo Javeriano.',
          flags: 1 << 6,
        });
      }

      if (isNewEmailJaveriana && !userHasJaverianaEmail) {
        // Permitir upgrade de verify normal → verifyJaveriana
        logger.info('User attempting upgrade to Javeriana verification', {
          requestId,
          userId: member.id,
          guildId,
          newEmail: maskEmail(email),
        });
        // Continuar con el proceso de verificación (upgrade se manejará al confirmar OTP)
      } else {
        // Ya está verificado con este correo
        logger.info('User already verified with this email', {
          requestId,
          userId: member.id,
          guildId,
          email: maskEmail(email),
        });
        return interaction.reply({
          content: 'Ya estás verificado con este correo.',
          flags: 1 << 6,
        });
      }
    }

    const code = generateOtp(guildId, member.id, email);
    const startedAt = Date.now();

    try {
      await sendOtpEmail(email, code, requestId);
      const duration = Date.now() - startedAt;
      logger.info('OTP sent successfully', {
        requestId,
        email: maskEmail(email),
        userId: member.id,
        guildId,
        duration,
      });
    } catch (err) {
      // NO limpiar el OTP - permitir que el usuario reintente
      logger.error('Failed to send OTP email', {
        requestId,
        email: maskEmail(email),
        userId: member.id,
        guildId,
        error: err instanceof Error ? err.message : String(err),
        errorType: err instanceof Error ? err.name : 'EmailError',
      });
      const reason = err instanceof Error ? err.message : 'No se pudo enviar el correo.';

      // Validar estado antes de responder
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: `No se pudo enviar el correo. ${reason}`,
        });
      } else {
        return interaction.reply({
          content: `No se pudo enviar el correo. ${reason}`,
          flags: 1 << 6,
        });
      }
    }

    const embed = buildEmbed({
      title: 'Verificación iniciada',
      description: `Enviamos un código a ${email}. Usa /verify code <OTP>.`,
    });

    // Validar estado antes de responder
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ embeds: [embed] });
    } else {
      return interaction.reply({ embeds: [embed], flags: 1 << 6 });
    }
  }

  if (sub === 'code') {
    const code = interaction.options.getString('otp', true);
    const result = verifyOtp(guildId, member.id, code);

    if (!result.ok) {
      logger.warn('OTP verification failed', {
        requestId,
        userId: member.id,
        guildId,
        reason: result.reason,
      });

      // Usar editReply porque el comando está deferido
      if (interaction.deferred) {
        return interaction.editReply({
          content: `No se pudo verificar: ${result.reason}`,
        });
      } else {
        return interaction.reply({
          content: `No se pudo verificar: ${result.reason}`,
          flags: 1 << 6,
        });
      }
    }

    // Determinar qué rol asignar según el dominio del email
    const email = result.email!.toLowerCase();
    const isJaveriana = email.endsWith('@javeriana.edu.co');
    const roleId = isJaveriana ? cfg.roles.verifyJaveriana : cfg.roles.verify;
    const roleName = isJaveriana ? 'Javeriana' : 'Normal';

    logger.info('Determining role based on email domain', {
      requestId,
      email: maskEmail(email),
      isJaveriana,
      roleType: roleName,
      roleId,
    });

    const role = interaction.guild.roles.cache.get(roleId);
    const botMember = interaction.guild.members.me;

    if (!role) {
      logger.error('Verify role not found in guild', {
        requestId,
        roleId,
        roleType: roleName,
        guildId,
      });

      if (interaction.deferred) {
        return interaction.editReply({
          content: `El rol de verificado (${roleName}) no existe en el servidor.`,
        });
      } else {
        return interaction.reply({
          content: `El rol de verificado (${roleName}) no existe en el servidor.`,
          flags: 1 << 6,
        });
      }
    }

    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      logger.error('Bot missing ManageRoles permission', {
        requestId,
        guildId,
      });

      if (interaction.deferred) {
        return interaction.editReply({
          content: 'No tengo permiso de Manage Roles para asignar el rol de verificado.',
        });
      } else {
        return interaction.reply({
          content: 'No tengo permiso de Manage Roles para asignar el rol de verificado.',
          flags: 1 << 6,
        });
      }
    }

    if (botMember.roles.highest.comparePositionTo(role) <= 0) {
      logger.error('Verify role is above bot role in hierarchy', {
        requestId,
        roleId,
        guildId,
      });

      if (interaction.deferred) {
        return interaction.editReply({
          content: 'El rol de verificado está por encima o igual a mi rol. Súbeme en la jerarquía.',
        });
      } else {
        return interaction.reply({
          content: 'El rol de verificado está por encima o igual a mi rol. Súbeme en la jerarquía.',
          flags: 1 << 6,
        });
      }
    }

    try {
      // Detectar si es un upgrade de verify → verifyJaveriana
      const isUpgrade = isJaveriana && member.roles.cache.has(cfg.roles.verify!);

      if (isUpgrade) {
        // Remover rol verify normal antes de asignar verifyJaveriana
        await member.roles.remove(cfg.roles.verify!);
        logger.info('Removed normal verify role for upgrade', {
          requestId,
          userId: member.id,
          guildId,
          removedRoleId: cfg.roles.verify,
        });
      }

      // Asignar el nuevo rol
      await member.roles.add(roleId);
      logger.info(
        isUpgrade ? 'User upgraded to Javeriana verification' : 'Verify role assigned successfully',
        {
          requestId,
          userId: member.id,
          guildId,
          roleId,
          isUpgrade,
        },
      );
    } catch (err) {
      logger.error('Failed to assign verify role', {
        requestId,
        userId: member.id,
        guildId,
        roleId,
        error: err instanceof Error ? err.message : String(err),
        errorType: err instanceof Error ? err.name : 'RoleAssignError',
      });

      if (interaction.deferred) {
        return interaction.editReply({
          content: 'No pude asignar el rol de verificado. Revisa permisos/jerarquía.',
        });
      } else {
        return interaction.reply({
          content: 'No pude asignar el rol de verificado. Revisa permisos/jerarquía.',
          flags: 1 << 6,
        });
      }
    }

    // Persist email as verified for this user
    const verifiedMap = cfg.verificationEmails || {};

    // Si es upgrade, eliminar el correo anterior del mapa
    if (isJaveriana && member.roles.cache.has(cfg.roles.verifyJaveriana!)) {
      // Encontrar y eliminar el correo anterior (no Javeriano)
      const oldEmail = Object.entries(verifiedMap).find(
        ([verifiedEmail, userId]) =>
          userId === member.id && !verifiedEmail.endsWith('@javeriana.edu.co'),
      );

      if (oldEmail) {
        delete verifiedMap[oldEmail[0]];
        logger.info('Removed old email from verification map during upgrade', {
          requestId,
          userId: member.id,
          guildId,
          oldEmail: maskEmail(oldEmail[0]),
        });
      }
    }

    // Agregar el nuevo correo al mapa
    verifiedMap[result.email!.toLowerCase()] = member.id;
    upsertGuildConfig({ ...cfg, guildId, verificationEmails: verifiedMap }, requestId);

    logger.info('User verification completed', {
      requestId,
      userId: member.id,
      guildId,
      email: maskEmail(result.email!),
      roleType: roleName,
      roleId,
    });

    const embed = buildEmbed({
      title: '✅ Verificado',
      description: `**Correo verificado:** ${result.email}\n**Tipo:** ${roleName}`,
      color: isJaveriana ? '#D32F2F' : '#5865F2', // Rojo para Javeriana, azul para normal
    });

    // Usar editReply porque el comando está deferido
    if (interaction.deferred) {
      return interaction.editReply({ embeds: [embed] });
    } else {
      return interaction.reply({ embeds: [embed], flags: 1 << 6 });
    }
  }
}

export default { data, execute, defer: true };
