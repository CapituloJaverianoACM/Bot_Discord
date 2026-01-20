import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID as string;
const guildIdTest = process.env.GUILD_ID_TEST;
const guildIdProd = process.env.GUILD_ID_PROD;
const target = process.env.DEPLOY_TARGET || 'test';
const targetGuild = target === 'prod' ? guildIdProd : guildIdTest;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN and CLIENT_ID must be set');
  process.exit(1);
}

/** Cliente REST de Discord */
const rest = new REST({ version: '10' }).setToken(token);

/**
 * Función principal que lista los comandos registrados
 * @returns {Promise<void>}
 */
async function main() {
  try {
    const guildId = targetGuild;
    if (!guildId) {
      console.error(`Guild id missing for target ${target}`);
      process.exit(1);
    }
    const cmds = (await rest.get(Routes.applicationGuildCommands(clientId, guildId))) as any[];
    console.log(`Commands in guild ${guildId} (target=${target}):`);
    for (const c of cmds) {
      console.log(`- ${c.name} (id=${c.id}) type=${c.type}`);
    }
    if (cmds.length === 0) console.log('(none)');
  } catch (err) {
    console.error('Error listing commands', err);
    process.exit(1);
  }
}

main();
