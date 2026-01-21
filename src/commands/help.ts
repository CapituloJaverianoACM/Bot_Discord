/**
 * @file help.ts
 * @description Comando de ayuda interactivo con dropdown para navegar por categorías.
 * Muestra comandos disponibles filtrados por permisos del usuario.
 */

import {
  SlashCommandBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { getGuildConfig } from '../config/store';

/** Definición del comando /help */
const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('❓ Muestra ayuda y comandos disponibles');

/**
 * Define las categorías de comandos y sus comandos asociados
 */
const COMMAND_CATEGORIES = {
  general: {
    emoji: '📚',
    name: 'General',
    commands: ['ping', 'help'],
    requiresAdmin: false,
  },
  verification: {
    emoji: '🔐',
    name: 'Verificación',
    commands: ['verify'],
    requiresAdmin: false,
  },
  tickets: {
    emoji: '🎫',
    name: 'Tickets',
    commands: ['ticketmessage', 'ticketclose'],
    requiresAdmin: true,
  },
  communication: {
    emoji: '📢',
    name: 'Comunicación',
    commands: ['announce'],
    requiresAdmin: true,
  },
  monitoring: {
    emoji: '📊',
    name: 'Monitoreo',
    commands: ['metrics'],
    requiresAdmin: true,
  },
  administration: {
    emoji: '👑',
    name: 'Administración',
    commands: ['setup', 'config-reset', 'presence', 'clear'],
    requiresAdmin: true,
  },
};

/**
 * Verifica si el usuario tiene permisos de administrador
 */
function hasAdminPermissions(interaction: any, config: any): boolean {
  const member = interaction.member;

  // Verificar permiso de Administrator
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  // Verificar roles de admin o junta
  if (config?.roles.admin && member.roles.cache.has(config.roles.admin)) {
    return true;
  }

  if (config?.roles.junta && member.roles.cache.has(config.roles.junta)) {
    return true;
  }

  return false;
}

/**
 * Cuenta cuántos comandos están bloqueados para el usuario
 */
function countBlockedCommands(isAdmin: boolean): number {
  let blockedCount = 0;

  Object.values(COMMAND_CATEGORIES).forEach((category) => {
    if (category.requiresAdmin && !isAdmin) {
      blockedCount += category.commands.length;
    }
  });

  return blockedCount;
}

/**
 * Ejecuta el comando help
 */
async function execute(interaction: any) {
  const guildId = interaction.guildId;
  const config = getGuildConfig(guildId);
  const isAdmin = hasAdminPermissions(interaction, config);
  const blockedCount = countBlockedCommands(isAdmin);

  // Crear dropdown con categorías
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help:category')
    .setPlaceholder('📚 Selecciona una categoría');

  // Agregar opciones al dropdown (solo categorías disponibles para el usuario)
  Object.entries(COMMAND_CATEGORIES).forEach(([key, category]) => {
    // Si la categoría requiere admin y el usuario no es admin, no mostrarla
    if (category.requiresAdmin && !isAdmin) {
      return;
    }

    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${category.emoji} ${category.name}`)
        .setDescription(`Ver comandos de ${category.name}`)
        .setValue(key),
    );
  });

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  // Crear embed principal
  const embed = buildEmbed({
    title: '📚 Ayuda del Bot ACM',
    description:
      '¡Bienvenido al sistema de ayuda!\n\n' +
      'Selecciona una categoría del menú desplegable para ver los comandos disponibles.\n\n' +
      '**Categorías disponibles:**\n' +
      Object.entries(COMMAND_CATEGORIES)
        .filter(([, cat]) => !cat.requiresAdmin || isAdmin)
        .map(
          ([, cat]) =>
            `${cat.emoji} **${cat.name}** - ${cat.commands.length} comando${cat.commands.length > 1 ? 's' : ''}`,
        )
        .join('\n'),
    color: '#5865F2',
    footer:
      blockedCount > 0
        ? `${blockedCount} comando${blockedCount > 1 ? 's' : ''} adicional${blockedCount > 1 ? 'es' : ''} disponible${blockedCount > 1 ? 's' : ''} solo para admins`
        : undefined,
  });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: 1 << 6, // ephemeral
  });
}

export default { data, execute };
export { COMMAND_CATEGORIES, hasAdminPermissions };
