import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { getGuildConfig, upsertGuildConfig } from '../config/store';
import { generateOtp, verifyOtp, pendingOtp } from '../utils/otp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function sendOtp(email: string, code: string) {
  // Placeholder: implement real email send via SMTP/API.
  console.log(`[OTP] Send to ${email}: ${code}`);
}

async function execute(interaction: any) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const member = interaction.member;
  const cfg = guildId ? getGuildConfig(guildId) : undefined;

  if (!cfg?.roles.verify) {
    return interaction.reply({
      content: 'Rol de verificación no configurado. Usa /setup.',
      flags: 1 << 6,
    });
  }

  if (sub === 'start') {
    const emailRaw = interaction.options.getString('email', true).trim();
    const email = emailRaw.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return interaction.reply({
        content: 'Correo inválido. Usa un formato válido.',
        flags: 1 << 6,
      });
    }

    const existing = pendingOtp(guildId, member.id);
    if (existing) {
      return interaction.reply({
        content: 'Ya tienes un OTP pendiente, revisa tu correo.',
        flags: 1 << 6,
      });
    }

    // Prevent the same email being verified by more than 2 different users
    const verifiedMap = cfg.verificationEmails || {};
    const existingUserForEmail = verifiedMap[email];
    if (existingUserForEmail && existingUserForEmail !== member.id) {
      return interaction.reply({
        content: 'Este correo ya fue usado por otro usuario. No se puede reutilizar.',
        flags: 1 << 6,
      });
    }

    const code = generateOtp(guildId, member.id, email);
    await sendOtp(email, code);
    const embed = buildEmbed({
      title: 'Verificación iniciada',
      description: `Enviamos un código a ${email}. Usa /verify code <OTP>.`,
    });
    return interaction.reply({ embeds: [embed], flags: 1 << 6 });
  }

  if (sub === 'code') {
    const code = interaction.options.getString('otp', true);
    const result = verifyOtp(guildId, member.id, code);
    if (!result.ok) {
      return interaction.reply({
        content: `No se pudo verificar: ${result.reason}`,
        flags: 1 << 6,
      });
    }
    const roleId = cfg.roles.verify;
    const role = interaction.guild.roles.cache.get(roleId);
    const botMember = interaction.guild.members.me;
    if (!role) {
      return interaction.reply({
        content: 'El rol de verificado no existe en el servidor.',
        flags: 1 << 6,
      });
    }
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: 'No tengo permiso de Manage Roles para asignar el rol de verificado.',
        flags: 1 << 6,
      });
    }
    if (botMember.roles.highest.comparePositionTo(role) <= 0) {
      return interaction.reply({
        content: 'El rol de verificado está por encima o igual a mi rol. Súbeme en la jerarquía.',
        flags: 1 << 6,
      });
    }

    try {
      await member.roles.add(roleId);
    } catch (err) {
      console.error('Error asignando rol verify', err);
      return interaction.reply({
        content: 'No pude asignar el rol de verificado. Revisa permisos/jerarquía.',
        flags: 1 << 6,
      });
    }

    // Persist email as verified for this user
    const verifiedMap = cfg.verificationEmails || {};
    verifiedMap[result.email!.toLowerCase()] = member.id;
    upsertGuildConfig({ ...cfg, guildId, verificationEmails: verifiedMap });

    const embed = buildEmbed({
      title: 'Verificado',
      description: `Correo verificado: ${result.email}`,
    });
    return interaction.reply({ embeds: [embed], flags: 1 << 6 });
  }
}

export default { data, execute };
