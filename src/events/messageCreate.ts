export default {
  name: 'messageCreate',
  once: false,
  async execute(message: any) {
    try {
      const author = message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown';
      const channel = message.channel
        ? `${message.channel.type ?? 'channel'}:${message.channel.id ?? 'unknown'}`
        : 'Unknown';
      console.log(`[message] ${author} in ${channel}: ${message.content ?? '[no content]'}`);

      // fallback: respond to text command prefix !ping so we can test command logic without slash registration
      if (typeof message.content === 'string' && message.content.trim().toLowerCase() === '!ping') {
        try {
          await message.reply('Pong! (fallback)');
        } catch (err) {
          console.error('Failed to reply to !ping', err);
        }
      }
    } catch (err) {
      console.error('[message] could not log message', err);
    }
  },
};
