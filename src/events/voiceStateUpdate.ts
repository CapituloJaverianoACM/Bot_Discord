import { getGuildConfig } from '../config/store';
import { setVoiceState, clearVoiceState } from '../utils/voiceMasterState';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} from 'discord.js';

const TEMP_VC_IDLE_MS = 5 * 60 * 1000; // 5 minutes

async function scheduleCleanup(channel: any) {
  setTimeout(async () => {
    try {
      if (!channel || !channel.guild) return;
      const current = channel.members?.filter((m: any) => !m.user.bot);
      if (!current || current.size === 0) {
        clearVoiceState(channel.id);
        if (channel.deletable) await channel.delete('Temp VC cleanup');
      }
    } catch (err) {
      console.error('Temp VC cleanup error', err);
    }
  }, TEMP_VC_IDLE_MS);
}

function buildControls(vcId: string) {
  const settings = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`vm:settings:${vcId}`)
      .setPlaceholder('Channel Settings')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Name').setValue('name'),
        new StringSelectMenuOptionBuilder().setLabel('Limit').setValue('limit'),
        new StringSelectMenuOptionBuilder().setLabel('Status').setValue('status'),
        new StringSelectMenuOptionBuilder().setLabel('Game').setValue('game'),
        new StringSelectMenuOptionBuilder().setLabel('LFM').setValue('lfm'),
      ),
  );

  const perms = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`vm:perms:${vcId}`)
      .setPlaceholder('Channel Permissions')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Lock').setValue('lock'),
        new StringSelectMenuOptionBuilder().setLabel('Unlock').setValue('unlock'),
        new StringSelectMenuOptionBuilder().setLabel('Permit').setValue('permit'),
        new StringSelectMenuOptionBuilder().setLabel('Reject').setValue('reject'),
        new StringSelectMenuOptionBuilder().setLabel('Invite').setValue('invite'),
      ),
  );
  return [settings, perms];
}

/**
 * Manejador del evento voiceStateUpdate para el sistema Voice Master
 * @property {string} name - Nombre del evento
 * @property {boolean} once - Si el evento debe ejecutarse solo una vez
 * @property {Function} execute - Función a ejecutar cuando cambia el estado de voz
 */
export default {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState: any, newState: any) {
    try {
      if (!newState.channel || newState.member?.user.bot) return;
      const guild = newState.guild;
      const cfg = getGuildConfig(guild.id);
      if (!cfg?.channels.vcCreate || !cfg.channels.voiceCategory) return;

      const vcCreateId = cfg.channels.vcCreate;
      const voiceCategory = cfg.channels.voiceCategory;

      // User joined the VC CREATE channel
      if (newState.channelId === vcCreateId) {
        const baseName = newState.member?.user?.username || 'Temp';
        const name = `🎙️║VC ${baseName}`;
        const target = await guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          parent: voiceCategory,
        });
        await newState.member?.voice.setChannel(target, 'Auto-move from VC CREATE');
        scheduleCleanup(target);

        // Post control embed in the voice channel chat itself (no extra text channel)
        const embed = {
          title: 'VC Controls',
          description:
            'Status: -\nUsa los menús para configurar tu canal. Sólo el creador o junta/admin pueden cambiarlo.',
        };
        const rows = buildControls(target.id);
        try {
          // Enviar el ping del creador como mensaje separado antes del embed
          const controlMsg = await (target as any).send?.({
            content: `Creador: <@${newState.member.id}>`,
            embeds: [embed],
            components: rows,
          });
          if (controlMsg) {
            setVoiceState(target.id, {
              ownerId: newState.member.id,
              voiceChannelId: target.id,
              textChannelId: target.id,
              controlMessageId: controlMsg.id,
              baseName,
              emoji: '🎙️',
              status: '-',
              lfm: false,
            });
          }
        } catch (sendErr) {
          console.error('Failed to send controls to voice channel chat', sendErr);
        }
      }
    } catch (err) {
      console.error('voiceStateUpdate error', err);
    }
  },
};
