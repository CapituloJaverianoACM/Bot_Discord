import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { getGuildConfig, upsertGuildConfig } from '../config/store';

const EPHEMERAL_FLAG = 1 << 6;

const data = new SlashCommandBuilder()
  .setName('ticketclose')
  .setDescription('Cierra el ticket actual (solo junta)');

async function execute(interaction: any) {
  // Require MANAGE_CHANNELS or equivalent (JUNTA). Adjust to your role check if needed.
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'Solo JUNTA puede cerrar tickets.',
      flags: EPHEMERAL_FLAG,
    });
  }
  const channel = interaction.channel;
  const category = channel?.parent;
  const guildId = interaction.guildId;
  const cfg = guildId ? getGuildConfig(guildId) : undefined;

  try {
    const respond =
      interaction.deferred || interaction.replied
        ? interaction.editReply.bind(interaction)
        : interaction.reply.bind(interaction);

    await respond({
      embeds: [buildEmbed({ title: 'Ticket', description: 'Ticket cerrado' })],
      flags: EPHEMERAL_FLAG,
    });

    // Clean up stored open ticket if it matches
    if (cfg?.openTickets) {
      const entry = Object.entries(cfg.openTickets).find(([, t]) => t.categoryId === category?.id);
      if (entry) {
        delete cfg.openTickets[entry[0]];
        upsertGuildConfig({ ...cfg, guildId });
      }
    }

    if (channel && channel.deletable) await channel.delete('Ticket cerrado');
    if (category && category.children) {
      for await (const child of category.children.cache.values()) {
        if (child.deletable) await child.delete('Ticket cerrado');
      }
      if (category.deletable) await category.delete('Ticket cerrado');
    }
  } catch (err) {
    console.error('Error closing ticket', err);
    await interaction.followUp?.({ content: 'Error al cerrar el ticket.', flags: EPHEMERAL_FLAG });
  }
}

export default { data, execute };
