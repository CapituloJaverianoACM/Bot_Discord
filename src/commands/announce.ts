import { SlashCommandBuilder, PermissionsBitField, ColorResolvable } from 'discord.js';
import { getGuildConfig } from '../config/store';
import { buildEmbed, parseHexColor } from '../utils/embed';

const data = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Publica un anuncio en el canal de anuncios configurado')
  .addStringOption((opt) =>
    opt.setName('message').setDescription('Contenido del anuncio').setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName('title').setDescription('Título del anuncio').setRequired(false),
  )
  .addBooleanOption((opt) =>
    opt.setName('ping').setDescription('Mencionar rol de eventos/anuncios si está configurado'),
  )
  .addStringOption((opt) =>
    opt.setName('color').setDescription('Color del embed (hex, ej. #5865F2)').setRequired(false),
  );

async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Solo admin/junta.', flags: 1 << 6 });
  }
  const cfg = getGuildConfig(interaction.guildId);
  if (!cfg?.channels.announcements) {
    return interaction.reply({
      content: 'Canal de anuncios no configurado. Usa /setup.',
      flags: 1 << 6,
    });
  }
  const channel = interaction.guild.channels.cache.get(cfg.channels.announcements);
  if (!channel || !channel.isTextBased?.()) {
    return interaction.reply({ content: 'Canal de anuncios inválido.', flags: 1 << 6 });
  }
  const title = interaction.options.getString('title') ?? 'Anuncio';
  const message = interaction.options.getString('message', true);
  const color = parseHexColor(interaction.options.getString('color') || undefined) as
    | ColorResolvable
    | undefined;
  const doPing = interaction.options.getBoolean('ping') ?? false;
  const pingRole = doPing ? cfg.roles.eventPing : undefined;

  const embed = buildEmbed({ title, description: message, color });
  try {
    if (pingRole) {
      await channel.send({ content: `<@&${pingRole}>` });
    }
    await channel.send({ embeds: [embed] });
    return interaction.reply({ content: 'Anuncio publicado.', flags: 1 << 6 });
  } catch (err) {
    console.error('announce error', err);
    return interaction.reply({ content: 'Error publicando el anuncio.', flags: 1 << 6 });
  }
}

export default { data, execute };
