/**
 * @file autoDelete.ts
 * @description Utilidad para programar auto-eliminación de mensajes públicos después de un timeout.
 * Solo aplica a mensajes que no son ephemeral (no tienen flags: 1<<6).
 */

import { Message } from 'discord.js';

/**
 * Programa la eliminación automática de un mensaje después de un delay específico.
 * Solo funciona con mensajes públicos (no ephemeral).
 *
 * @param {Message} message - El mensaje a eliminar
 * @param {number} delaySeconds - Segundos antes de eliminar (default: 60)
 * @returns {NodeJS.Timeout} El timeout ID para posible cancelación
 *
 * @example
 * const reply = await interaction.reply({ content: 'Mensaje temporal' });
 * scheduleAutoDelete(reply, 60);
 */
export function scheduleAutoDelete(message: Message, delaySeconds: number = 60): NodeJS.Timeout {
  const timeoutId = setTimeout(async () => {
    try {
      // Intentar eliminar el mensaje
      await message.delete();
    } catch (error) {
      // Ignorar errores silenciosamente (mensaje ya eliminado, sin permisos, etc.)
      // No loggeamos para evitar ruido innecesario en logs
    }
  }, delaySeconds * 1000);

  return timeoutId;
}
