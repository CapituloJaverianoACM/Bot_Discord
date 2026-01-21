/**
 * @file config-reset.ts
 * @description Comando para eliminar completamente la configuración de un servidor.
 * Solo accesible para el dueño del servidor (Guild Owner).
 * PRECAUCIÓN: Esta acción es irreversible y eliminará todos los datos de configuración.
 */

import { SlashCommandBuilder } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { deleteGuildConfig, getGuildConfig } from '../config/store';
import { logger, generateRequestId } from '../utils/logger';

const data = new SlashCommandBuilder()
  .setName('config-reset')
  .setDescription('⚠️ ELIMINA toda la configuración del servidor (solo Guild Owner)')
  .addStringOption((opt) =>
    opt
      .setName('confirmacion')
      .setDescription('Escribe "CONFIRMAR" para eliminar la configuración')
      .setRequired(true),
  );

/**
 * Ejecuta el comando config-reset para eliminar la configuración del servidor
 * @param {any} interaction - La interacción de Discord
 * @returns {Promise<void>}
 */
async function execute(interaction: any) {
  const requestId = generateRequestId();
  const guildId = interaction.guildId;
  const member = interaction.member;
  const guild = interaction.guild;

  logger.info('Config-reset command invoked', {
    requestId,
    userId: member.id,
    guildId,
  });

  // Verificar que es el dueño del servidor
  if (guild.ownerId !== member.id) {
    logger.warn('Config-reset denied: not guild owner', {
      requestId,
      userId: member.id,
      guildId,
      ownerId: guild.ownerId,
    });

    return interaction.reply({
      content: '❌ Solo el dueño del servidor puede eliminar la configuración.',
      flags: 1 << 6,
    });
  }

  // Verificar confirmación
  const confirmacion = interaction.options.getString('confirmacion', true).trim();
  if (confirmacion !== 'CONFIRMAR') {
    logger.info('Config-reset cancelled: invalid confirmation', {
      requestId,
      userId: member.id,
      guildId,
      providedConfirmation: confirmacion,
    });

    return interaction.reply({
      content:
        '❌ Confirmación inválida. Debes escribir exactamente `CONFIRMAR` para eliminar la configuración.',
      flags: 1 << 6,
    });
  }

  // Verificar si existe configuración
  const config = getGuildConfig(guildId);
  if (!config) {
    logger.info('Config-reset: no config to delete', {
      requestId,
      userId: member.id,
      guildId,
    });

    return interaction.reply({
      content: 'ℹ️ No hay configuración guardada para este servidor.',
      flags: 1 << 6,
    });
  }

  // Eliminar configuración
  const deleted = deleteGuildConfig(guildId, requestId);

  if (deleted) {
    logger.info('Config-reset completed successfully', {
      requestId,
      userId: member.id,
      guildId,
    });

    const embed = buildEmbed({
      title: '🗑️ Configuración Eliminada',
      description:
        'Toda la configuración del servidor ha sido eliminada exitosamente.\n\n' +
        'Usa `/setup` para configurar el bot nuevamente.',
      color: '#EF4444',
      fields: [
        {
          name: 'Datos eliminados',
          value:
            '• Roles (admin, junta, verify, eventPing)\n' +
            '• Canales (welcome, ticket, announcements, vc, alerts)\n' +
            '• Tickets abiertos\n' +
            '• Emails verificados\n' +
            '• Threshold de alertas',
          inline: false,
        },
        {
          name: 'Ejecutado por',
          value: `<@${member.id}> (Guild Owner)`,
          inline: true,
        },
      ],
      footer: `Request ID: ${requestId.slice(0, 8)}`,
    });

    return interaction.reply({ embeds: [embed], flags: 1 << 6 });
  } else {
    logger.error('Config-reset failed unexpectedly', {
      requestId,
      userId: member.id,
      guildId,
    });

    return interaction.reply({
      content: '❌ Error inesperado al eliminar la configuración. Intenta nuevamente.',
      flags: 1 << 6,
    });
  }
}

export default { data, execute, defer: true };
