import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface GuildConfig {
  guildId: string;
  roles: {
    admin?: string;
    junta?: string;
    verify?: string;
    verifyJaveriana?: string;
    // Roles de notificaciones
    laLiga?: string;
    preParciales?: string;
    cursos?: string;
    notificacionesGenerales?: string;
  };
  channels: {
    welcome?: string;
    ticketTrigger?: string;
    vcCreate?: string;
    vcPool?: string[];
    voiceCategory?: string;
    announcements?: string;
    alerts?: string;
  };
  ticketMessageId?: string;
  openTickets?: Record<string, { categoryId: string; textId?: string; voiceId?: string }>; // key: userId
  verificationEmails?: Record<string, string>; // email -> userId
  alertThreshold?: number; // Porcentaje de errores (0-100) que dispara alertas automáticas
}

interface ConfigFile {
  guilds: Record<string, GuildConfig>;
}

// Railway volume path (default: ./data for local dev)
const VOLUME_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || './data';
const CONFIG_FILE = path.join(VOLUME_PATH, 'config.json');

let cache: ConfigFile = { guilds: {} };

/**
 * Asegura que el directorio del volumen existe
 */
function ensureVolumeDirectory(): void {
  if (!fs.existsSync(VOLUME_PATH)) {
    fs.mkdirSync(VOLUME_PATH, { recursive: true });
    logger.info('Created volume directory', { path: VOLUME_PATH });
  }
}

/**
 * Carga la configuración desde el archivo JSON en el volumen
 * @returns {ConfigFile | null} Configuración cargada o null si hay error
 */
async function loadFromFile(): Promise<ConfigFile | null> {
  const startTime = Date.now();

  try {
    ensureVolumeDirectory();

    if (!fs.existsSync(CONFIG_FILE)) {
      logger.warn('No existing config file, starting fresh', {
        path: CONFIG_FILE,
        duration: Date.now() - startTime
      });
      return { guilds: {} };
    }

    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(data) as ConfigFile;
    const duration = Date.now() - startTime;

    logger.info('Config loaded from volume', {
      path: CONFIG_FILE,
      duration,
      guildsCount: Object.keys(parsed.guilds).length
    });

    return parsed;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.error('Failed to load config from volume', {
      path: CONFIG_FILE,
      duration,
      error: err.message ?? String(err),
      errorType: err.name ?? 'FileSystemError',
    });
    return null;
  }
}

/**
 * Guarda la configuración en el archivo JSON del volumen
 * @returns {Promise<void>}
 */
async function saveToFile(): Promise<void> {
  const startTime = Date.now();

  try {
    ensureVolumeDirectory();

    const json = JSON.stringify(cache, null, 2);
    fs.writeFileSync(CONFIG_FILE, json, 'utf-8');

    const duration = Date.now() - startTime;
    logger.info('Config saved to volume', {
      path: CONFIG_FILE,
      duration,
      guildsCount: Object.keys(cache.guilds).length,
      sizeBytes: Buffer.byteLength(json, 'utf-8')
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.error('Failed to save config to volume', {
      path: CONFIG_FILE,
      duration,
      error: err.message ?? String(err),
      errorType: err.name ?? 'FileSystemError',
    });
  }
}

const configReady = (async () => {
  logger.info('Initializing config system', { volumePath: VOLUME_PATH });
  const loaded = await loadFromFile();
  if (loaded) cache = loaded;
})();

await configReady;

export { configReady };

export function getGuildConfig(guildId: string): GuildConfig | undefined {
  return cache.guilds[guildId];
}

/**
 * Crea o actualiza la configuración de un servidor
 * Persiste automáticamente los cambios en el volumen
 * @param {GuildConfig} config - Configuración a guardar
 * @param {string} [requestId] - Request ID para logging
 * @returns {void}
 */
export function upsertGuildConfig(config: GuildConfig, requestId?: string) {
  cache.guilds[config.guildId] = config;
  logger.info('Guild config updated', { guildId: config.guildId, requestId });
  void saveToFile();
}

/**
 * Elimina la configuración de un servidor
 * Persiste automáticamente los cambios en el volumen
 * @param {string} guildId - ID del servidor
 * @param {string} [requestId] - Request ID para logging
 * @returns {boolean} True si se eliminó, false si no existía
 */
export function deleteGuildConfig(guildId: string, requestId?: string): boolean {
  if (!cache.guilds[guildId]) {
    logger.warn('Attempted to delete non-existent guild config', { guildId, requestId });
    return false;
  }

  delete cache.guilds[guildId];
  logger.info('Guild config deleted', { guildId, requestId });
  void saveToFile();
  return true;
}

