import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

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
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const text = await streamToString(res.Body);
    const parsed = JSON.parse(text) as ConfigFile;
    console.info(`[config] loaded from bucket ${bucket}/${key}`);
    return parsed;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) {
      console.warn(`[config] no existing config in bucket ${bucket}/${key}, starting fresh`);
      return { guilds: {} };
    }
    console.error('[config] failed to load from bucket', err);
    return null;
  }
}

async function saveToBucket(): Promise<void> {
  if (!s3 || !bucket) return;
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
    console.info(`[config] saved to bucket ${bucket}/${key}`);
  } catch (err) {
    console.error('[config] failed to save to bucket', err);
  }
}

const configReady = (async () => {
  if (!s3 || !bucket) {
    console.warn('[config] AWS_S3_BUCKET_NAME not set; using in-memory config only');
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
 * @returns {void}
 */
export function upsertGuildConfig(config: GuildConfig) {
  cache.guilds[config.guildId] = config;
  void saveToBucket();
}
