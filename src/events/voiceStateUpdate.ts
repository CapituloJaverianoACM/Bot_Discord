import { getGuildConfig } from '../config/store';

const TEMP_VC_IDLE_MS = 5 * 60 * 1000; // 5 minutes

async function scheduleCleanup(channel: any) {
  setTimeout(async () => {
    try {
      if (!channel || !channel.guild) return;
      const current = channel.members?.filter((m: any) => !m.user.bot);
      if (!current || current.size === 0) {
        if (channel.deletable) await channel.delete('Temp VC cleanup');
      }
    } catch (err) {
      console.error('Temp VC cleanup error', err);
    }
  }, TEMP_VC_IDLE_MS);
}

export default {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState: any, newState: any) {
    try {
      if (!newState.channel || newState.member?.user.bot) return;
      const guild = newState.guild;
      const cfg = getGuildConfig(guild.id);
      if (!cfg?.channels.vcCreate) return;
      const vcCreateId = cfg.channels.vcCreate;
      const pool = cfg.channels.vcPool || [];
      const voiceCategory = cfg.channels.voiceCategory;

      // User joined the VC CREATE channel
      if (newState.channelId === vcCreateId) {
        // find a free vc in pool
        let target = pool
          .map((id) => guild.channels.cache.get(id))
          .find(
            (ch: any) =>
              ch && ch.isVoiceBased?.() && ch.members.filter((m: any) => !m.user.bot).size === 0,
          );

        // if none, create temp
        if (!target && voiceCategory) {
          target = await guild.channels.create({
            name: `Temp VC ${Date.now().toString().slice(-4)}`,
            type: 2,
            parent: voiceCategory,
          });
          scheduleCleanup(target);
        }

        if (target) {
          await newState.member?.voice.setChannel(target, 'Auto-move from VC CREATE');
        }
      }
    } catch (err) {
      console.error('voiceStateUpdate error', err);
    }
  },
};
