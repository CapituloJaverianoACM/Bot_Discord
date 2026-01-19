import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { getGuildConfig, upsertGuildConfig } from '../config/store';

const data = new SlashCommandBuilder()
  .setName('ticketmessage')
  .setDescription('Publica el mensaje de tickets (solo junta/admin)')
  .addStringOption((opt) =>
    opt.setName('description').setDescription('Descripción del ticket').setRequired(false),
  );

async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: 'Solo junta/admin.', flags: 1 << 6 });
  }
  const cfg = getGuildConfig(interaction.guildId);
  if (!cfg?.channels.ticketTrigger) {
    return interaction.reply({ content: 'Configura primero /setup', flags: 1 << 6 });
  }
  const channel = interaction.guild.channels.cache.get(cfg.channels.ticketTrigger);
  if (!channel || !channel.isTextBased?.()) {
    return interaction.reply({ content: 'Canal de tickets inválido', flags: 1 << 6 });
  }
  const description =
    interaction.options.getString('description') ?? 'Reacciona con 🎫 para crear un ticket.';
  const embed = buildEmbed({ title: 'Tickets', description });

  // delete previous ticket message if stored
  if (cfg.ticketMessageId) {
    try {
      const prev = await channel.messages.fetch(cfg.ticketMessageId).catch(() => null);
      if (prev?.deletable) await prev.delete();
    } catch (err) {
      // ignore fetch/delete errors
    }
  }

  const msg = await channel.send({ embeds: [embed] });
  await msg.react('🎫');

  // persist new message id
  upsertGuildConfig({ ...cfg, guildId: interaction.guildId, ticketMessageId: msg.id });

  await interaction.reply({ content: 'Mensaje de tickets publicado.', flags: 1 << 6 });
}

export default { data, execute };
