/**
 * @file messageCreate.ts
 * @description Evento que se dispara cuando se crea un mensaje en cualquier canal.
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
  async execute() {
    try {
      // Logging de mensajes deshabilitado - solo loggeamos interacciones de comandos
    } catch (err) {
      console.error('[messageCreate] error in handler', err);
    }
  },
};
