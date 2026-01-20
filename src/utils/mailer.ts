import nodemailer from 'nodemailer';
import type { TransportOptions as NodemailerTransportOptions } from 'nodemailer';
import { setTimeout as sleep } from 'timers/promises';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
  connectionTimeout: number;
  socketTimeout: number;
  greetingTimeout: number;
  pool: boolean;
  maxConnections: number;
  maxMessages: number;
  requireTLS: boolean;
  rejectUnauthorized: boolean;
}

interface HttpMailConfig {
  apiKey: string;
  apiUrl: string;
  from: string;
  timeoutMs: number;
}

function getConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !user || !pass || !from) {
    throw new Error(
      'SMTP configuration is missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM',
    );
  }
  const num = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const bool = (value: string | undefined, fallback: boolean) => {
    if (value === undefined) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  };
  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
    connectionTimeout: num(process.env.SMTP_CONNECTION_TIMEOUT, 10000),
    socketTimeout: num(process.env.SMTP_SOCKET_TIMEOUT, 10000),
    greetingTimeout: num(process.env.SMTP_GREETING_TIMEOUT, 10000),
    pool: bool(process.env.SMTP_POOL, true),
    maxConnections: num(process.env.SMTP_MAX_CONNECTIONS, 1),
    maxMessages: num(process.env.SMTP_MAX_MESSAGES, 20),
    requireTLS: bool(process.env.SMTP_REQUIRE_TLS, false),
    rejectUnauthorized: bool(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true),
  };
}

function getHttpConfig(): HttpMailConfig | null {
  const apiKey = process.env.SMTP_API_KEY;
  const from = process.env.SMTP_FROM;
  if (!apiKey || !from) return null;
  const apiUrl = process.env.SMTP_API_URL || 'https://api.smtp2go.com/v3/email/send';
  const timeoutMs = Number(process.env.SMTP_API_TIMEOUT_MS || 10000);
  return { apiKey, apiUrl, from, timeoutMs };
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${local.length > 2 ? '***' : ''}@${domain}`;
}

function describeSmtpError(err: unknown) {
  if (!err || typeof err !== 'object') {
    return {
      logMessage: 'Unknown SMTP error',
      userMessage: 'No se pudo enviar el correo (error desconocido).',
    };
  }
  const error = err as { code?: string; command?: string; responseCode?: number; message?: string };
  if (error.code === 'ETIMEDOUT') {
    return {
      logMessage: 'SMTP connection timed out',
      userMessage: 'No se pudo contactar con el servidor SMTP (timeout).',
    };
  }
  if (error.code === 'EAUTH') {
    return {
      logMessage: 'SMTP authentication failed',
      userMessage: 'Credenciales SMTP inválidas.',
    };
  }
  if (error.code === 'ECONNECTION') {
    return {
      logMessage: 'SMTP connection refused',
      userMessage: 'El servidor SMTP rechazó la conexión.',
    };
  }
  const base = error.message || 'Error SMTP no especificado.';
  return {
    logMessage: base,
    userMessage: base,
  };
}

type MailTransportOptions = NodemailerTransportOptions & {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  pool: boolean;
  maxConnections: number;
  maxMessages: number;
  connectionTimeout: number;
  socketTimeout: number;
  greetingTimeout: number;
  requireTLS: boolean;
  tls: {
    rejectUnauthorized: boolean;
  };
};

export async function sendOtpEmail(to: string, code: string) {
  const httpCfg = getHttpConfig();
  if (httpCfg) {
    return sendViaHttpApi(httpCfg, to, code);
  }

  const cfg = getConfig();
  const transportOptions: MailTransportOptions = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    pool: cfg.pool,
    maxConnections: cfg.maxConnections,
    maxMessages: cfg.maxMessages,
    connectionTimeout: cfg.connectionTimeout,
    socketTimeout: cfg.socketTimeout,
    greetingTimeout: cfg.greetingTimeout,
    requireTLS: cfg.requireTLS,
    tls: {
      rejectUnauthorized: cfg.rejectUnauthorized,
    },
  };
  const transporter = nodemailer.createTransport(transportOptions);

  const text = `Tu código de verificación es: ${code}`;
  const subject = 'Código de verificación';
  const startedAt = Date.now();

  try {
    const info = await transporter.sendMail({
      from: cfg.from,
      to,
      subject,
      text,
    });
    console.info(
      `[mailer] OTP sent to ${maskEmail(to)} via ${cfg.host}:${cfg.port} in ${Date.now() - startedAt}ms (id=${info.messageId})`,
    );
    return info;
  } catch (error) {
    const { logMessage, userMessage } = describeSmtpError(error);
    console.error(
      `[mailer] Failed to send OTP to ${maskEmail(to)} via ${cfg.host}:${cfg.port} after ${Date.now() - startedAt}ms - ${logMessage}`,
      error,
    );
    const wrapped = new Error(userMessage);
    (wrapped as any).cause = error;
    throw wrapped;
  }
}

async function sendViaHttpApi(cfg: HttpMailConfig, to: string, code: string) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  const payload = {
    api_key: cfg.apiKey,
    to: [to],
    sender: cfg.from,
    subject: 'Código de verificación',
    text_body: `Tu código de verificación es: ${code}`,
  };
  try {
    const res = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API email error ${res.status}: ${body?.slice(0, 200)}`);
    }
    const data = (await res.json()) as { data?: { message_id?: string; succeeded?: number } };
    console.info(
      `[mailer] OTP sent via HTTPS API to ${maskEmail(to)} in ${Date.now() - startedAt}ms (id=${data?.data?.message_id ?? 'n/a'})`,
    );
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('No se pudo enviar el correo (timeout API).');
    }
    console.error(
      `[mailer] HTTPS email send failed to ${maskEmail(to)} after ${Date.now() - startedAt}ms`,
      error,
    );
    throw error;
  } finally {
    clearTimeout(timer as any);
    await sleep(0); // yield event loop
  }
}
