/**
 * @file guildMemberAdd.ts
 * @description Evento que se dispara cuando un nuevo miembro se une al servidor.
 * Envía un mensaje de bienvenida al canal configurado.
 */

import { buildEmbed } from '../utils/embed';
import { getGuildConfig } from '../config/store';

/**
 * Manejador del evento guildMemberAdd
 * @property {string} name - Nombre del evento
 * @property {boolean} once - Si el evento debe ejecutarse solo una vez
 * @property {Function} execute - Función a ejecutar cuando un miembro se une
 */
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
