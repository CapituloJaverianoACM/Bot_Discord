import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { getGuildConfig } from '../config/store';

const data = new SlashCommandBuilder()
  .setName('ticketmessage')
  .setDescription('Publica el mensaje de tickets (solo junta/admin)')
  .addStringOption((opt) =>
    opt.setName('description').setDescription('Descripción del ticket').setRequired(false),
  );

async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: 'Solo junta/admin.', ephemeral: true });
  }
  const cfg = getGuildConfig(interaction.guildId);
  if (!cfg?.channels.ticketTrigger) {
    return interaction.reply({ content: 'Configura primero /setup', ephemeral: true });
  }
  const channel = interaction.guild.channels.cache.get(cfg.channels.ticketTrigger);
  if (!channel || !channel.isTextBased?.()) {
    return interaction.reply({ content: 'Canal de tickets inválido', ephemeral: true });
  }
  const description =
    interaction.options.getString('description') ?? 'Reacciona con 🎫 para crear un ticket.';
  const embed = buildEmbed({ title: 'Tickets', description });
  const msg = await channel.send({ embeds: [embed] });
  await msg.react('🎫');
  await interaction.reply({ content: 'Mensaje de tickets publicado.', ephemeral: true });
}

export default { data, execute };
