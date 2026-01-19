import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!');

async function execute(interaction: any) {
  // If we already deferred, edit the deferred reply; otherwise send a normal reply
  const respond =
    interaction.deferred || interaction.replied
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);

  const sent = await respond({ content: 'Pong!' });
  // sent is the Message when replying; after editReply, fetch it explicitly if not returned
  const message = sent ?? (await interaction.fetchReply());
  const time = message.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(`Pong! Roundtrip time: ${time}ms`);
}

export default { data, execute };
