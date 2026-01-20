/**
 * @file index.ts
 * @description Punto de entrada principal del bot de Discord.
 * Inicializa el cliente, carga comandos y eventos, y establece la conexión con Discord.
 */

/**
 * Filtro personalizado para suprimir advertencias de depreciación específicas de Discord.js
 * Mantiene otras advertencias intactas mientras elimina el mensaje ruidoso sobre ready/clientReady.
 */
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

/**
 * @interface BotClient
 * @extends Client
 * @description Extensión del cliente de Discord.js con colección de comandos
 */
interface BotClient extends Client {
  /** Colección de comandos del bot indexados por nombre */
  commands: Collection<string, any>;
}

/**
 * Token de autenticación del bot obtenido de las variables de entorno
 */
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN not set in environment');
  process.exit(1);
}

/**
 * Cliente del bot con intents configurados para:
 * - Guilds (servidores)
 * - Miembros del servidor
 * - Mensajes de texto
 * - Contenido de mensajes
 * - Mensajes directos
 * - Estados de voz
 * - Reacciones a mensajes
 */
const client: BotClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
}) as BotClient;
client.commands = new Collection();

/**
 * Carga dinámica de comandos desde el directorio src/commands
 * Lee todos los archivos .ts/.js y registra los comandos válidos
 */
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

/**
 * Carga dinámica de eventos desde el directorio src/events
 * Registra los manejadores de eventos del bot
 */
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
