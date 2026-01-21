import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { logger } from '../utils/logger';

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

const bucket = process.env.AWS_S3_BUCKET_NAME;
const key = process.env.CONFIG_KEY || 'config/config.json';
const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
const endpoint = process.env.AWS_ENDPOINT_URL;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = bucket
  ? new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    })
  : null;

let cache: ConfigFile = { guilds: {} };

async function streamToString(body: any): Promise<string> {
  if (!body) return '';
  if (typeof body.transformToString === 'function') return body.transformToString();
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
  }
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  return String(body);
}

async function loadFromBucket(): Promise<ConfigFile | null> {
  if (!s3 || !bucket) return null;
  const startTime = Date.now();
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const text = await streamToString(res.Body);
    const parsed = JSON.parse(text) as ConfigFile;
    const duration = Date.now() - startTime;
    logger.info(`Config loaded from S3 bucket`, { bucket, key, duration });
    return parsed;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    if (err?.$metadata?.httpStatusCode === 404) {
      logger.warn(`No existing config in bucket, starting fresh`, { bucket, key, duration });
      return { guilds: {} };
    }
    logger.error('Failed to load config from S3', {
      bucket,
      key,
      duration,
      error: err.message ?? String(err),
      errorType: err.name ?? 'S3Error',
      httpStatus: err.$metadata?.httpStatusCode,
    });
    return null;
  }
}

async function saveToBucket(): Promise<void> {
  if (!s3 || !bucket) return;
  const startTime = Date.now();
  try {
    const body = JSON.stringify(cache, null, 2);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
      }),
    );
    const duration = Date.now() - startTime;
    logger.info('Config saved to S3 bucket', { bucket, key, duration });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.error('Failed to save config to S3', {
      bucket,
      key,
      duration,
      error: err.message ?? String(err),
      errorType: err.name ?? 'S3Error',
      httpStatus: err.$metadata?.httpStatusCode,
    });
  }
}

const configReady = (async () => {
  if (!s3 || !bucket) {
    logger.warn('AWS_S3_BUCKET_NAME not set; using in-memory config only');
    return;
  }
  const loaded = await loadFromBucket();
  if (loaded) cache = loaded;
})();

await configReady;

export { configReady };

export function getGuildConfig(guildId: string): GuildConfig | undefined {
  return cache.guilds[guildId];
}

/**
 * Crea o actualiza la configuración de un servidor
 * Persiste automáticamente los cambios en S3
 * @param {GuildConfig} config - Configuración a guardar
 * @param {string} [requestId] - Request ID para logging
 * @returns {void}
 */
export function upsertGuildConfig(config: GuildConfig, requestId?: string) {
  cache.guilds[config.guildId] = config;
  logger.info('Guild config updated', { guildId: config.guildId, requestId });
  void saveToBucket();
}

/**
 * Elimina la configuración de un servidor
 * Persiste automáticamente los cambios en S3
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
  void saveToBucket();
  return true;
}

