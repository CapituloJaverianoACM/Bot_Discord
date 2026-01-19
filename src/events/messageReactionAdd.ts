import { buildEmbed } from '../utils/embed';
import { getGuildConfig, upsertGuildConfig } from '../config/store';

const EPHEMERAL_FLAG = 1 << 6; // Discord API flag

// Ticket creation via reaction on the configured ticket trigger channel/message
export default {
  name: 'messageReactionAdd',
  once: false,
  async execute(reaction: any, user: any) {
    try {
      if (user.bot) return;
      if (reaction.partial) await reaction.fetch();
      if (reaction.message?.partial) await reaction.message.fetch();
      const guild = reaction.message?.guild;
      if (!guild) return;

      const cfg = getGuildConfig(guild.id);
      if (!cfg?.channels.ticketTrigger) return;
      if (reaction.message.channelId !== cfg.channels.ticketTrigger) return;
      if (reaction.emoji?.name !== '🎫') return;

      // Remove the user's reaction to keep the trigger clean
      await reaction.users.remove(user.id).catch(() => {});

      const openTickets = cfg.openTickets || {};
      const existingTicket = openTickets[user.id];

      // Enforce one open ticket per user: if exists, ping in their ticket text channel
      if (existingTicket) {
        const ticketText = existingTicket.textId
          ? guild.channels.cache.get(existingTicket.textId)
          : guild.channels.cache.find(
              (ch: any) =>
                ch.parentId === existingTicket.categoryId &&
                ch.name === `ticket-${user.username}-txt`,
            );
        const notifyPayload = {
          content: `<@${user.id}> ya tienes un ticket abierto.`,
          flags: EPHEMERAL_FLAG,
        };
        if (ticketText && ticketText.isTextBased?.()) {
          await (ticketText as any).send(notifyPayload).catch(() => {});
        } else {
          await reaction.message.channel.send(notifyPayload).catch(() => {});
        }
        return;
      }

      // Create category for the ticket
      const category = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: 4, // Category
        permissionOverwrites: [
          { id: guild.id, deny: ['ViewChannel'] },
          { id: user.id, allow: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] },
          cfg.roles.junta
            ? { id: cfg.roles.junta, allow: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] }
            : null,
        ].filter(Boolean) as any[],
      });

      const text = await guild.channels.create({
        name: `ticket-${user.username}-txt`,
        parent: category.id,
        type: 0,
        permissionOverwrites: category.permissionOverwrites.cache.map((p: any) => ({
          id: p.id,
          allow: p.allow.toArray(),
          deny: p.deny.toArray(),
        })),
      });

      const voice = await guild.channels.create({
        name: `ticket-${user.username}-vc`,
        parent: category.id,
        type: 2,
        permissionOverwrites: category.permissionOverwrites.cache.map((p: any) => ({
          id: p.id,
          allow: p.allow.toArray(),
          deny: p.deny.toArray(),
        })),
      });

      // Persist open ticket for this user
      openTickets[user.id] = { categoryId: category.id, textId: text.id, voiceId: voice.id };
      upsertGuildConfig({ ...cfg, guildId: guild.id, openTickets });

      const embed = buildEmbed({
        title: 'Ticket creado',
        description: 'Un miembro de JUNTA te atenderá pronto.',
        fields: [
          { name: 'Solicitante', value: `<@${user.id}>`, inline: true },
          { name: 'Texto', value: `<#${text.id}>`, inline: true },
          { name: 'Voz', value: `<#${voice.id}>`, inline: true },
        ],
      });
      await text.send({ embeds: [embed] });
    } catch (err) {
      console.error('Ticket create error', err);
    }
  },
};
