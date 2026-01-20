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
  .setDescription('Verifica tu correo con un OTP')
  .addSubcommand((sub) =>
    sub
      .setName('start')
      .setDescription('Inicia verificación de correo')
      .addStringOption((opt) =>
        opt.setName('email').setDescription('Correo a verificar').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('code')
      .setDescription('Confirma el OTP enviado a tu correo')
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

  if (!cfg?.roles.verify) {
    logger.warn('Verify role not configured', { requestId, guildId });
    return interaction.reply({
      content: 'Rol de verificación no configurado. Usa /setup.',
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
      return interaction.reply({
        content: `No se pudo verificar: ${result.reason}`,
        flags: 1 << 6,
      });
    }

    const roleId = cfg.roles.verify;
    const role = interaction.guild.roles.cache.get(roleId);
    const botMember = interaction.guild.members.me;

    if (!role) {
      logger.error('Verify role not found in guild', {
        requestId,
        roleId,
        guildId,
      });
      return interaction.reply({
        content: 'El rol de verificado no existe en el servidor.',
        flags: 1 << 6,
      });
    }

    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      logger.error('Bot missing ManageRoles permission', {
        requestId,
        guildId,
      });
      return interaction.reply({
        content: 'No tengo permiso de Manage Roles para asignar el rol de verificado.',
        flags: 1 << 6,
      });
    }

    if (botMember.roles.highest.comparePositionTo(role) <= 0) {
      logger.error('Verify role is above bot role in hierarchy', {
        requestId,
        roleId,
        guildId,
      });
      return interaction.reply({
        content: 'El rol de verificado está por encima o igual a mi rol. Súbeme en la jerarquía.',
        flags: 1 << 6,
      });
    }

    try {
      await member.roles.add(roleId);
      logger.info('Verify role assigned successfully', {
        requestId,
        userId: member.id,
        guildId,
        roleId,
      });
    } catch (err) {
      logger.error('Failed to assign verify role', {
        requestId,
        userId: member.id,
        guildId,
        roleId,
        error: err instanceof Error ? err.message : String(err),
        errorType: err instanceof Error ? err.name : 'RoleAssignError',
      });
      return interaction.reply({
        content: 'No pude asignar el rol de verificado. Revisa permisos/jerarquía.',
        flags: 1 << 6,
      });
    }

    // Persist email as verified for this user
    const verifiedMap = cfg.verificationEmails || {};
    verifiedMap[result.email!.toLowerCase()] = member.id;
    upsertGuildConfig({ ...cfg, guildId, verificationEmails: verifiedMap }, requestId);

    logger.info('User verification completed', {
      requestId,
      userId: member.id,
      guildId,
      email: maskEmail(result.email!),
    });

    const embed = buildEmbed({
      title: 'Verificado',
      description: `Correo verificado: ${result.email}`,
    });
    return interaction.reply({ embeds: [embed], flags: 1 << 6 });
  }
}

export default { data, execute, defer: true };
