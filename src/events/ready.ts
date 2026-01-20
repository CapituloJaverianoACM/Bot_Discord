/**
 * @file ready.ts
 * @description Evento que se dispara cuando el bot está listo y conectado a Discord.
 * Se ejecuta una sola vez al iniciar el bot.
 */

/**
 * Manejador del evento ready/clientReady
 * @property {string[]} name - Nombres de los eventos a escuchar
 * @property {boolean} once - Si el evento debe ejecutarse solo una vez
 * @property {Function} execute - Función a ejecutar cuando el bot esté listo
 */
export default {
  name: ['clientReady', 'ready'],
  once: true,
  async execute(client: any) {
    console.log(`${client.user?.tag} is ready (id: ${client.user?.id})`);
  },
};
