/**
 * @file messageCreate.ts
 * @description Evento que se dispara cuando se crea un mensaje en cualquier canal.
 * Proporciona un comando de fallback !ping para testing sin slash commands.
 * Nota: Logging de mensajes deshabilitado para reducir ruido en logs.
 */

/**
 * Manejador del evento messageCreate
 * @property {string} name - Nombre del evento
 * @property {boolean} once - Si el evento debe ejecutarse solo una vez
 * @property {Function} execute - Función a ejecutar cuando se crea un mensaje
 */
export default {
  name: 'messageCreate',
  once: false,
  async execute(message: any) {
    try {
      // Logging de mensajes deshabilitado - solo loggeamos interacciones de comandos

      // fallback: respond to text command prefix !ping so we can test command logic without slash registration
      if (typeof message.content === 'string' && message.content.trim().toLowerCase() === '!ping') {
        try {
          await message.reply('Pong! (fallback)');
        } catch (err) {
          console.error('Failed to reply to !ping', err);
        }
      }
    } catch (err) {
      console.error('[messageCreate] error in handler', err);
    }
  },
};
