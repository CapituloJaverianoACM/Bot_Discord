import crypto from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OtpEntry {
  code: string;
  email: string;
  expiresAt: number;
}

// Map: guildId -> userId -> entry
const store = new Map<string, Map<string, OtpEntry>>();

export function generateOtp(guildId: string, userId: string, email: string): string {
  const code = crypto.randomInt(100000, 999999).toString();
  const entry: OtpEntry = {
    code,
    email,
    expiresAt: Date.now() + OTP_TTL_MS,
  };
  if (!store.has(guildId)) store.set(guildId, new Map());
  store.get(guildId)!.set(userId, entry);
  return code;
}

export function verifyOtp(
  guildId: string,
  userId: string,
  code: string,
): { ok: boolean; email?: string; reason?: string } {
  const g = store.get(guildId);
  if (!g) return { ok: false, reason: 'No OTP pending.' };
  const entry = g.get(userId);
  if (!entry) return { ok: false, reason: 'No OTP pending.' };
  if (Date.now() > entry.expiresAt) {
    g.delete(userId);
    return { ok: false, reason: 'OTP expirado.' };
  }
  if (entry.code !== code) return { ok: false, reason: 'OTP inválido.' };
  g.delete(userId);
  return { ok: true, email: entry.email };
}

export function pendingOtp(guildId: string, userId: string): OtpEntry | undefined {
  return store.get(guildId)?.get(userId);
}
