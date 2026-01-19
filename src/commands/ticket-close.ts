import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';

const data = new SlashCommandBuilder()
  .setName('ticketclose')
  .setDescription('Cierra el ticket actual (solo junta)');

async function execute(interaction: any) {
  // Require MANAGE_CHANNELS or equivalent (JUNTA). Adjust to your role check if needed.
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: 'Solo JUNTA puede cerrar tickets.', ephemeral: true });
  }
  const channel = interaction.channel;
  const category = channel?.parent;
  try {
    await interaction.reply({
      embeds: [buildEmbed({ title: 'Ticket', description: 'Ticket cerrado' })],
      ephemeral: true,
    });
    if (channel && channel.deletable) await channel.delete('Ticket cerrado');
    if (category && category.children) {
      for await (const child of category.children.cache.values()) {
        if (child.deletable) await child.delete('Ticket cerrado');
      }
      if (category.deletable) await category.delete('Ticket cerrado');
    }
  } catch (err) {
    console.error('Error closing ticket', err);
    await interaction.followUp?.({ content: 'Error al cerrar el ticket.', ephemeral: true });
  }
}

export default { data, execute };
