import { getVoiceState, setVoiceState } from '../utils/voiceMasterState';
import { getGuildConfig } from '../config/store';
import { logger, generateRequestId, checkErrorThreshold, getErrorMetrics } from '../utils/logger';
import { sendAdminAlert } from '../utils/alerts';
import {
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

const EPHEMERAL_FLAG = 1 << 6; // Discord API flag for ephemeral responses

// Contador de interacciones para verificar error threshold
let interactionCount = 0;

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: any) {
    const requestId = generateRequestId();
    (interaction as any).requestId = requestId;

    try {
      const type = interaction.type ?? 'unknown';
      const name = interaction.commandName ?? interaction?.data?.name ?? 'unknown';
      const userId = interaction.user?.id;
      const guildId = interaction.guildId;

      logger.info('Interaction received', {
        requestId,
        type,
        commandName: name,
        userId,
        guildId,
      });

      // Incrementar contador y verificar error threshold cada 10 interacciones
      interactionCount++;
      if (interactionCount % 10 === 0 && guildId) {
        const config = getGuildConfig(guildId);
        const threshold = config?.alertThreshold ?? 20;

        if (checkErrorThreshold(threshold)) {
          const metrics = getErrorMetrics();

          logger.warn('Error threshold exceeded, sending alert', {
            requestId,
            guildId,
            errorRate: metrics.errorRate,
            threshold,
            totalRequests: metrics.totalRequests,
            totalErrors: metrics.totalErrors,
          });

          // Enviar alerta a admins
          const topCommandsText =
            metrics.topErrorCommands
              .map((c, i) => `${i + 1}. ${c.command}: ${c.count} errores`)
              .join('\n') || 'N/A';

          await sendAdminAlert(interaction.client, guildId, {
            title: 'High Error Rate Detected',
            description: `El sistema ha detectado un alto porcentaje de errores en los últimos ${metrics.windowMinutes} minutos.`,
            severity: 'warning',
            fields: [
              {
                name: 'Error Rate',
                value: `${metrics.errorRate.toFixed(1)}%`,
                inline: true,
              },
              {
                name: 'Threshold',
                value: `${threshold}%`,
                inline: true,
              },
              {
                name: 'Requests',
                value: `${metrics.totalRequests}`,
                inline: true,
              },
              {
                name: 'Errors',
                value: `${metrics.totalErrors}`,
                inline: true,
              },
              {
                name: 'Window',
                value: `${metrics.windowMinutes} min`,
                inline: true,
              },
              {
                name: 'Top Error Commands',
                value: topCommandsText,
                inline: false,
              },
            ],
          });
        }
      }

      // Announce interactivo: handle modals, buttons and select menus
      if (interaction.isModalSubmit?.() && interaction.customId?.startsWith('announce:')) {
        const { handleAnnounceModal } = await import('../commands/announce-handlers');
        await handleAnnounceModal(interaction);
        return;
      }
      if (interaction.isButton?.() && interaction.customId?.startsWith('announce:')) {
        const { handleAnnounceButton } = await import('../commands/announce-handlers');
        await handleAnnounceButton(interaction);
        return;
      }
      if (interaction.isStringSelectMenu?.() && interaction.customId?.startsWith('announce:')) {
        const { handleAnnounceSelect } = await import('../commands/announce-handlers');
        await handleAnnounceSelect(interaction);
        return;
      }

      // Setup interactivo: handle buttons and select menus
      if (interaction.isButton?.() && interaction.customId?.startsWith('setup:')) {
        const { handleSetupButton } = await import('../commands/setup-handlers');
        await handleSetupButton(interaction);
        return;
      }
      if (interaction.isStringSelectMenu?.() && interaction.customId?.startsWith('setup:')) {
        const { handleSetupSelect } = await import('../commands/setup-handlers');
        await handleSetupSelect(interaction);
        return;
      }

      // Voice Master controls: handle select menus / modals first
      if (interaction.isStringSelectMenu?.()) {
        const cid = interaction.customId as string;
        if (cid.startsWith('vm:')) {
          await handleVoiceMasterSelect(interaction);
          return;
        }
      }
      if (interaction.isModalSubmit?.()) {
        const cid = interaction.customId as string;
        if (cid.startsWith('vm:')) {
          await handleVoiceMasterModal(interaction);
          return;
        }
      }

      if (typeof interaction.isChatInputCommand === 'function') {
        if (!interaction.isChatInputCommand()) return;
      } else if (typeof interaction.isCommand === 'function') {
        if (!interaction.isCommand()) return;
      } else {
        return;
      }

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        logger.warn('Command not found', {
          requestId,
          commandName: interaction.commandName,
          guildId,
        });
        return;
      }

      // Optional deferral: only if the command opts-in via defer=true
      if (
        command.defer &&
        !interaction.deferred &&
        !interaction.replied &&
        typeof interaction.deferReply === 'function'
      ) {
        try {
          await interaction.deferReply({ flags: EPHEMERAL_FLAG });
          logger.debug('Interaction deferred', { requestId, commandName: name });
        } catch (deferErr) {
          logger.error('Failed to defer interaction', {
            requestId,
            commandName: name,
            error: deferErr instanceof Error ? deferErr.message : String(deferErr),
            errorType: deferErr instanceof Error ? deferErr.name : 'DeferError',
          });
        }
      }

      try {
        await command.execute(interaction);
        logger.info('Command executed successfully', {
          requestId,
          commandName: name,
          userId,
          guildId,
        });
      } catch (err) {
        logger.error('Command execution failed', {
          requestId,
          commandName: name,
          userId,
          guildId,
          error: err instanceof Error ? err.message : String(err),
          errorType: err instanceof Error ? err.name : 'CommandError',
        });

        const replyPayload = {
          content: 'There was an error while executing this command!',
          flags: EPHEMERAL_FLAG,
        };
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.followUp?.(replyPayload);
          } else {
            await interaction.reply?.(replyPayload);
          }
        } catch (replyErr) {
          logger.error('Failed to send error reply', {
            requestId,
            commandName: name,
            error: replyErr instanceof Error ? replyErr.message : String(replyErr),
            errorType: replyErr instanceof Error ? replyErr.name : 'ReplyError',
          });
        }
      }
    } catch (topErr) {
      logger.critical('Critical error in interactionCreate handler', {
        requestId,
        error: topErr instanceof Error ? topErr.message : String(topErr),
        errorType: topErr instanceof Error ? topErr.name : 'CriticalError',
      });
    }
  },
};

async function handleVoiceMasterSelect(interaction: any) {
  const { customId, values, user, guild, channelId } = interaction;
  const parts = customId.split(':');
  let kind = parts[1];
  let vcId = parts[2] || channelId;

  // Handle selector customIds: vm:permit:sel:<vcId>:<idx> or vm:permitsel2:<vcId>
  if (parts[2] === 'sel') {
    // pattern vm:permit:sel:<vcId>:<idx>
    kind = parts[1];
    vcId = parts[3] || channelId;
  } else if (kind.endsWith('sel2')) {
    // pattern vm:permitsel2:<vcId>
    kind = kind.replace('sel2', 'sel2'); // keep marker
    vcId = parts[2] || channelId;
  }

  const state = getVoiceState(vcId) || getVoiceState(channelId);
  if (!state)
    return interaction.reply({ content: 'Canal temporal no encontrado.', flags: EPHEMERAL_FLAG });
  const member = await guild.members.fetch(user.id);
  const cfg = getGuildConfig(guild.id);
  const adminRoleId = cfg?.roles.admin;
  const juntaRoleId = cfg?.roles.junta;
  const isOwner = state.ownerId === user.id;
  const isAdmin =
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (adminRoleId && member.roles.cache.has(adminRoleId));
  const isJunta = juntaRoleId
    ? member.roles.cache.has(juntaRoleId)
    : member.roles.cache.some((r: any) => r.name.toLowerCase().includes('junta'));
  if (!isOwner && !isAdmin && !isJunta) {
    return interaction.reply({ content: 'No puedes modificar este canal.', flags: EPHEMERAL_FLAG });
  }
  const voiceChannel: any = guild.channels.cache.get(state.voiceChannelId);
  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
    return interaction.reply({ content: 'El canal ya no existe.', flags: EPHEMERAL_FLAG });
  }
  const choice = values?.[0];

  // Handle selection results from permit/reject/invite dropdowns
  if (kind === 'permitsel' || kind === 'permitsel2') {
    await applyPermit(voiceChannel, choice, interaction);
    return;
  }
  if (kind === 'rejectsel' || kind === 'rejectsel2') {
    await applyReject(voiceChannel, choice, interaction);
    return;
  }
  if (kind === 'invitesel' || kind === 'invitesel2') {
    await applyInvite(voiceChannel, choice, interaction, member);
    return;
  }

  if (kind === 'settings') {
    if (choice === 'name') return showModal(interaction, vcId, 'name', 'Nuevo nombre');
    if (choice === 'limit') return showModal(interaction, vcId, 'limit', 'Límite (1-99)');
    if (choice === 'status') return showModal(interaction, vcId, 'status', 'Status del canal');
    if (choice === 'game') return showModal(interaction, vcId, 'game', '¿Qué juego?');
    if (choice === 'lfm') {
      const base = state.baseName.replace(/^\[LFM\]\s*/i, '');
      const newState = { ...state, lfm: true, baseName: base };
      const name = `${newState.emoji}║VC ${newState.lfm ? '[LFM] ' : ''}${newState.baseName}`;
      setVoiceState(vcId, newState);
      await voiceChannel.setName(name);
      return interaction.reply({ content: 'Marcado como LFM.', flags: EPHEMERAL_FLAG });
    }
  }
  if (kind === 'perms') {
    if (choice === 'lock') {
      await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
      return interaction.reply({ content: 'Canal bloqueado.', flags: EPHEMERAL_FLAG });
    }
    if (choice === 'unlock') {
      await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: null });
      return interaction.reply({ content: 'Canal desbloqueado.', flags: EPHEMERAL_FLAG });
    }
    if (choice === 'permit') return showSelector(interaction, vcId, 'permit');
    if (choice === 'reject') return showSelector(interaction, vcId, 'reject');
    if (choice === 'invite') return showSelector(interaction, vcId, 'invite');
  }
}

async function handleVoiceMasterModal(interaction: any) {
  const { customId, fields, user, guild, channelId } = interaction;
  const [, action, vcIdRaw] = customId.split(':');
  const vcId = vcIdRaw || channelId;
  const state = getVoiceState(vcId) || getVoiceState(channelId);
  if (!state)
    return interaction.reply({ content: 'Canal temporal no encontrado.', flags: EPHEMERAL_FLAG });
  const member = await guild.members.fetch(user.id);
  const cfg = getGuildConfig(guild.id);
  const adminRoleId = cfg?.roles.admin;
  const juntaRoleId = cfg?.roles.junta;
  const isOwner = state.ownerId === user.id;
  const isAdmin =
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (adminRoleId && member.roles.cache.has(adminRoleId));
  const isJunta = juntaRoleId
    ? member.roles.cache.has(juntaRoleId)
    : member.roles.cache.some((r: any) => r.name.toLowerCase().includes('junta'));
  if (!isOwner && !isAdmin && !isJunta) {
    return interaction.reply({ content: 'No puedes modificar este canal.', flags: EPHEMERAL_FLAG });
  }
  const voiceChannel: any = guild.channels.cache.get(state.voiceChannelId);
  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
    return interaction.reply({ content: 'El canal ya no existe.', flags: EPHEMERAL_FLAG });
  }
  const value = fields.getTextInputValue('value').trim();
  if (action === 'name') {
    const base = value.replace(/^\[LFM\]\s*/i, '');
    const newState = { ...state, baseName: base };
    setVoiceState(vcId, newState);
    await voiceChannel.setName(
      `${newState.emoji}║VC ${newState.lfm ? '[LFM] ' : ''}${newState.baseName}`,
    );
    return interaction.reply({ content: 'Nombre actualizado.', flags: EPHEMERAL_FLAG });
  }
  if (action === 'limit') {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 99)
      return interaction.reply({ content: 'Límite inválido (1-99).', flags: EPHEMERAL_FLAG });
    await voiceChannel.setUserLimit(num);
    return interaction.reply({ content: 'Límite actualizado.', flags: EPHEMERAL_FLAG });
  }
  if (action === 'status') {
    const newState = { ...state, status: value };
    setVoiceState(vcId, newState);
    await updateControlStatus(guild, newState);
    return interaction.reply({ content: `Status actualizado: ${value}`, flags: EPHEMERAL_FLAG });
  }
  if (action === 'game') {
    const base = value.replace(/^\[LFM\]\s*/i, '');
    const newState = { ...state, baseName: base, emoji: '🎮' };
    setVoiceState(vcId, newState);
    await voiceChannel.setName(
      `${newState.emoji}║VC ${newState.lfm ? '[LFM] ' : ''}${newState.baseName}`,
    );
    return interaction.reply({ content: 'Juego actualizado en el nombre.', flags: EPHEMERAL_FLAG });
  }
  if (action === 'permit') {
    await applyPermit(voiceChannel, value, interaction);
    return;
  }
  if (action === 'reject') {
    await applyReject(voiceChannel, value, interaction);
    return;
  }
  if (action === 'invite') {
    await applyInvite(voiceChannel, value, interaction, member);
    return;
  }
}

async function applyPermit(channel: any, targetId: string, interaction: any) {
  await channel.permissionOverwrites.edit(targetId, {
    Connect: true,
    ViewChannel: true,
    Speak: true,
  });
  return interaction.reply({ content: 'Acceso permitido.', flags: EPHEMERAL_FLAG });
}

async function applyReject(channel: any, targetId: string, interaction: any) {
  await channel.permissionOverwrites.edit(targetId, { Connect: false, ViewChannel: false });
  const kicked = channel.members.get(targetId);
  if (kicked) await kicked.voice.disconnect('Rejected from VC');
  return interaction.reply({ content: 'Acceso denegado.', flags: EPHEMERAL_FLAG });
}

async function applyInvite(channel: any, targetId: string, interaction: any, member: any) {
  try {
    const invite = await channel.createInvite({ maxAge: 300, maxUses: 1 });
    const targetUser = await interaction.client.users.fetch(targetId);
    await targetUser.send({
      content: `${member.displayName} te ha invitado a unirte al canal de voz <#${channel.id}>: ${invite.url}`,
    });
    return interaction.reply({ content: 'Invitación enviada por DM.', flags: EPHEMERAL_FLAG });
  } catch (err) {
    console.error('invite error', err);
    return interaction.reply({
      content: 'No se pudo enviar la invitación.',
      flags: EPHEMERAL_FLAG,
    });
  }
}

function showModal(interaction: any, vcId: string, action: string, label: string) {
  const modal = new ModalBuilder().setCustomId(`vm:${action}:${vcId}`).setTitle(label);
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(label)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  return interaction.showModal(modal);
}

async function showSelector(
  interaction: any,
  vcId: string,
  action: 'permit' | 'reject' | 'invite',
) {
  try {
    const guild = interaction.guild;
    const allMembers = await guild.members.fetch();
    const memberOptions = allMembers
      .filter((m: any) => !m.user.bot)
      .map((m: any) => new StringSelectMenuOptionBuilder().setLabel(m.user.tag).setValue(m.id));
    const roleOptions = guild.roles.cache
      .filter((r: any) => r.name !== '@everyone')
      .map((r: any) => new StringSelectMenuOptionBuilder().setLabel(r.name).setValue(r.id));

    const rows: any[] = [];
    const maxRows = action === 'invite' ? 5 : 4; // leave a slot for roles when needed
    for (let i = 0; i < memberOptions.length && rows.length < maxRows; i += 25) {
      rows.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`vm:${action}sel:${vcId}:${i / 25}`)
            .setPlaceholder('Selecciona usuario')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(memberOptions.slice(i, i + 25)),
        ),
      );
    }

    if (action !== 'invite' && rows.length < 5 && roleOptions.length) {
      rows.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`vm:${action}sel2:${vcId}`)
            .setPlaceholder('Selecciona rol')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(roleOptions.slice(0, 25)),
        ),
      );
    }

    if (!rows.length) {
      await interaction.reply({
        content: 'No hay usuarios disponibles para seleccionar.',
        flags: EPHEMERAL_FLAG,
      });
      return;
    }

    const content =
      action === 'invite' ? 'Selecciona usuario para invitar:' : 'Selecciona usuario o rol:';
    await interaction.reply({ content, components: rows, flags: EPHEMERAL_FLAG });
  } catch (err) {
    console.error('showSelector error', err);
    await interaction
      .reply({ content: 'No se pudo cargar la lista de usuarios/roles.', flags: EPHEMERAL_FLAG })
      .catch(() => {});
  }
}

/**
 * Actualiza el mensaje de control del canal de voz con el estado actual
 * @param {any} guild - El servidor
 * @param {any} state - Estado del canal de voz temporal
 * @returns {Promise<void>}
 */
async function updateControlStatus(guild: any, state: any) {
  try {
    const textChannel: any = guild.channels.cache.get(state.textChannelId);
    if (!textChannel?.messages) return;
    const msg = await textChannel.messages.fetch(state.controlMessageId).catch(() => null);
    if (!msg) return;
    await msg.edit({
      embeds: [
        {
          title: 'VC Controls',
          description: `Creador: <@${state.ownerId}>\nStatus: ${state.status ?? '-'}\nUsa los menús para configurar tu canal. Sólo el creador o junta/admin pueden cambiarlo.`,
        },
      ],
      components: msg.components,
    });
  } catch (err) {
    console.error('updateControlStatus error', err);
  }
}
