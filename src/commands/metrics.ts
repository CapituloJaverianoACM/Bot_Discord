/**
 * @file metrics.ts
 * @description Comando para visualizar métricas y estadísticas del bot en tiempo real.
 * Muestra error rate, requests totales, comandos más usados, uptime, y más.
 * Solo accesible para administradores.
 */

import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { getGuildConfig } from '../config/store';
import { getErrorMetrics } from '../utils/logger';
import { getRateLimitSize } from '../utils/rateLimit';

const data = new SlashCommandBuilder()
  .setName('metrics')
  .setDescription('📊 Muestra estadísticas en tiempo real');

/**
 * Formatea duración en ms a string legible
 * @param {number} ms - Milisegundos
 * @returns {string} Duración formateada
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Ejecuta el comando metrics
 * @param {any} interaction - La interacción de Discord
 * @returns {Promise<void>}
 */
async function execute(interaction: any) {
  const config = getGuildConfig(interaction.guildId);
  const adminRoleId = config?.roles.admin;
  const juntaRoleId = config?.roles.junta;
  const member = interaction.member;

  // Verificar permisos
  const isAdmin =
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (adminRoleId && member.roles.cache.has(adminRoleId)) ||
    (juntaRoleId && member.roles.cache.has(juntaRoleId));

  if (!isAdmin) {
    return interaction.reply({
      content: 'Solo administradores pueden ver las métricas del bot.',
      flags: 1 << 6,
    });
  }

  // Obtener métricas
  const metrics = getErrorMetrics();
  const uptime = interaction.client.readyTimestamp
    ? Date.now() - interaction.client.readyTimestamp
    : 0;
  const rateLimitSize = getRateLimitSize();

  // Formatear error rate con emoji
  const errorRateText = `${metrics.errorRate.toFixed(1)}%`;
  const errorRateEmoji = metrics.errorRate > 20 ? '🔴' : metrics.errorRate > 10 ? '🟡' : '🟢';

  // Top comandos más usados (basado en errores, en producción sería bueno trackear todos los usos)
  const topCommandsText =
    metrics.topErrorCommands.length > 0
      ? metrics.topErrorCommands.map((c, i) => `${i + 1}. **${c.command}**: ${c.count}`).join('\n')
      : 'No hay datos disponibles';

  // Top tipos de errores
  const topErrorTypesText =
    metrics.topErrorTypes.length > 0
      ? metrics.topErrorTypes.map((t, i) => `${i + 1}. **${t.type}**: ${t.count}`).join('\n')
      : 'No hay errores registrados';

  // Construir embed
  const embed = buildEmbed({
    title: '📊 Métricas del Bot',
    description: `Estadísticas de los últimos ${metrics.windowMinutes} minutos`,
    color: '#5865F2',
    fields: [
      {
        name: `${errorRateEmoji} Error Rate`,
        value: errorRateText,
        inline: true,
      },
      {
        name: '📈 Total Requests',
        value: metrics.totalRequests.toString(),
        inline: true,
      },
      {
        name: '❌ Total Errors',
        value: metrics.totalErrors.toString(),
        inline: true,
      },
      {
        name: '⏰ Uptime',
        value: formatDuration(uptime),
        inline: true,
      },
      {
        name: '🚦 Rate Limits Active',
        value: rateLimitSize.toString(),
        inline: true,
      },
      {
        name: '📍 Ping',
        value: `${interaction.client.ws.ping}ms`,
        inline: true,
      },
      {
        name: '🔝 Comandos con Errores',
        value: topCommandsText,
        inline: false,
      },
      {
        name: '⚠️ Tipos de Errores',
        value: topErrorTypesText,
        inline: false,
      },
    ],
    footer: `Generado el ${new Date().toLocaleString()}`,
  });

  // Usar editReply porque el comando tiene defer: true
  if (interaction.deferred) {
    return interaction.editReply({ embeds: [embed] });
  } else {
    return interaction.reply({ embeds: [embed], flags: 1 << 6 });
  }
}

export default { data, execute, defer: true };
