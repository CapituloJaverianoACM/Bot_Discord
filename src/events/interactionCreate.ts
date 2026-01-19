const EPHEMERAL_FLAG = 1 << 6; // Discord API flag for ephemeral responses

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: any) {
    try {
      const type = interaction.type ?? 'unknown';
      const name = interaction.commandName ?? interaction?.data?.name ?? 'unknown';
      const user = interaction.user
        ? `${interaction.user.tag} (${interaction.user.id})`
        : 'unknown';
      console.log(`[interaction] type=${type} name=${name} user=${user}`);

      if (typeof interaction.isChatInputCommand === 'function') {
        if (!interaction.isChatInputCommand()) return;
      } else if (typeof interaction.isCommand === 'function') {
        if (!interaction.isCommand()) return;
      } else {
        return;
      }

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`[interaction] Command not found: ${interaction.commandName}`);
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
        } catch (deferErr) {
          console.error('Failed to defer reply', deferErr);
        }
      }

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error('Command error', err);
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
          console.error('Failed to send error reply', replyErr);
        }
      }
    } catch (topErr) {
      console.error('Error in interactionCreate handler', topErr);
    }
  },
};
