import { buildEmbed } from '../utils/embed';
import { getGuildConfig } from '../config/store';

export default {
  name: 'guildMemberAdd',
  once: false,
  async execute(member: any) {
    try {
      const cfg = getGuildConfig(member.guild.id);
      const channelId = cfg?.channels.welcome;
      const channel = channelId
        ? member.guild.channels.cache.get(channelId)
        : member.guild.systemChannel;
      if (!channel || !channel.isTextBased?.()) return;
      const embed = buildEmbed({
        title: '¡Bienvenido!',
        description: `Hola ${member}, revisa #reglas y disfruta del servidor.`,
      });
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Welcome error', err);
    }
  },
};
