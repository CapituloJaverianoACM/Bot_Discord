import { SlashCommandBuilder, ActivityType, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';

const data = new SlashCommandBuilder()
  .setName('presence')
  .setDescription('Configura el rich presence del bot')
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Establece el presence')
      .addStringOption((opt) =>
        opt.setName('text').setDescription('Texto a mostrar').setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('Tipo de actividad')
          .addChoices(
            { name: 'Jugando', value: 'playing' },
            { name: 'Escuchando', value: 'listening' },
            { name: 'Viendo', value: 'watching' },
            { name: 'Compitiendo', value: 'competing' },
            { name: 'Transmitiendo', value: 'streaming' },
          ),
      )
      .addStringOption((opt) =>
        opt
          .setName('status')
          .setDescription('Estado')
          .addChoices(
            { name: 'online', value: 'online' },
            { name: 'idle', value: 'idle' },
            { name: 'dnd', value: 'dnd' },
            { name: 'invisible', value: 'invisible' },
          ),
      )
      .addStringOption((opt) =>
        opt.setName('url').setDescription('URL (solo para streaming)').setRequired(false),
      ),
  )
  .addSubcommand((sub) => sub.setName('clear').setDescription('Limpia el presence'));

async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Solo admin/junta.', flags: 1 << 6 });
  }
  const sub = interaction.options.getSubcommand();

  const respond =
    interaction.deferred || interaction.replied
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);

  if (sub === 'set') {
    const text = interaction.options.getString('text', true);
    const typeInput = interaction.options.getString('type') || 'playing';
    const status = interaction.options.getString('status') || 'online';
    const url = interaction.options.getString('url') || undefined;

    const typeMap: Record<string, ActivityType> = {
      playing: ActivityType.Playing,
      listening: ActivityType.Listening,
      watching: ActivityType.Watching,
      competing: ActivityType.Competing,
      streaming: ActivityType.Streaming,
    };
    const activityType = typeMap[typeInput] ?? ActivityType.Playing;

    // If streaming, a valid URL is required by Discord
    const activity =
      url && activityType === ActivityType.Streaming
        ? { name: text, type: activityType, url }
        : { name: text, type: activityType };

    interaction.client.user?.setPresence({
      activities: [activity],
      status,
    });
    const embed = buildEmbed({
      title: 'Presence',
      description: `Presence actualizado a: ${text}\nTipo: ${typeInput}\nEstado: ${status}${url ? `\nURL: ${url}` : ''}`,
    });
    return respond({ embeds: [embed] });
  }

  if (sub === 'clear') {
    interaction.client.user?.setPresence({ activities: [], status: 'online' });
    const embed = buildEmbed({ title: 'Presence', description: 'Presence limpiado' });
    return respond({ embeds: [embed] });
  }
}

export default { data, execute };
