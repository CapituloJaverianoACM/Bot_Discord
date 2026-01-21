/**
 * @file setup-handlers.ts
 * @description Handlers para el sistema de setup interactivo.
 * Maneja botones y menús desplegables del proceso de configuración.
 */

import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { upsertGuildConfig } from '../config/store';
import { logger } from '../utils/logger';
import {
  setupSessions,
  createRolesEmbed,
  createNotificationRolesEmbed,
  createChannelsEmbed,
  createVoiceEmbed,
  createConfirmationEmbed,
} from './setup';

/**
 * Handler para botones del setup
 */
export async function handleSetupButton(interaction: any) {
  const [, action, userId] = interaction.customId.split(':');
  const sessionKey = `${interaction.guildId}-${userId}`;
  const session = setupSessions.get(sessionKey);

  // Verificar que la sesión existe y el usuario es correcto
  if (!session || interaction.user.id !== userId) {
    return interaction.reply({
      content: '❌ Esta sesión no es tuya o ha expirado. Ejecuta `/setup` nuevamente.',
      flags: 1 << 6,
    });
  }

  try {
    switch (action) {
      case 'start':
        await showRolesStep(interaction, session);
        break;
      case 'next_notification_roles':
        await showNotificationRolesStep(interaction, session);
        break;
      case 'next_channels':
        await showChannelsStep(interaction, session);
        break;
      case 'next_voice':
        await showVoiceStep(interaction, session);
        break;
      case 'next_confirm':
        await showConfirmationStep(interaction, session);
        break;
      case 'back_roles':
        await showRolesStep(interaction, session);
        break;
      case 'back_notification_roles':
        await showNotificationRolesStep(interaction, session);
        break;
      case 'back_channels':
        await showChannelsStep(interaction, session);
        break;
      case 'back_voice':
        await showVoiceStep(interaction, session);
        break;
      case 'confirm':
        await saveConfiguration(interaction, session, sessionKey);
        break;
      case 'cancel':
        await cancelSetup(interaction, session, sessionKey);
        break;
      default:
        await interaction.reply({
          content: '❌ Acción desconocida.',
          flags: 1 << 6,
        });
    }
  } catch (error) {
    logger.error('Error in setup button handler', {
      error: error instanceof Error ? error.message : String(error),
      action,
      guildId: interaction.guildId,
      userId,
    });
    await interaction.reply({
      content: '❌ Error procesando la acción. Intenta nuevamente.',
      flags: 1 << 6,
    });
  }
}

/**
 * Handler para menús desplegables del setup
 */
export async function handleSetupSelect(interaction: any) {
  const [, field, userId] = interaction.customId.split(':');
  const sessionKey = `${interaction.guildId}-${userId}`;
  const session = setupSessions.get(sessionKey);

  if (!session || interaction.user.id !== userId) {
    return interaction.reply({
      content: '❌ Esta sesión no es tuya o ha expirado. Ejecuta `/setup` nuevamente.',
      flags: 1 << 6,
    });
  }

  const selectedValue = interaction.values[0];

  // Actualizar configuración según el campo
  if (field.startsWith('role_')) {
    const roleName = field.replace('role_', '');
    if (selectedValue === 'skip') {
      session.config.roles[roleName] = undefined;
    } else {
      session.config.roles[roleName] = selectedValue;
    }
  } else if (field.startsWith('channel_')) {
    const channelName = field.replace('channel_', '');
    if (selectedValue === 'skip') {
      session.config.channels[channelName] = undefined;
    } else {
      session.config.channels[channelName] = selectedValue;
    }
  } else if (field === 'vcPool') {
    // Para VC Pool permitimos múltiples selecciones
    session.config.channels.vcPool = interaction.values;
  }

  logger.info('Setup field updated', {
    field,
    value: selectedValue,
    guildId: interaction.guildId,
    userId,
  });

  // Actualizar el embed según el paso actual
  let embed;
  if (
    field.startsWith('role_') &&
    ['admin', 'junta', 'verify', 'verifyJaveriana'].includes(field.replace('role_', ''))
  ) {
    // Roles administrativos
    embed = createRolesEmbed(session);
  } else if (field.startsWith('role_')) {
    // Roles de notificaciones
    embed = createNotificationRolesEmbed(session);
  } else if (field.startsWith('channel_') && !field.includes('vc')) {
    embed = createChannelsEmbed(session);
  } else {
    embed = createVoiceEmbed(session);
  }

  await interaction.update({ embeds: [embed] });
}

/**
 * Muestra el paso 1: Roles
 */
async function showRolesStep(interaction: any, session: any) {
  const embed = createRolesEmbed(session);
  const guild = interaction.guild;

  // Obtener roles del servidor (convertir a array correctamente)
  const rolesArray = Array.from(
    guild.roles.cache
      .filter((r: any) => r.id !== guild.id && !r.managed) // Excluir @everyone y roles de bots
      .values(),
  )
    .sort((a: any, b: any) => b.position - a.position)
    .slice(0, 20);

  // Crear menús para cada rol
  const rows = [];

  // Rol Admin
  const adminMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_admin:${session.userId}`)
    .setPlaceholder('👑 Selecciona el rol Admin')
    .addOptions(
      rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.admin === r.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(adminMenu));

  // Rol Junta
  const juntaMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_junta:${session.userId}`)
    .setPlaceholder('🎯 Selecciona el rol Junta')
    .addOptions(
      rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.junta === r.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(juntaMenu));

  // Rol Verify
  const verifyMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_verify:${session.userId}`)
    .setPlaceholder('✅ Selecciona el rol Verificado (Normal)')
    .addOptions(
      rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.verify === r.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(verifyMenu));

  // Rol Verify Javeriana
  const verifyJaverianaMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_verifyJaveriana:${session.userId}`)
    .setPlaceholder('🎓 Selecciona el rol Verificado (Javeriana)')
    .addOptions(
      rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.verifyJaveriana === r.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(verifyJaverianaMenu));

  // Botón siguiente
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup:next_notification_roles:${session.userId}`)
      .setLabel('Siguiente: Roles de Notificaciones →')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`setup:cancel:${session.userId}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Danger),
  );
  rows.push(navRow);

  await interaction.update({ embeds: [embed], components: rows });
}

/**
 * Muestra el paso 2: Roles de Notificaciones
 */
async function showNotificationRolesStep(interaction: any, session: any) {
  const embed = createNotificationRolesEmbed(session);
  const guild = interaction.guild;

  // Obtener roles del servidor (convertir a array correctamente)
  const rolesArray = Array.from(
    guild.roles.cache.filter((r: any) => r.id !== guild.id && !r.managed).values(),
  )
    .sort((a: any, b: any) => b.position - a.position)
    .slice(0, 20);

  const rows = [];

  // Rol La Liga
  const laLigaMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_laLiga:${session.userId}`)
    .setPlaceholder('⚽ Selecciona el rol La Liga (opcional)')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('⏭️ Omitir (no configurar)')
        .setValue('skip')
        .setDefault(!session.config.roles.laLiga),
      ...rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.laLiga === r.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(laLigaMenu));

  // Rol Pre-Parciales
  const preParcialesMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_preParciales:${session.userId}`)
    .setPlaceholder('📚 Selecciona el rol Pre-Parciales (opcional)')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('⏭️ Omitir (no configurar)')
        .setValue('skip')
        .setDefault(!session.config.roles.preParciales),
      ...rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.preParciales === r.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(preParcialesMenu));

  // Rol Cursos
  const cursosMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_cursos:${session.userId}`)
    .setPlaceholder('📖 Selecciona el rol Cursos (opcional)')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('⏭️ Omitir (no configurar)')
        .setValue('skip')
        .setDefault(!session.config.roles.cursos),
      ...rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.cursos === r.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cursosMenu));

  // Rol Notificaciones Generales
  const notificacionesGeneralesMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:role_notificacionesGenerales:${session.userId}`)
    .setPlaceholder('🔔 Selecciona el rol Notificaciones Generales (opcional)')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('⏭️ Omitir (no configurar)')
        .setValue('skip')
        .setDefault(!session.config.roles.notificacionesGenerales),
      ...rolesArray.map((r: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDefault(session.config.roles.notificacionesGenerales === r.id),
      ),
    );
  rows.push(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(notificacionesGeneralesMenu),
  );

  // Botones navegación
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup:back_roles:${session.userId}`)
      .setLabel('← Atrás: Roles Administrativos')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup:next_channels:${session.userId}`)
      .setLabel('Siguiente: Canales →')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`setup:cancel:${session.userId}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Danger),
  );
  rows.push(navRow);

  await interaction.update({ embeds: [embed], components: rows });
}

/**
 * Muestra el paso 3: Canales
 */
async function showChannelsStep(interaction: any, session: any) {
  const embed = createChannelsEmbed(session);
  const guild = interaction.guild;

  // Obtener canales de texto y anuncios (convertir a array correctamente)
  const textChannelsArray = Array.from(
    guild.channels.cache
      .filter(
        (c: any) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement,
      )
      .values(),
  )
    .sort((a: any, b: any) => a.position - b.position)
    .slice(0, 20);

  const rows = [];

  // Canal Welcome
  const welcomeMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:channel_welcome:${session.userId}`)
    .setPlaceholder('👋 Selecciona canal de Bienvenida')
    .addOptions(
      textChannelsArray.map((c: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`# ${c.name}`)
          .setValue(c.id)
          .setDefault(session.config.channels.welcome === c.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(welcomeMenu));

  // Canal Tickets
  const ticketsMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:channel_ticketTrigger:${session.userId}`)
    .setPlaceholder('🎫 Selecciona canal de Tickets')
    .addOptions(
      textChannelsArray.map((c: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`# ${c.name}`)
          .setValue(c.id)
          .setDefault(session.config.channels.ticketTrigger === c.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(ticketsMenu));

  // Canal Anuncios
  const announcementsMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:channel_announcements:${session.userId}`)
    .setPlaceholder('📢 Selecciona canal de Anuncios')
    .addOptions(
      textChannelsArray.map((c: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`# ${c.name}`)
          .setValue(c.id)
          .setDefault(session.config.channels.announcements === c.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(announcementsMenu));

  // Botones navegación
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup:back_notification_roles:${session.userId}`)
      .setLabel('← Atrás: Roles de Notificaciones')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup:next_voice:${session.userId}`)
      .setLabel('Siguiente: Voz →')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`setup:cancel:${session.userId}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Danger),
  );
  rows.push(navRow);

  await interaction.update({ embeds: [embed], components: rows });
}

/**
 * Muestra el paso 4: Sistema de Voz
 */
async function showVoiceStep(interaction: any, session: any) {
  const embed = createVoiceEmbed(session);
  const guild = interaction.guild;

  // Obtener canales de voz (convertir a array correctamente)
  const voiceChannelsArray = Array.from(
    guild.channels.cache.filter((c: any) => c.type === ChannelType.GuildVoice).values(),
  )
    .sort((a: any, b: any) => a.position - b.position)
    .slice(0, 20);

  // Obtener categorías (convertir a array correctamente)
  const categoriesArray = Array.from(
    guild.channels.cache.filter((c: any) => c.type === ChannelType.GuildCategory).values(),
  )
    .sort((a: any, b: any) => a.position - b.position)
    .slice(0, 20);

  const rows = [];

  // Validar que haya canales de voz
  if (voiceChannelsArray.length === 0) {
    await interaction.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`setup:back_channels:${session.userId}`)
            .setLabel('← Atrás: Canales')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`setup:cancel:${session.userId}`)
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
    await interaction.followUp({
      content:
        '❌ No se encontraron canales de voz en este servidor. Crea al menos un canal de voz antes de continuar.',
      flags: 1 << 6,
    });
    return;
  }

  // Canal VC Create
  const vcCreateMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:channel_vcCreate:${session.userId}`)
    .setPlaceholder('🎤 Selecciona canal VC Create')
    .addOptions(
      voiceChannelsArray.map((c: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`🔊 ${c.name}`)
          .setValue(c.id)
          .setDefault(session.config.channels.vcCreate === c.id),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(vcCreateMenu));

  // Categoría Voz
  if (categoriesArray.length > 0) {
    const voiceCategoryMenu = new StringSelectMenuBuilder()
      .setCustomId(`setup:channel_voiceCategory:${session.userId}`)
      .setPlaceholder('📁 Selecciona categoría de Voz')
      .addOptions(
        categoriesArray.map((c: any) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`📁 ${c.name}`)
            .setValue(c.id)
            .setDefault(session.config.channels.voiceCategory === c.id),
        ),
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(voiceCategoryMenu));
  }

  // VC Pool (múltiple selección)
  const vcPoolMenu = new StringSelectMenuBuilder()
    .setCustomId(`setup:vcPool:${session.userId}`)
    .setPlaceholder('🔄 Selecciona canales para VC Pool (mínimo 2)')
    .setMinValues(2)
    .setMaxValues(Math.min(voiceChannelsArray.length, 10))
    .addOptions(
      voiceChannelsArray.map((c: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`🔊 ${c.name}`)
          .setValue(c.id)
          .setDefault(session.config.channels.vcPool?.includes(c.id) || false),
      ),
    );
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(vcPoolMenu));

  // Botones navegación
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup:back_channels:${session.userId}`)
      .setLabel('← Atrás: Canales')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup:next_confirm:${session.userId}`)
      .setLabel('Siguiente: Confirmar →')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`setup:cancel:${session.userId}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Danger),
  );
  rows.push(navRow);

  await interaction.update({ embeds: [embed], components: rows });
}

/**
 * Muestra el paso 4: Confirmación
 */
async function showConfirmationStep(interaction: any, session: any) {
  const embed = createConfirmationEmbed(session);

  // Validar configuración mínima
  const cfg = session.config;
  const isValid =
    cfg.roles.admin &&
    cfg.roles.junta &&
    cfg.roles.verify &&
    cfg.roles.verifyJaveriana &&
    cfg.channels.welcome &&
    cfg.channels.ticketTrigger &&
    cfg.channels.announcements &&
    cfg.channels.vcCreate &&
    cfg.channels.voiceCategory &&
    cfg.channels.vcPool?.length >= 2;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup:back_voice:${session.userId}`)
      .setLabel('← Atrás: Voz')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`setup:confirm:${session.userId}`)
      .setLabel('✅ Confirmar y Guardar')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isValid),
    new ButtonBuilder()
      .setCustomId(`setup:cancel:${session.userId}`)
      .setLabel('❌ Cancelar')
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

/**
 * Guarda la configuración
 */
async function saveConfiguration(interaction: any, session: any, sessionKey: string) {
  try {
    upsertGuildConfig(session.config, session.requestId);

    logger.info('Setup configuration saved', {
      requestId: session.requestId,
      guildId: session.guildId,
      userId: session.userId,
    });

    const successEmbed = {
      title: '✅ Configuración Guardada',
      description: '¡La configuración del bot se ha guardado exitosamente!',
      color: 0x00ff00,
      fields: [
        {
          name: '📊 Resumen',
          value:
            `• ${Object.values(session.config.roles).filter((r) => r).length} roles configurados\n` +
            `• ${Object.values(session.config.channels).filter((c) => c).length} canales configurados\n` +
            `• ${session.config.channels.vcPool?.length || 0} canales en VC Pool`,
          inline: false,
        },
      ],
      footer: {
        text: `Configuración completada • Request ID: ${session.requestId.slice(0, 8)}`,
      },
    };

    await interaction.update({ embeds: [successEmbed], components: [] });

    // Limpiar sesión
    setupSessions.delete(sessionKey);
  } catch (error) {
    logger.error('Failed to save setup configuration', {
      requestId: session.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    await interaction.reply({
      content: '❌ Error al guardar la configuración. Intenta nuevamente.',
      flags: 1 << 6,
    });
  }
}

/**
 * Cancela el setup
 */
async function cancelSetup(interaction: any, session: any, sessionKey: string) {
  logger.info('Setup cancelled by user', {
    requestId: session.requestId,
    guildId: session.guildId,
    userId: session.userId,
  });

  const cancelEmbed = {
    title: '❌ Configuración Cancelada',
    description: 'El proceso de configuración ha sido cancelado. Los cambios no se guardaron.',
    color: 0xff0000,
    footer: {
      text: 'Ejecuta /setup nuevamente para reiniciar la configuración',
    },
  };

  await interaction.update({ embeds: [cancelEmbed], components: [] });

  // Limpiar sesión
  setupSessions.delete(sessionKey);
}
