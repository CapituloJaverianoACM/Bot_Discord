/**
 * @file help-handlers.ts
 * @description Manejadores de interacciones para el comando help.
 * Procesa selecciones del dropdown y muestra embeds detallados por categoría.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, APIEmbedField } from 'discord.js';
import { buildEmbed } from '../utils/embed';
import { COMMAND_CATEGORIES, hasAdminPermissions } from './help';
import { getGuildConfig } from '../config/store';

/**
 * Información detallada de cada comando para el help
 */
const COMMAND_DETAILS: Record<
  string,
  {
    name: string;
    emoji: string;
    description: string;
    permissions?: string;
    example: string;
  }
> = {
  ping: {
    name: 'ping',
    emoji: '🏓',
    description: 'Verifica latencia del bot',
    example: '`/ping` - Muestra latencia WebSocket',
  },
  help: {
    name: 'help',
    emoji: '❓',
    description: 'Muestra ayuda y comandos disponibles',
    example: '`/help` - Abre el menú de ayuda interactivo',
  },
  verify: {
    name: 'verify',
    emoji: '🔐',
    description: 'Verifica tu correo con código OTP',
    example:
      '`/verify start email:correo@javeriana.edu.co`\n' +
      '`/verify code otp:123456`\n\n' +
      '💡 **Preferible usar correo @javeriana.edu.co** para acceso completo. ' +
      'Si ya estás verificado con correo normal, puedes hacer upgrade automático a Javeriana.',
  },
  ticketmessage: {
    name: 'ticketmessage',
    emoji: '🎫',
    description: 'Publica mensaje para crear tickets',
    permissions: '👑 Requiere rol de Administrador o Junta',
    example: '`/ticketmessage` - Publica el mensaje con reacción 🎫',
  },
  ticketclose: {
    name: 'ticketclose',
    emoji: '🔒',
    description: 'Cierra el ticket actual',
    permissions: '👑 Requiere rol de Administrador o Junta',
    example: '`/ticketclose` - Cierra y elimina el ticket actual',
  },
  announce: {
    name: 'announce',
    emoji: '📢',
    description: 'Publica anuncios con embeds personalizados',
    permissions: '👑 Requiere rol de Administrador o Junta',
    example: '`/announce` - Usa el sistema interactivo paso a paso',
  },
  metrics: {
    name: 'metrics',
    emoji: '📊',
    description: 'Muestra estadísticas en tiempo real',
    permissions: '👑 Requiere rol de Administrador o Junta',
    example: '`/metrics` - Muestra error rate, uptime, requests, etc.',
  },
  setup: {
    name: 'setup',
    emoji: '🛠️',
    description: 'Configuración interactiva del servidor',
    permissions: '👑 Requiere rol de Administrador o Junta',
    example: '`/setup` - Sistema guiado paso a paso',
  },
  'config-reset': {
    name: 'config-reset',
    emoji: '⚠️',
    description: 'Elimina toda la configuración del servidor',
    permissions: '👑 Requiere ser Guild Owner',
    example: '`/config-reset confirmacion:CONFIRMAR`',
  },
  presence: {
    name: 'presence',
    emoji: '👤',
    description: 'Configura presencia del bot',
    permissions: '👑 Requiere rol de Administrador o Junta',
    example: '`/presence set text:Jugando type:playing`',
  },
  clear: {
    name: 'clear',
    emoji: '🧹',
    description: 'Elimina mensajes por cantidad o tiempo',
    permissions: '👑 Requiere permiso Manage Messages',
    example: '`/clear value:50 unit:mensajes`',
  },
};

/**
 * Maneja la selección de categoría del dropdown
 */
export async function handleHelpSelect(interaction: any) {
  const selectedCategory = interaction.values[0];
  const category = COMMAND_CATEGORIES[selectedCategory as keyof typeof COMMAND_CATEGORIES];

  if (!category) {
    return interaction.reply({
      content: '❌ Categoría no encontrada.',
      flags: 1 << 6,
    });
  }

  const guildId = interaction.guildId;
  const config = getGuildConfig(guildId);
  const isAdmin = hasAdminPermissions(interaction, config);

  // Verificar si el usuario tiene permisos para ver esta categoría
  if (category.requiresAdmin && !isAdmin) {
    return interaction.reply({
      content: '❌ No tienes permisos para ver esta categoría.',
      flags: 1 << 6,
    });
  }

  // Crear fields para cada comando en la categoría
  const fields: APIEmbedField[] = category.commands.map((cmdName) => {
    const details = COMMAND_DETAILS[cmdName];
    if (!details) {
      return {
        name: `${cmdName}`,
        value: 'Sin información disponible',
        inline: false,
      };
    }

    let value = `${details.description}\n\n`;

    if (details.permissions) {
      value += `${details.permissions}\n\n`;
    }

    value += `**Ejemplo:**\n${details.example}`;

    return {
      name: `${details.emoji} **/${details.name}**`,
      value,
      inline: false,
    };
  });

  // Crear embed con los comandos de la categoría
  const embed = buildEmbed({
    title: `${category.emoji} ${category.name}`,
    description: `Comandos disponibles en la categoría **${category.name}**:`,
    color: '#5865F2',
    fields,
  });

  // Agregar botón para volver al menú principal
  const backButton = new ButtonBuilder()
    .setCustomId('help:back')
    .setLabel('🔙 Volver al Menú')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}

/**
 * Maneja el botón de volver al menú principal
 */
export async function handleHelpBack(interaction: any) {
  // Recrear el menú principal ejecutando el comando help nuevamente
  const { default: helpCommand } = await import('./help');
  await helpCommand.execute(interaction);
}
