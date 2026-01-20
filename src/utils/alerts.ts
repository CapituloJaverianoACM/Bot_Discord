/**
 * @file alerts.ts
 * @description Sistema de alertas a Discord para notificar a administradores
 * sobre eventos críticos, errores, y métricas del sistema.
 */

import { Client, APIEmbedField, TextChannel, PermissionsBitField } from 'discord.js';
import { getGuildConfig } from '../config/store';
import { buildEmbed } from './embed';
import { logger } from './logger';
import crypto from 'crypto';

/**
 * Severidad de la alerta
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Opciones para enviar una alerta
 */
export interface AlertOptions {
  title: string;
  description: string;
  severity: AlertSeverity;
  fields?: APIEmbedField[];
  timestamp?: Date;
}

// Almacenamiento de alertas enviadas reciente (para rate limiting)
const recentAlerts = new Map<string, number>();

// Rate limit: 1 alerta del mismo tipo cada 10 minutos
const ALERT_RATE_LIMIT_MS = 10 * 60 * 1000;

/**
 * Genera un hash único para una alerta basado en su título
 * @param {string} title - Título de la alerta
 * @returns {string} Hash MD5 del título
 */
function hashAlertKey(title: string): string {
  return crypto.createHash('md5').update(title).digest('hex');
}

/**
 * Obtiene el color del embed según la severidad
 * @param {AlertSeverity} severity - Severidad de la alerta
 * @returns {string} Color en formato hex
 */
function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'info':
      return '#5865F2'; // Azul
    case 'warning':
      return '#F59E0B'; // Naranja
    case 'critical':
      return '#EF4444'; // Rojo
    default:
      return '#5865F2';
  }
}

/**
 * Obtiene el emoji según la severidad
 * @param {AlertSeverity} severity - Severidad de la alerta
 * @returns {string} Emoji
 */
function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'critical':
      return '🚨';
    default:
      return 'ℹ️';
  }
}

/**
 * Verifica si una alerta puede ser enviada (rate limiting)
 * @param {string} alertKey - Hash de la alerta
 * @returns {boolean} True si puede enviar
 */
function canSendAlert(alertKey: string): boolean {
  const lastSent = recentAlerts.get(alertKey);

  if (!lastSent) {
    return true;
  }

  const elapsed = Date.now() - lastSent;
  return elapsed >= ALERT_RATE_LIMIT_MS;
}

/**
 * Registra que una alerta fue enviada
 * @param {string} alertKey - Hash de la alerta
 */
function recordAlertSent(alertKey: string): void {
  recentAlerts.set(alertKey, Date.now());

  // Limpieza de alertas antiguas
  if (recentAlerts.size > 100) {
    const threshold = Date.now() - ALERT_RATE_LIMIT_MS * 2;
    for (const [key, timestamp] of recentAlerts) {
      if (timestamp < threshold) {
        recentAlerts.delete(key);
      }
    }
  }
}

/**
 * Envía una alerta al canal de administradores de Discord
 * @param {Client} client - Cliente de Discord
 * @param {string} guildId - ID del servidor
 * @param {AlertOptions} options - Opciones de la alerta
 * @returns {Promise<boolean>} True si se envió correctamente
 * @example
 * await sendAdminAlert(client, "123456789", {
 *   title: "High Error Rate",
 *   description: "Error rate exceeded 20% threshold",
 *   severity: "warning",
 *   fields: [{name: "Rate", value: "25.3%", inline: true}]
 * });
 */
export async function sendAdminAlert(
  client: Client,
  guildId: string,
  options: AlertOptions,
): Promise<boolean> {
  try {
    const { title, description, severity, fields, timestamp } = options;

    // Rate limiting de alertas
    const alertKey = hashAlertKey(title);
    if (!canSendAlert(alertKey)) {
      logger.debug('Alert rate limited', { title, guildId, alertKey });
      return false;
    }

    // Obtener configuración del servidor
    const config = getGuildConfig(guildId);
    if (!config) {
      logger.warn('Cannot send alert: guild config not found', { guildId });
      return false;
    }

    // Determinar canal (alerts > announcements)
    const channelId = config.channels.alerts ?? config.channels.announcements;
    if (!channelId) {
      logger.warn('Cannot send alert: no alerts or announcements channel configured', { guildId });
      return false;
    }

    // Obtener canal
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.warn('Cannot send alert: channel not found or not a text channel', {
        guildId,
        channelId,
      });
      return false;
    }

    // Verificar permisos del bot
    const permissions = channel.permissionsFor(client.user!);
    if (!permissions) {
      logger.warn('Cannot send alert: unable to check permissions', { guildId, channelId });
      return false;
    }

    const requiredPermissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
    ];

    for (const perm of requiredPermissions) {
      if (!permissions.has(perm)) {
        const permName =
          Object.keys(PermissionsBitField.Flags).find(
            (key) =>
              PermissionsBitField.Flags[key as keyof typeof PermissionsBitField.Flags] === perm,
          ) || 'Unknown';
        logger.warn('Cannot send alert: missing permission', {
          guildId,
          channelId,
          permission: permName,
        });
        return false;
      }
    }

    // Construir embed
    const emoji = getSeverityEmoji(severity);
    const color = getSeverityColor(severity);

    const embed = buildEmbed({
      title: `${emoji} ${title}`,
      description,
      color: color as any,
      fields,
      footer: `Alert System • ${new Date(timestamp ?? Date.now()).toLocaleString()}`,
    });

    // Enviar alerta
    await channel.send({ embeds: [embed] });

    logger.info('Alert sent successfully', {
      guildId,
      channelId,
      title,
      severity,
      alertKey,
    });

    // Registrar envío
    recordAlertSent(alertKey);

    return true;
  } catch (error) {
    logger.error('Failed to send alert', {
      guildId,
      title: options.title,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    return false;
  }
}

/**
 * Limpia el historial de alertas (útil para testing)
 */
export function clearAlertHistory(): void {
  recentAlerts.clear();
}
