/**
 * @file ping.ts
 * @description Comando simple para verificar la latencia del bot usando WebSocket ping.
 * Responde con "Pong!" y muestra la latencia real del WebSocket.
 */

import { SlashCommandBuilder } from 'discord.js';
import { scheduleAutoDelete } from '../utils/autoDelete';

/** Definición del comando /ping */
const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('🏓 Verifica latencia del bot');

/**
 * Ejecuta el comando ping
 * @param {any} interaction - La interacción de Discord
 * @returns {Promise<void>}
 */
async function execute(interaction: any) {
  // Responder con la latencia del WebSocket
  const wsPing = interaction.client.ws.ping;
  const reply = await interaction.reply({
    content: `🏓 Pong! | WebSocket: ${wsPing}ms`,
    fetchReply: true,
  });

  // Programar auto-eliminación después de 60 segundos
  scheduleAutoDelete(reply, 60);
}

export default { data, execute };
