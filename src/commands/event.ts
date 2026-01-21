/**
 * @file event.ts
 * @description Comando para gestionar eventos programados del servidor (scheduled events).
 * Permite crear, cancelar y listar eventos, con soporte para eventos externos y de voz.
 * Solo accesible para administradores.
 */

import {
  SlashCommandBuilder,
  PermissionsBitField,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
  ColorResolvable,
} from 'discord.js';
import { buildEmbed, parseHexColor } from '../utils/embed';
import { getGuildConfig } from '../config/store';

/** Definición del comando /event con sus subcomandos */
const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('📅 Prueba de concepto - Usa UI de Discord para eventos')
  .addSubcommand((sub) =>
    sub
      .setName('create')
      .setDescription('Crear evento')
      .addStringOption((opt) => opt.setName('name').setDescription('Nombre').setRequired(true))
      .addStringOption((opt) =>
        opt.setName('description').setDescription('Descripción').setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('Tipo: external o voice')
          .addChoices({ name: 'external', value: 'external' }, { name: 'voice', value: 'voice' })
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('start')
          .setDescription('Inicio ISO 8601 (ej: 2025-01-19T18:00:00Z)')
          .setRequired(true),
      )
      // required end for external, optional for voice; must follow required before optionals
      .addStringOption((opt) =>
        opt
          .setName('end')
          .setDescription('Fin ISO 8601 (opcional para voice, requerido para external)')
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt.setName('location').setDescription('Ubicación (para external)').setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('voice_channel')
          .setDescription('ID de canal de voz (para voice)')
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt.setName('url').setDescription('URL opcional').setRequired(false),
      )
      .addBooleanOption((opt) =>
        opt.setName('ping').setDescription('Mencionar rol de eventos/anuncios'),
      )
      .addStringOption((opt) =>
        opt.setName('color').setDescription('Color del embed').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('cancel')
      .setDescription('Cancelar evento')
      .addStringOption((opt) =>
        opt.setName('id').setDescription('ID del evento').setRequired(true),
      ),
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('Lista eventos programados (máx 10)'));

/**
 * Ejecuta el comando event para gestionar eventos programados
 * @param {any} interaction - La interacción de Discord
 * @returns {Promise<void>}
 */
async function execute(interaction: any) {
  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Solo admin/junta.', flags: 1 << 6 });
  }
  const cfg = getGuildConfig(interaction.guildId);
  if (!cfg?.channels.announcements) {
    return interaction.reply({ content: 'Configura canal de anuncios en /setup.', flags: 1 << 6 });
  }
  const pingRole = cfg.roles.notificacionesGenerales;
  const doPing = interaction.options.getBoolean('ping') ?? false;

  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const name = interaction.options.getString('name', true);
    const description = interaction.options.getString('description', true);
    const typeInput = interaction.options.getString('type', true);
    const startStr = interaction.options.getString('start', true);
    const endStr = interaction.options.getString('end') ?? undefined;
    const location = interaction.options.getString('location') ?? undefined;
    const voiceChannelId = interaction.options.getString('voice_channel') ?? undefined;
    const url = interaction.options.getString('url') ?? undefined;
    const color = parseHexColor(interaction.options.getString('color') || undefined) as
      | ColorResolvable
      | undefined;

    const startTime = new Date(startStr);
    if (Number.isNaN(startTime.getTime())) {
      return interaction.reply({ content: 'Fecha de inicio inválida.', flags: 1 << 6 });
    }
    const endTime = endStr ? new Date(endStr) : undefined;
    if (endStr && Number.isNaN(endTime!.getTime())) {
      return interaction.reply({ content: 'Fecha de fin inválida.', flags: 1 << 6 });
    }
    if (startTime.getTime() <= Date.now()) {
      return interaction.reply({ content: 'Inicio debe ser en el futuro.', flags: 1 << 6 });
    }
    if (endTime && endTime.getTime() <= startTime.getTime()) {
      return interaction.reply({ content: 'Fin debe ser después del inicio.', flags: 1 << 6 });
    }

    const entityType =
      typeInput === 'voice'
        ? GuildScheduledEventEntityType.Voice
        : GuildScheduledEventEntityType.External;

    if (entityType === GuildScheduledEventEntityType.External && !endTime) {
      return interaction.reply({
        content: 'Para eventos external se requiere fecha de fin.',
        flags: 1 << 6,
      });
    }
    if (entityType === GuildScheduledEventEntityType.External && !location) {
      return interaction.reply({
        content: 'Para eventos external se requiere ubicación.',
        flags: 1 << 6,
      });
    }
    if (entityType === GuildScheduledEventEntityType.Voice && !voiceChannelId) {
      return interaction.reply({
        content: 'Para eventos voice se requiere voice_channel.',
        flags: 1 << 6,
      });
    }

    try {
      const event = await interaction.guild.scheduledEvents.create({
        name,
        description,
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType,
        entityMetadata:
          entityType === GuildScheduledEventEntityType.External ? { location } : undefined,
        channel: entityType === GuildScheduledEventEntityType.Voice ? voiceChannelId : undefined,
      });

      const embed = buildEmbed({
        title: `Evento creado: ${name}`,
        description: description,
        color,
        fields: [
          { name: 'Inicio', value: startTime.toISOString(), inline: true },
          { name: 'Fin', value: endTime ? endTime.toISOString() : 'N/A', inline: true },
          { name: 'Tipo', value: typeInput, inline: true },
          { name: 'Ubicación', value: location ?? 'N/A', inline: true },
          { name: 'URL', value: url ?? 'N/A', inline: true },
        ],
      });
      const announcements = interaction.guild.channels.cache.get(cfg.channels.announcements!);
      if (announcements?.isTextBased?.()) {
        if (doPing && pingRole) await announcements.send({ content: `<@&${pingRole}>` });
        await announcements.send({ embeds: [embed] });
      }
      return interaction.reply({ content: `Evento creado con ID: ${event.id}`, flags: 1 << 6 });
    } catch (err) {
      console.error('event create error', err);
      return interaction.reply({
        content: 'No se pudo crear el evento (revisa permisos y parámetros).',
        flags: 1 << 6,
      });
    }
  }

  if (sub === 'cancel') {
    const id = interaction.options.getString('id', true);
    try {
      const event = await interaction.guild.scheduledEvents.fetch(id);
      if (!event) return interaction.reply({ content: 'Evento no encontrado.', flags: 1 << 6 });
      await event.delete();
      return interaction.reply({ content: 'Evento cancelado.', flags: 1 << 6 });
    } catch (err) {
      console.error('event cancel error', err);
      return interaction.reply({ content: 'No se pudo cancelar el evento.', flags: 1 << 6 });
    }
  }

  if (sub === 'list') {
    try {
      const events = await interaction.guild.scheduledEvents.fetch({ withUserCount: false });
      const list = events.first(10);
      if (!list || list.length === 0) {
        return interaction.reply({ content: 'No hay eventos programados.', flags: 1 << 6 });
      }
      const embed = buildEmbed({
        title: 'Eventos programados',
        description: list
          .map(
            (e: any) =>
              `${e.id} | ${e.name} | ${e.scheduledStartTimestamp ? new Date(e.scheduledStartTimestamp).toISOString() : 'N/A'}`,
          )
          .join('\n'),
      });
      return interaction.reply({ embeds: [embed], flags: 1 << 6 });
    } catch (err) {
      console.error('event list error', err);
      return interaction.reply({ content: 'No se pudo listar eventos.', flags: 1 << 6 });
    }
  }
}

export default { data, execute };
