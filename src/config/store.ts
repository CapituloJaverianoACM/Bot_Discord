import fs from 'fs';
import path from 'path';

export interface GuildConfig {
  guildId: string;
  roles: {
    admin?: string;
    junta?: string;
    verify?: string;
    eventPing?: string;
  };
  channels: {
    welcome?: string;
    ticketTrigger?: string;
    vcCreate?: string;
    vcPool?: string[];
    voiceCategory?: string;
    announcements?: string;
  };
  ticketMessageId?: string;
  openTickets?: Record<string, { categoryId: string; textId?: string; voiceId?: string }>; // key: userId
  verificationEmails?: Record<string, string>; // email -> userId
}

interface ConfigFile {
  guilds: Record<string, GuildConfig>;
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'config.json');

function ensureFile() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    const initial: ConfigFile = { guilds: {} };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

function readFile(): ConfigFile {
  ensureFile();
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as ConfigFile;
}

function writeFile(data: ConfigFile) {
  ensureFile();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getGuildConfig(guildId: string): GuildConfig | undefined {
  const file = readFile();
  return file.guilds[guildId];
}

export function upsertGuildConfig(config: GuildConfig) {
  const file = readFile();
  file.guilds[config.guildId] = config;
  writeFile(file);
}
