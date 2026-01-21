/**
 * @file announce-interactive.ts
 * @description Sistema interactivo para crear anuncios usando embeds y dropdowns.
 * Permite configurar título, mensaje, color y roles a mencionar de forma visual.
 * Solo accesible para administradores.
 */

import {
  SlashCommandBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getGuildConfig } from '../config/store';
import { buildEmbed } from '../utils/embed';
import { logger, generateRequestId } from '../utils/logger';

// Estado temporal de anuncios en progreso
export const announceSessions = new Map<string, any>();

/** Definición del comando /announce simplificado */
const data = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('📢 Crear un anuncio interactivo (Sistema visual paso a paso)');

/**
 * Crea el embed de preview del anuncio
 */
export function createAnnouncementPreview(session: any) {
  const { title, message, color, roles } = session.announcement;

  const rolesText =
    roles && roles.length > 0 ? roles.map((r: string) => `<@&${r}>`).join(' ') : 'Ninguno';

  return buildEmbed({
    title: '📢 Preview del Anuncio',
    description: 'Así es como se verá tu anuncio. Revisa antes de publicar.',
    color: '#5865F2',
    fields: [
      {
        name: '📝 Título',
        value: title || 'Sin título',
        inline: false,
      },
      {
        name: '💬 Mensaje',
        value: message || 'Sin mensaje',
        inline: false,
      },
      {
        name: '🎨 Color',
        value: color || 'Default (#5865F2)',
        inline: true,
      },
      {
        name: '🔔 Menciones',
        value: rolesText,
        inline: true,
      },
    ],
    footer: 'Haz clic en los botones para editar o publicar',
  });
}

/**
 * Ejecuta el comando announce interactivo
 */
async function execute(interaction: any) {
  const requestId = generateRequestId();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  logger.info('Interactive announce started', { requestId, userId, guildId });

  // Verificar permisos
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    if (interaction.deferred) {
      return interaction.editReply({
        content: '❌ Solo administradores pueden crear anuncios.',
      });
    } else {
      return interaction.reply({
        content: '❌ Solo administradores pueden crear anuncios.',
        flags: 1 << 6,
      });
    }
  }

  // Verificar que existe canal de anuncios configurado
  const cfg = getGuildConfig(guildId);
  if (!cfg?.channels.announcements) {
    const content = '❌ Canal de anuncios no configurado. Usa `/setup` primero.';
    if (interaction.deferred) {
      return interaction.editReply({ content });
    } else {
      return interaction.reply({ content, flags: 1 << 6 });
    }
  }

  // Verificar que el canal existe
  const channel = interaction.guild.channels.cache.get(cfg.channels.announcements);
  if (!channel || !channel.isTextBased?.()) {
    const content = '❌ El canal de anuncios configurado no es válido.';
    if (interaction.deferred) {
      return interaction.editReply({ content });
    } else {
      return interaction.reply({ content, flags: 1 << 6 });
    }
  }

  // Crear sesión
  const session = {
    userId,
    guildId,
    requestId,
    channelId: cfg.channels.announcements,
    announcement: {
      title: undefined,
      message: undefined,
      color: undefined,
      roles: [],
    },
    startedAt: Date.now(),
  };

  // Guardar sesión
  const sessionKey = `${guildId}-${userId}`;
  announceSessions.set(sessionKey, session);

  // Cleanup después de 15 minutos
  setTimeout(
    () => {
      if (announceSessions.has(sessionKey)) {
        announceSessions.delete(sessionKey);
        logger.info('Announce session expired', { requestId, guildId, userId });
      }
    },
    15 * 60 * 1000,
  );

  // Mostrar modal para título y mensaje
  const modal = new ModalBuilder()
    .setCustomId(`announce:modal:${userId}`)
    .setTitle('📢 Crear Anuncio')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Título del Anuncio')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ej: Importante - Leer')
          .setRequired(false)
          .setMaxLength(256),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setLabel('Mensaje del Anuncio')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Escribe el contenido del anuncio aquí...')
          .setRequired(true)
          .setMaxLength(4000),
      ),
    );

  await interaction.showModal(modal);
}

export default { data, execute, defer: true };
