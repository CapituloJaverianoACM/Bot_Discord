// Filter a specific Discord.js deprecation warning about the ready/clientReady rename.
// This keeps other warnings intact while removing this noisy message.
const _origEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning: any, ...args: any[]) => {
  try {
    const text = typeof warning === 'string' ? warning : warning?.toString?.();
    if (
      typeof text === 'string' &&
      text.includes('The ready event has been renamed to clientReady')
    ) {
      return undefined; // swallow this specific deprecation
    }
  } catch (e) {
    // fall through to original emitter on any error
  }
  return _origEmitWarning(warning, ...args);
};

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

interface BotClient extends Client {
  commands: Collection<string, any>;
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN not set in environment');
  process.exit(1);
}

// Add message-related intents so the bot receives message events and content
const client: BotClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
}) as BotClient;
client.commands = new Collection();

// Load commands
const commandsPath = path.join(process.cwd(), 'src', 'commands');
for (const file of fs.readdirSync(commandsPath)) {
  if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
  const filePath = path.join(commandsPath, file);
  try {
    const mod = await import(pathToFileURL(filePath).toString());
    const command = mod.default || mod;
    if (command && command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    }
  } catch (err) {
    console.error(`Failed to load command ${file}`, err);
  }
}

// Load events
const eventsPath = path.join(process.cwd(), 'src', 'events');
for (const file of fs.readdirSync(eventsPath)) {
  if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
  const filePath = path.join(eventsPath, file);
  try {
    const mod = await import(pathToFileURL(filePath).toString());
    const event = mod.default || mod;
    if (event && event.name && event.execute) {
      const names = Array.isArray(event.name) ? event.name : [event.name];
      for (const name of names) {
        if (event.once) client.once(name, (...args: any[]) => event.execute(...args));
        else client.on(name, (...args: any[]) => event.execute(...args));
      }
      console.log(`Loaded event: ${file}`);
    }
  } catch (err) {
    console.error(`Failed to load event ${file}`, err);
  }
}

client.login(token).catch((err) => {
  console.error('Failed to login:', err);
  process.exit(1);
});

export default client;
