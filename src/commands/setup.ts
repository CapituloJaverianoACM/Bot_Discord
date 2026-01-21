/**
 * @file setup.ts
 * @description Comando para configurar roles y canales esenciales del bot en el servidor.
 * Establece roles de admin, junta, verificado y evento, así como canales para
 * bienvenida, tickets, anuncios, y sistema de voz.
 * Solo accesible para administradores.
 */

import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { upsertGuildConfig } from '../config/store';
import { buildEmbed } from '../utils/embed';

/** Definición del comando /setup con todas las opciones de configuración */
const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configura canales y roles del bot')
  .addStringOption((opt) => opt.setName('role_admin').setDescription('Rol admin').setRequired(true))
  .addStringOption((opt) => opt.setName('role_junta').setDescription('Rol junta').setRequired(true))
  .addStringOption((opt) =>
    opt.setName('role_verify').setDescription('Rol verificado (normal)').setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName('role_verify_javeriana')
      .setDescription('Rol verificado Javeriana (@javeriana.edu.co)')
      .setRequired(true),
  )
  // required channel options
  .addStringOption((opt) =>
    opt
      .setName('channel_welcome')
      .setDescription('Canal de bienvenida (default general)')
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName('channel_ticket').setDescription('Canal donde se crea el ticket').setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName('channel_announcements').setDescription('Canal de anuncios').setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName('channel_vc_create').setDescription('Canal VC CREATE').setRequired(true),
  )
  .addStringOption((opt) => opt.setName('channel_vc1').setDescription('VC #1').setRequired(true))
  .addStringOption((opt) => opt.setName('channel_vc2').setDescription('VC #2').setRequired(true))
  .addStringOption((opt) =>
    opt.setName('category_voice').setDescription('Categoría VOZ').setRequired(true),
  )
  // optional goes after required ones
  .addStringOption((opt) =>
    opt
      .setName('role_event_ping')
      .setDescription('Rol para avisos de eventos/anuncios')
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName('channel_alerts')
      .setDescription('Canal para alertas del sistema (opcional)')
      .setRequired(false),
  )
  .addIntegerOption((opt) =>
    opt
      .setName('alert_threshold')
      .setDescription('% de errores para alertar (10-50, default: 20)')
      .setRequired(false)
      .setMinValue(10)
      .setMaxValue(50),
  );

/**
 * Ejecuta el comando setup para configurar el servidor
 * @param {any} interaction - La interacción de Discord
 * @returns {Promise<void>}
 */
async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Solo admins/junta pueden usar setup', ephemeral: true });
  }
  const guildId = interaction.guildId;
  const config = {
    guildId,
    roles: {
      admin: interaction.options.getString('role_admin', true),
      junta: interaction.options.getString('role_junta', true),
      verify: interaction.options.getString('role_verify', true),
      verifyJaveriana: interaction.options.getString('role_verify_javeriana', true),
      eventPing: interaction.options.getString('role_event_ping') ?? undefined,
    },
    channels: {
      welcome: interaction.options.getString('channel_welcome', true),
      ticketTrigger: interaction.options.getString('channel_ticket', true),
      announcements: interaction.options.getString('channel_announcements', true),
      vcCreate: interaction.options.getString('channel_vc_create', true),
      vcPool: [
        interaction.options.getString('channel_vc1', true),
        interaction.options.getString('channel_vc2', true),
      ],
      voiceCategory: interaction.options.getString('category_voice', true),
      alerts: interaction.options.getString('channel_alerts') ?? undefined,
    },
    alertThreshold: interaction.options.getInteger('alert_threshold') ?? 20,
  };
  upsertGuildConfig(config);
  const embed = buildEmbed({
    title: 'Setup guardado',
    description: 'Configuración actualizada para la guild',
    fields: [
      { name: 'Admin', value: `<@&${config.roles.admin}>`, inline: true },
      { name: 'Junta', value: `<@&${config.roles.junta}>`, inline: true },
      { name: 'Verificado (Normal)', value: `<@&${config.roles.verify}>`, inline: true },
      {
        name: 'Verificado (Javeriana)',
        value: `<@&${config.roles.verifyJaveriana}>`,
        inline: true,
      },
      {
        name: 'Rol eventos',
        value: config.roles.eventPing ? `<@&${config.roles.eventPing}>` : 'N/A',
        inline: true,
      },
      { name: 'Welcome', value: `<#${config.channels.welcome}>`, inline: true },
      { name: 'Ticket', value: `<#${config.channels.ticketTrigger}>`, inline: true },
      { name: 'Anuncios', value: `<#${config.channels.announcements}>`, inline: true },
      { name: 'VC Create', value: `<#${config.channels.vcCreate}>`, inline: true },
      {
        name: 'VC Pool',
        value: config.channels.vcPool.map((c) => `<#${c}>`).join(', '),
        inline: false,
      },
      { name: 'Categoría Voz', value: `<#${config.channels.voiceCategory}>`, inline: true },
      {
        name: 'Canal Alertas',
        value: config.channels.alerts ? `<#${config.channels.alerts}>` : 'No configurado',
        inline: true,
      },
      {
        name: 'Threshold Alertas',
        value: `${config.alertThreshold}%`,
        inline: true,
      },
    ],
  });
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
