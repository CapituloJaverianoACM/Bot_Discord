/**
 * @file announce-handlers.ts
 * @description Handlers para el sistema de announce interactivo.
 * Maneja modales, botones y menús desplegables del proceso de creación de anuncios.
 */

import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getGuildConfig } from '../config/store';
import { logger } from '../utils/logger';
import { buildEmbed } from '../utils/embed';
import { announceSessions, createAnnouncementPreview } from './announce';

const PRESET_COLORS = [
  { name: '🔴 Rojo (Importante)', value: '#EF4444' },
  { name: '🟡 Amarillo (Advertencia)', value: '#F59E0B' },
  { name: '🟢 Verde (Éxito)', value: '#10B981' },
  { name: '🔵 Azul (Información)', value: '#3B82F6' },
  { name: '🟣 Morado (Evento)', value: '#8B5CF6' },
  { name: '🟠 Naranja (Alerta)', value: '#F97316' },
  { name: '⚫ Negro (Formal)', value: '#1F2937' },
  { name: '⚪ Blanco Discord', value: '#5865F2' },
];

/**
 * Handler para el modal del announce
 */
export async function handleAnnounceModal(interaction: any) {
  const [, modalType, userId] = interaction.customId.split(':');
  const sessionKey = `${interaction.guildId}-${userId}`;
  const session = announceSessions.get(sessionKey);

  if (!session || interaction.user.id !== userId) {
    return interaction.reply({
      content: '❌ Esta sesión no es tuya o ha expirado. Ejecuta `/announce` nuevamente.',
      flags: 1 << 6,
    });
  }

  // Modal de contenido principal
  if (modalType === 'modal') {
    const title = interaction.fields.getTextInputValue('title') || undefined;
    const message = interaction.fields.getTextInputValue('message');

    session.announcement.title = title;
    session.announcement.message = message;

    logger.info('Announce modal submitted', {
      requestId: session.requestId,
      userId,
      guildId: interaction.guildId,
      hasTitle: !!title,
      messageLength: message.length,
    });

    await showAnnouncementOptions(interaction, session);
  }
  // Modal de imagen
  else if (modalType === 'imageModal') {
    const imageUrl = interaction.fields.getTextInputValue('imageUrl') || undefined;

    // Validar URL si se proporcionó
    if (imageUrl) {
      try {
        new URL(imageUrl);
        session.announcement.image = imageUrl;

        logger.info('Announce image updated', {
          requestId: session.requestId,
          userId,
          hasImage: !!imageUrl,
          imageUrl,
        });
      } catch {
        return interaction.reply({
          content:
            '❌ URL de imagen inválida. Debe ser una URL completa (ej: https://ejemplo.com/imagen.png)',
          flags: 1 << 6,
        });
      }
    } else {
      // Si está vacío, remover la imagen
      session.announcement.image = undefined;
      logger.info('Announce image removed', {
        requestId: session.requestId,
        userId,
      });
    }

    // Responder al modal primero
    await interaction.reply({
      content: imageUrl ? '✅ Imagen configurada. Revisa el preview.' : '✅ Imagen removida.',
      flags: 1 << 6,
    });

    // Actualizar el mensaje original del preview usando el mensaje guardado
    try {
      if (session.previewMessage) {
        const embed = createAnnouncementPreview(session);
        await session.previewMessage.edit({ embeds: [embed] });
        logger.info('Preview updated with image', {
          requestId: session.requestId,
          hasImage: !!imageUrl,
        });
      } else {
        logger.warn('No preview message found to update', {
          requestId: session.requestId,
        });
      }
    } catch (err) {
      logger.error('Failed to update preview after image change', {
        error: err instanceof Error ? err.message : String(err),
        requestId: session.requestId,
      });
    }
  }
}

/**
 * Muestra las opciones de configuración del anuncio
 */
async function showAnnouncementOptions(interaction: any, session: any) {
  const embed = createAnnouncementPreview(session);
  const cfg = getGuildConfig(session.guildId);

  const rows = [];

  // Dropdown de colores
  const colorMenu = new StringSelectMenuBuilder()
    .setCustomId(`announce:color:${session.userId}`)
    .setPlaceholder('🎨 Selecciona un color')
    .addOptions(
      PRESET_COLORS.map((color) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(color.name)
          .setValue(color.value)
          .setDefault(session.announcement.color === color.value),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(colorMenu));

  // Dropdown de roles a mencionar (si existen roles de notificaciones configurados)
  const notificationRoles = [];
  const seenRoleIds = new Set<string>();

  // Agregar roles solo si no están duplicados
  if (cfg?.roles.laLiga && !seenRoleIds.has(cfg.roles.laLiga)) {
    notificationRoles.push({ label: '⚽ La Liga', value: cfg.roles.laLiga });
    seenRoleIds.add(cfg.roles.laLiga);
  }
  if (cfg?.roles.preParciales && !seenRoleIds.has(cfg.roles.preParciales)) {
    notificationRoles.push({ label: '📚 Pre-Parciales', value: cfg.roles.preParciales });
    seenRoleIds.add(cfg.roles.preParciales);
  }
  if (cfg?.roles.cursos && !seenRoleIds.has(cfg.roles.cursos)) {
    notificationRoles.push({ label: '📖 Cursos', value: cfg.roles.cursos });
    seenRoleIds.add(cfg.roles.cursos);
  }
  if (cfg?.roles.notificacionesGenerales && !seenRoleIds.has(cfg.roles.notificacionesGenerales)) {
    notificationRoles.push({
      label: '🔔 Notificaciones Generales',
      value: cfg.roles.notificacionesGenerales,
    });
    seenRoleIds.add(cfg.roles.notificacionesGenerales);
  }

  if (notificationRoles.length > 0) {
    const rolesMenu = new StringSelectMenuBuilder()
      .setCustomId(`announce:roles:${session.userId}`)
      .setPlaceholder('🔔 Selecciona roles a mencionar (opcional)')
      .setMinValues(0)
      .setMaxValues(notificationRoles.length)
      .addOptions(
        notificationRoles.map((role) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(role.label)
            .setValue(role.value)
            .setDefault(session.announcement.roles?.includes(role.value) || false),
        ),
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rolesMenu));
  }

  // Botones de acción
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`announce:edit:${session.userId}`)
      .setLabel('✏️ Editar Texto')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`announce:image:${session.userId}`)
      .setLabel('🖼️ Imagen')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`announce:publish:${session.userId}`)
      .setLabel('📢 Publicar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`announce:cancel:${session.userId}`)
      .setLabel('❌ Cancelar')
      .setStyle(ButtonStyle.Danger),
  );
  rows.push(actionRow);

  const reply = await interaction.reply({
    embeds: [embed],
    components: rows,
    flags: 1 << 6,
    fetchReply: true, // Obtener el mensaje para poder editarlo después
  });

  // Guardar el mensaje para poder actualizarlo después
  session.previewMessage = reply;
}

/**
 * Handler para botones del announce
 */
export async function handleAnnounceButton(interaction: any) {
  const [, action, userId] = interaction.customId.split(':');
  const sessionKey = `${interaction.guildId}-${userId}`;
  const session = announceSessions.get(sessionKey);

  if (!session || interaction.user.id !== userId) {
    return interaction.reply({
      content: '❌ Esta sesión no es tuya o ha expirado. Ejecuta `/announce` nuevamente.',
      flags: 1 << 6,
    });
  }

  try {
    switch (action) {
      case 'edit':
        await editAnnouncement(interaction, session);
        break;
      case 'image':
        await setAnnouncementImage(interaction, session);
        break;
      case 'publish':
        await publishAnnouncement(interaction, session, sessionKey);
        break;
      case 'cancel':
        await cancelAnnouncement(interaction, session, sessionKey);
        break;
      default:
        await interaction.reply({
          content: '❌ Acción desconocida.',
          flags: 1 << 6,
        });
    }
  } catch (error) {
    logger.error('Error in announce button handler', {
      error: error instanceof Error ? error.message : String(error),
      action,
      guildId: interaction.guildId,
      userId,
    });

    const errorMsg = '❌ Error procesando la acción. Intenta nuevamente.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMsg, flags: 1 << 6 });
    } else {
      await interaction.reply({ content: errorMsg, flags: 1 << 6 });
    }
  }
}

/**
 * Handler para menús desplegables del announce
 */
export async function handleAnnounceSelect(interaction: any) {
  const [, field, userId] = interaction.customId.split(':');
  const sessionKey = `${interaction.guildId}-${userId}`;
  const session = announceSessions.get(sessionKey);

  if (!session || interaction.user.id !== userId) {
    return interaction.reply({
      content: '❌ Esta sesión no es tuya o ha expirado. Ejecuta `/announce` nuevamente.',
      flags: 1 << 6,
    });
  }

  // Actualizar configuración según el campo
  if (field === 'color') {
    session.announcement.color = interaction.values[0];
    logger.info('Announce color updated', {
      requestId: session.requestId,
      color: interaction.values[0],
      userId,
    });
  } else if (field === 'roles') {
    session.announcement.roles = interaction.values;
    logger.info('Announce roles updated', {
      requestId: session.requestId,
      rolesCount: interaction.values.length,
      userId,
    });
  }

  // Actualizar preview
  const embed = createAnnouncementPreview(session);
  await interaction.update({ embeds: [embed] });
}

/**
 * Editar el anuncio (mostrar modal nuevamente)
 */
async function editAnnouncement(interaction: any, session: any) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } =
    await import('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`announce:modal:${session.userId}`)
    .setTitle('📢 Editar Anuncio')
    .addComponents(
      new ActionRowBuilder<any>().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Título del Anuncio')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ej: Importante - Leer')
          .setRequired(false)
          .setMaxLength(256)
          .setValue(session.announcement.title || ''),
      ),
      new ActionRowBuilder<any>().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setLabel('Mensaje del Anuncio')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Escribe el contenido del anuncio aquí...')
          .setRequired(true)
          .setMaxLength(4000)
          .setValue(session.announcement.message || ''),
      ),
    );

  await interaction.showModal(modal);
}

/**
 * Configurar imagen del anuncio (mostrar modal para URL)
 */
async function setAnnouncementImage(interaction: any, session: any) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } =
    await import('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`announce:imageModal:${session.userId}`)
    .setTitle('🖼️ Imagen del Anuncio')
    .addComponents(
      new ActionRowBuilder<any>().addComponents(
        new TextInputBuilder()
          .setCustomId('imageUrl')
          .setLabel('URL de la Imagen')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://ejemplo.com/imagen.png')
          .setRequired(false)
          .setMaxLength(500)
          .setValue(session.announcement.image || ''),
      ),
    );

  await interaction.showModal(modal);
}

/**
 * Publicar el anuncio
 */
async function publishAnnouncement(interaction: any, session: any, sessionKey: string) {
  const { announcement, channelId, guildId } = session;

  // Validar que hay mensaje
  if (!announcement.message) {
    return interaction.reply({
      content: '❌ No puedes publicar un anuncio sin mensaje.',
      flags: 1 << 6,
    });
  }

  // Obtener canal
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased?.()) {
    return interaction.reply({
      content: '❌ El canal de anuncios no es válido.',
      flags: 1 << 6,
    });
  }

  try {
    // Crear embed del anuncio
    const announcementEmbed = buildEmbed({
      title: announcement.title || 'Anuncio',
      description: announcement.message,
      color: announcement.color || '#5865F2',
      image: announcement.image, // Agregar imagen si existe
    });

    // Publicar menciones primero si hay
    if (announcement.roles && announcement.roles.length > 0) {
      const mentions = announcement.roles.map((r: string) => `<@&${r}>`).join(' ');
      await channel.send({ content: mentions });
    }

    // Publicar anuncio
    await channel.send({ embeds: [announcementEmbed] });

    logger.info('Announcement published', {
      requestId: session.requestId,
      userId: session.userId,
      guildId,
      channelId,
      rolesCount: announcement.roles?.length || 0,
    });

    // Responder éxito
    const successEmbed = buildEmbed({
      title: '✅ Anuncio Publicado',
      description: `Tu anuncio ha sido publicado exitosamente en <#${channelId}>.`,
      color: '#10B981',
    });

    await interaction.update({ embeds: [successEmbed], components: [] });

    // Limpiar sesión
    announceSessions.delete(sessionKey);
  } catch (error) {
    logger.error('Failed to publish announcement', {
      requestId: session.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    await interaction.reply({
      content: '❌ Error al publicar el anuncio. Verifica que el bot tenga permisos en el canal.',
      flags: 1 << 6,
    });
  }
}

/**
 * Cancelar el anuncio
 */
async function cancelAnnouncement(interaction: any, session: any, sessionKey: string) {
  logger.info('Announcement cancelled by user', {
    requestId: session.requestId,
    userId: session.userId,
    guildId: session.guildId,
  });

  const cancelEmbed = buildEmbed({
    title: '❌ Anuncio Cancelado',
    description: 'El anuncio ha sido cancelado. No se publicó nada.',
    color: '#EF4444',
  });

  await interaction.update({ embeds: [cancelEmbed], components: [] });

  // Limpiar sesión
  announceSessions.delete(sessionKey);
}
