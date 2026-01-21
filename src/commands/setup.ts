/**
 * @file setup-interactive.ts
 * @description Sistema interactivo de configuración del bot usando embeds y dropdowns.
 * Proporciona una experiencia guiada paso a paso para configurar todos los aspectos del bot.
 * Solo accesible para administradores.
 */

import {
  SlashCommandBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getGuildConfig } from '../config/store';
import { buildEmbed } from '../utils/embed';
import { logger, generateRequestId } from '../utils/logger';

// Estado temporal de la configuración en progreso
export const setupSessions = new Map<string, any>();

/** Definición del comando /setup simplificado */
const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('🛠️ Configuración interactiva del bot (Sistema guiado paso a paso)');

/**
 * Crea el embed inicial del setup
 */
function createInitialEmbed() {
  return buildEmbed({
    title: '🛠️ Configuración del Bot',
    description:
      '¡Bienvenido al asistente de configuración interactivo!\n\n' +
      'Te guiaré paso a paso para configurar todos los aspectos del bot.\n\n' +
      '**Pasos:**\n' +
      '1️⃣ Roles Administrativos (Admin, Junta, Verificación)\n' +
      '2️⃣ Roles de Notificaciones (La Liga, Pre-Parciales, etc.)\n' +
      '3️⃣ Canales (Bienvenida, Tickets, Anuncios)\n' +
      '4️⃣ Sistema de Voz (VC Create, Pool)\n' +
      '5️⃣ Confirmación Final\n\n' +
      '⏱️ Tienes 5 minutos para completar la configuración.',
    color: '#5865F2',
  });
}

/**
 * Crea el embed para el paso 1: Roles
 */
export function createRolesEmbed(session: any) {
  const current = session.config;
  return buildEmbed({
    title: '1️⃣ Roles Administrativos',
    description: 'Selecciona los roles administrativos y de verificación del bot.',
    color: '#5865F2',
    fields: [
      {
        name: '👑 Admin',
        value: current.roles.admin ? `<@&${current.roles.admin}>` : '❌ No configurado',
        inline: true,
      },
      {
        name: '🎯 Junta',
        value: current.roles.junta ? `<@&${current.roles.junta}>` : '❌ No configurado',
        inline: true,
      },
      {
        name: '✅ Verificado (Normal)',
        value: current.roles.verify ? `<@&${current.roles.verify}>` : '❌ No configurado',
        inline: true,
      },
      {
        name: '🎓 Verificado (Javeriana)',
        value: current.roles.verifyJaveriana
          ? `<@&${current.roles.verifyJaveriana}>`
          : '❌ No configurado',
        inline: true,
      },
    ],
    footer: 'Usa los menús desplegables para seleccionar cada rol',
  });
}

/**
 * Crea el embed para el paso 2: Roles de Notificaciones
 */
export function createNotificationRolesEmbed(session: any) {
  const current = session.config;
  return buildEmbed({
    title: '2️⃣ Roles de Notificaciones',
    description: 'Selecciona los roles para diferentes tipos de notificaciones (Todos opcionales).',
    color: '#5865F2',
    fields: [
      {
        name: '⚽ La Liga',
        value: current.roles.laLiga ? `<@&${current.roles.laLiga}>` : '⏭️ Sin configurar',
        inline: true,
      },
      {
        name: '📚 Pre-Parciales',
        value: current.roles.preParciales
          ? `<@&${current.roles.preParciales}>`
          : '⏭️ Sin configurar',
        inline: true,
      },
      {
        name: '📖 Cursos',
        value: current.roles.cursos ? `<@&${current.roles.cursos}>` : '⏭️ Sin configurar',
        inline: true,
      },
      {
        name: '🔔 Notificaciones Generales',
        value: current.roles.notificacionesGenerales
          ? `<@&${current.roles.notificacionesGenerales}>`
          : '⏭️ Sin configurar',
        inline: true,
      },
    ],
    footer: 'Estos roles son opcionales. Puedes omitirlos si no los necesitas.',
  });
}

/**
 * Crea el embed para el paso 3: Canales
 */
export function createChannelsEmbed(session: any) {
  const current = session.config;
  return buildEmbed({
    title: '3️⃣ Configuración de Canales',
    description: 'Selecciona los canales principales del bot.',
    color: '#5865F2',
    fields: [
      {
        name: '👋 Bienvenida',
        value: current.channels.welcome ? `<#${current.channels.welcome}>` : '❌ No configurado',
        inline: true,
      },
      {
        name: '🎫 Tickets',
        value: current.channels.ticketTrigger
          ? `<#${current.channels.ticketTrigger}>`
          : '❌ No configurado',
        inline: true,
      },
      {
        name: '📢 Anuncios',
        value: current.channels.announcements
          ? `<#${current.channels.announcements}>`
          : '❌ No configurado',
        inline: true,
      },
      {
        name: '🔔 Alertas (Opcional)',
        value: current.channels.alerts ? `<#${current.channels.alerts}>` : '⏭️ Sin configurar',
        inline: true,
      },
    ],
    footer: 'Usa los menús desplegables para seleccionar cada canal',
  });
}

/**
 * Crea el embed para el paso 3: Sistema de Voz
 */
export function createVoiceEmbed(session: any) {
  const current = session.config;
  return buildEmbed({
    title: '4️⃣ Sistema de Voz',
    description: 'Configura el sistema Voice Master para canales temporales.',
    color: '#5865F2',
    fields: [
      {
        name: '🎤 VC Create',
        value: current.channels.vcCreate ? `<#${current.channels.vcCreate}>` : '❌ No configurado',
        inline: true,
      },
      {
        name: '📁 Categoría Voz',
        value: current.channels.voiceCategory
          ? `<#${current.channels.voiceCategory}>`
          : '❌ No configurado',
        inline: true,
      },
      {
        name: '🔄 VC Pool',
        value:
          current.channels.vcPool?.length > 0
            ? current.channels.vcPool.map((id: string) => `<#${id}>`).join(', ')
            : '❌ No configurado (mínimo 2)',
        inline: false,
      },
    ],
    footer: 'El pool de VCs permite reciclar canales de voz existentes',
  });
}

/**
 * Crea el embed de confirmación final
 */
export function createConfirmationEmbed(session: any) {
  const cfg = session.config;

  // Validar configuración mínima
  const missingRequired = [];
  if (!cfg.roles.admin) missingRequired.push('Rol Admin');
  if (!cfg.roles.junta) missingRequired.push('Rol Junta');
  if (!cfg.roles.verify) missingRequired.push('Rol Verificado');
  if (!cfg.roles.verifyJaveriana) missingRequired.push('Rol Javeriana');
  if (!cfg.channels.welcome) missingRequired.push('Canal Bienvenida');
  if (!cfg.channels.ticketTrigger) missingRequired.push('Canal Tickets');
  if (!cfg.channels.announcements) missingRequired.push('Canal Anuncios');
  if (!cfg.channels.vcCreate) missingRequired.push('Canal VC Create');
  if (!cfg.channels.voiceCategory) missingRequired.push('Categoría Voz');
  if (!cfg.channels.vcPool || cfg.channels.vcPool.length < 2)
    missingRequired.push('VC Pool (mín. 2)');

  const isValid = missingRequired.length === 0;

  return buildEmbed({
    title: isValid ? '5️⃣ Confirmación Final ✅' : '5️⃣ Configuración Incompleta ⚠️',
    description: isValid
      ? '¡Todo listo! Revisa la configuración y confirma para guardar.'
      : `**Faltan configuraciones requeridas:**\n${missingRequired.map((m) => `❌ ${m}`).join('\n')}\n\nCompleta todos los campos requeridos antes de guardar.`,
    color: isValid ? '#00FF00' : '#FFA500',
    fields: [
      {
        name: '👑 Roles Administrativos',
        value:
          `Admin: ${cfg.roles.admin ? `<@&${cfg.roles.admin}>` : '❌'}\n` +
          `Junta: ${cfg.roles.junta ? `<@&${cfg.roles.junta}>` : '❌'}\n` +
          `Verified: ${cfg.roles.verify ? `<@&${cfg.roles.verify}>` : '❌'}\n` +
          `Javeriana: ${cfg.roles.verifyJaveriana ? `<@&${cfg.roles.verifyJaveriana}>` : '❌'}`,
        inline: false,
      },
      {
        name: '📢 Roles de Notificaciones',
        value:
          `La Liga: ${cfg.roles.laLiga ? `<@&${cfg.roles.laLiga}>` : '⏭️'}\n` +
          `Pre-Parciales: ${cfg.roles.preParciales ? `<@&${cfg.roles.preParciales}>` : '⏭️'}\n` +
          `Cursos: ${cfg.roles.cursos ? `<@&${cfg.roles.cursos}>` : '⏭️'}\n` +
          `Notificaciones Generales: ${cfg.roles.notificacionesGenerales ? `<@&${cfg.roles.notificacionesGenerales}>` : '⏭️'}`,
        inline: false,
      },
      {
        name: '📝 Canales',
        value:
          `Bienvenida: ${cfg.channels.welcome ? `<#${cfg.channels.welcome}>` : '❌'}\n` +
          `Tickets: ${cfg.channels.ticketTrigger ? `<#${cfg.channels.ticketTrigger}>` : '❌'}\n` +
          `Anuncios: ${cfg.channels.announcements ? `<#${cfg.channels.announcements}>` : '❌'}\n` +
          `Alertas: ${cfg.channels.alerts ? `<#${cfg.channels.alerts}>` : '⏭️'}`,
        inline: false,
      },
      {
        name: '🎤 Sistema de Voz',
        value:
          `VC Create: ${cfg.channels.vcCreate ? `<#${cfg.channels.vcCreate}>` : '❌'}\n` +
          `Categoría: ${cfg.channels.voiceCategory ? `<#${cfg.channels.voiceCategory}>` : '❌'}\n` +
          `Pool: ${cfg.channels.vcPool?.length >= 2 ? `${cfg.channels.vcPool.length} canales` : '❌ (mín. 2)'}`,
        inline: false,
      },
      {
        name: '⚙️ Avanzado',
        value: `Threshold Alertas: ${cfg.alertThreshold || 20}%`,
        inline: false,
      },
    ],
    footer: isValid ? '✅ Confirmar y guardar | ❌ Cancelar' : '⬅️ Volver atrás para completar',
  });
}

/**
 * Ejecuta el comando setup interactivo
 * @param {any} interaction - La interacción de Discord
 * @returns {Promise<void>}
 */
async function execute(interaction: any) {
  const requestId = generateRequestId();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  logger.info('Interactive setup started', { requestId, userId, guildId });

  // Verificar permisos
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    if (interaction.deferred) {
      return interaction.editReply({
        content: '❌ Solo administradores pueden configurar el bot.',
      });
    } else {
      return interaction.reply({
        content: '❌ Solo administradores pueden configurar el bot.',
        flags: 1 << 6,
      });
    }
  }

  // Cargar config existente o crear nueva
  const existingConfig = getGuildConfig(guildId);
  const session = {
    userId,
    guildId,
    requestId,
    step: 'intro',
    config: {
      guildId,
      roles: {
        admin: existingConfig?.roles.admin,
        junta: existingConfig?.roles.junta,
        verify: existingConfig?.roles.verify,
        verifyJaveriana: existingConfig?.roles.verifyJaveriana,
        laLiga: existingConfig?.roles.laLiga,
        preParciales: existingConfig?.roles.preParciales,
        cursos: existingConfig?.roles.cursos,
        notificacionesGenerales: existingConfig?.roles.notificacionesGenerales,
      },
      channels: {
        welcome: existingConfig?.channels.welcome,
        ticketTrigger: existingConfig?.channels.ticketTrigger,
        announcements: existingConfig?.channels.announcements,
        vcCreate: existingConfig?.channels.vcCreate,
        vcPool: existingConfig?.channels.vcPool || [],
        voiceCategory: existingConfig?.channels.voiceCategory,
        alerts: existingConfig?.channels.alerts,
      },
      alertThreshold: existingConfig?.alertThreshold || 20,
    },
    startedAt: Date.now(),
  };

  // Guardar sesión
  const sessionKey = `${guildId}-${userId}`;
  setupSessions.set(sessionKey, session);

  // Cleanup después de 5 minutos
  setTimeout(
    () => {
      if (setupSessions.has(sessionKey)) {
        setupSessions.delete(sessionKey);
        logger.info('Setup session expired', { requestId, guildId, userId });
      }
    },
    5 * 60 * 1000,
  );

  // Enviar embed inicial con botón para comenzar
  const embed = createInitialEmbed();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup:start:${userId}`)
      .setLabel('🚀 Comenzar Configuración')
      .setStyle(ButtonStyle.Primary),
  );

  if (interaction.deferred) {
    return interaction.editReply({ embeds: [embed], components: [row] });
  } else {
    return interaction.reply({ embeds: [embed], components: [row], flags: 1 << 6 });
  }
}

export default { data, execute, defer: true };
