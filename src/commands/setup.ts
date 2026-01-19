import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { upsertGuildConfig } from '../config/store';
import { buildEmbed } from '../utils/embed';

const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configura canales y roles del bot')
  .addStringOption((opt) => opt.setName('role_admin').setDescription('Rol admin').setRequired(true))
  .addStringOption((opt) => opt.setName('role_junta').setDescription('Rol junta').setRequired(true))
  .addStringOption((opt) =>
    opt.setName('role_verify').setDescription('Rol verificado').setRequired(true),
  )
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
    opt.setName('channel_vc_create').setDescription('Canal VC CREATE').setRequired(true),
  )
  .addStringOption((opt) => opt.setName('channel_vc1').setDescription('VC #1').setRequired(true))
  .addStringOption((opt) => opt.setName('channel_vc2').setDescription('VC #2').setRequired(true))
  .addStringOption((opt) =>
    opt.setName('category_voice').setDescription('Categoría VOZ').setRequired(true),
  );

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
    },
    channels: {
      welcome: interaction.options.getString('channel_welcome', true),
      ticketTrigger: interaction.options.getString('channel_ticket', true),
      vcCreate: interaction.options.getString('channel_vc_create', true),
      vcPool: [
        interaction.options.getString('channel_vc1', true),
        interaction.options.getString('channel_vc2', true),
      ],
      voiceCategory: interaction.options.getString('category_voice', true),
    },
  };
  upsertGuildConfig(config);
  const embed = buildEmbed({
    title: 'Setup guardado',
    description: 'Configuración actualizada para la guild',
    fields: [
      { name: 'Admin', value: `<@&${config.roles.admin}>`, inline: true },
      { name: 'Junta', value: `<@&${config.roles.junta}>`, inline: true },
      { name: 'Verificado', value: `<@&${config.roles.verify}>`, inline: true },
      { name: 'Welcome', value: `<#${config.channels.welcome}>`, inline: true },
      { name: 'Ticket', value: `<#${config.channels.ticketTrigger}>`, inline: true },
      { name: 'VC Create', value: `<#${config.channels.vcCreate}>`, inline: true },
      {
        name: 'VC Pool',
        value: config.channels.vcPool.map((c) => `<#${c}>`).join(', '),
        inline: false,
      },
      { name: 'Categoría Voz', value: `<#${config.channels.voiceCategory}>`, inline: true },
    ],
  });
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
