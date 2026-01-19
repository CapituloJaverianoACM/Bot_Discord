import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { pathToFileURL } from 'url';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildIdTest = process.env.GUILD_ID_TEST;
const guildIdProd = process.env.GUILD_ID_PROD;
const deployTarget = process.env.DEPLOY_TARGET || 'test';
const targetGuild = (deployTarget === 'prod' ? guildIdProd : guildIdTest) as string | undefined;

if (!token || !clientId) {
  console.error('[deploy] Missing DISCORD_TOKEN or CLIENT_ID in environment');
  process.exit(1);
}

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

async function loadCommands() {
  const commandsPath = path.join(process.cwd(), 'src', 'commands');
  console.log(
    `[deploy] target=${deployTarget} guild=${targetGuild ?? 'not-set'} commandsPath=${commandsPath}`,
  );
  if (!fs.existsSync(commandsPath)) {
    console.error(`[deploy] commands path does not exist: ${commandsPath}`);
    return;
  }
  for (const file of fs.readdirSync(commandsPath)) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
    const filePath = path.join(commandsPath, file);
    try {
      const mod = await import(pathToFileURL(filePath).toString());
      const command = mod.default || mod;
      if (command && command.data) {
        const json =
          typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data;
        commands.push(json);
        console.log(`Loaded command for deploy: ${command.data.name}`);
      } else {
        console.warn(`[deploy] file ${file} has no command.data, skipping`);
      }
    } catch (err) {
      console.error(`Failed to import command file ${file}:`, err);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(token);

async function deploy() {
  await loadCommands();
  if (commands.length === 0) {
    console.error('[deploy] No commands loaded; aborting registration');
    process.exit(1);
  }
  if (!targetGuild) {
    console.error(`Guild id not set for target ${deployTarget}`);
    process.exit(1);
  }
  const guildId: string = targetGuild;
  const clientIdStr: string = clientId as string;
  try {
    console.log(
      `Registering ${commands.length} commands to ${deployTarget.toUpperCase()} guild ${guildId}`,
    );
    const res = await rest.put(Routes.applicationGuildCommands(clientIdStr, guildId), {
      body: commands,
    });
    console.log(
      'Registered commands response:',
      Array.isArray(res) ? `${(res as any).length} items` : typeof res,
    );
    console.log('Commands registered successfully');
    process.exit(0);
  } catch (err: any) {
    console.error('Failed to register commands');
    if (err?.rawError) console.error('rawError:', err.rawError);
    console.error(err);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').toString()) {
  deploy();
}

export default deploy;
