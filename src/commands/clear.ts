import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';

const EPHEMERAL_FLAG = 1 << 6;

const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Limpia mensajes recientes')
  .addIntegerOption((opt) =>
    opt
      .setName('value')
      .setDescription('Cantidad (mensajes) o ventana (horas/días)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(500),
  )
  .addStringOption((opt) =>
    opt
      .setName('unit')
      .setDescription('m = mensajes, h = horas, d = dias')
      .addChoices(
        { name: 'mensajes', value: 'm' },
        { name: 'horas', value: 'h' },
        { name: 'dias', value: 'd' },
      ),
  );

async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({
      content: 'No tienes permiso para usar este comando.',
      flags: EPHEMERAL_FLAG,
    });
  }
  const value = interaction.options.getInteger('value', true);
  const unit = interaction.options.getString('unit') || 'm';
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased?.()) {
    return interaction.reply({
      content: 'No se puede borrar mensajes en este canal.',
      flags: EPHEMERAL_FLAG,
    });
  }

  try {
    let deletedCount = 0;
    if (unit === 'm') {
      const amount = Math.min(Math.max(value, 1), 100);
      const messages = await channel.bulkDelete(amount, true);
      deletedCount = messages.size;
    } else {
      const hours = unit === 'h' ? value : value * 24;
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      const fetched = await channel.messages.fetch({ limit: 100 });
      const toDelete = fetched.filter((m: any) => m.createdTimestamp >= cutoff && !m.pinned);
      if (toDelete.size === 0) {
        return interaction.reply({
          content: 'No hay mensajes en esa ventana.',
          flags: EPHEMERAL_FLAG,
        });
      }
      const result = await channel.bulkDelete(toDelete, true);
      deletedCount = result.size;
    }

    const embed = buildEmbed({
      title: 'Clear',
      description: `${interaction.user} borró ${deletedCount} mensajes (${unit === 'm' ? 'mensajes' : unit === 'h' ? 'horas' : 'dias'}=${value}).`,
    });
    const botMessage = await interaction.reply({ embeds: [embed] });

    // Auto-delete the bot message after 5 new messages in the channel
    const collector = channel.createMessageCollector({
      filter: (m: any) => !m.author.bot,
      max: 5,
      time: 30 * 60 * 1000,
    });
    collector.on('end', async () => {
      try {
        const msg = await channel.messages.fetch(botMessage.id);
        await msg.delete().catch(() => {});
      } catch (err) {
        // ignore
      }
    });
  } catch (err) {
    console.error('Clear error', err);
    await interaction.reply({ content: 'Error al borrar mensajes.', flags: EPHEMERAL_FLAG });
  }
}

export default { data, execute };
