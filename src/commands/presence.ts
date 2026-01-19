import { SlashCommandBuilder, ActivityType, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';

const data = new SlashCommandBuilder()
  .setName('presence')
  .setDescription('Configura el rich presence del bot')
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Establece el presence')
      .addStringOption((opt) => opt.setName('text').setDescription('Texto').setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName('clear').setDescription('Limpia el presence'));

async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Solo admin/junta.', ephemeral: true });
  }
  const sub = interaction.options.getSubcommand();

  // Do not defer; this command is fast
  const respond =
    interaction.deferred || interaction.replied
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);

  if (sub === 'set') {
    const text = interaction.options.getString('text', true);
    interaction.client.user?.setPresence({
      activities: [{ name: text, type: ActivityType.Playing }],
      status: 'online',
    });
    const embed = buildEmbed({ title: 'Presence', description: `Presence actualizado a: ${text}` });
    return respond({ embeds: [embed] });
  }
  if (sub === 'clear') {
    interaction.client.user?.setPresence({ activities: [], status: 'online' });
    const embed = buildEmbed({ title: 'Presence', description: 'Presence limpiado' });
    return respond({ embeds: [embed] });
  }
}

export default { data, execute };
