/**
 * @file rateLimit.ts
 * @description Sistema de rate limiting en memoria para prevenir spam y abuso.
 * Implementa cooldowns configurables con limpieza automática de entradas expiradas.
 */

/**
 * Resultado de verificación de rate limit
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingMs?: number;
}

/**
 * Información de rate limit para una key
 */
export interface RateLimitInfo {
  lastUsed: number;
  isActive: boolean;
}

// Almacenamiento en memoria: key -> timestamp de último uso
const rateLimits = new Map<string, number>();

// Intervalo de limpieza automática (5 minutos)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Verifica si una acción está permitida según el rate limit
 * @param {string} key - Clave única para el rate limit (formato: "action:guildId:userId")
 * @param {number} ttlMs - Tiempo de cooldown en milisegundos
 * @returns {RateLimitResult} Resultado con allowed y tiempo restante si bloqueado
 * @example
 * const result = checkRateLimit("verify:123456789:987654321", 30000);
 * if (!result.allowed) {
 *   console.log(`Wait ${result.remainingMs}ms`);
 * }
 */
export function checkRateLimit(key: string, ttlMs: number): RateLimitResult {
  const now = Date.now();
  const lastUsed = rateLimits.get(key);

  if (!lastUsed) {
    // Primera vez, permitir y registrar
    rateLimits.set(key, now);
    return { allowed: true };
  }

  const elapsed = now - lastUsed;

  if (elapsed >= ttlMs) {
    // Cooldown expirado, permitir y actualizar
    rateLimits.set(key, now);
    return { allowed: true };
  }

  // Aún en cooldown
  const remainingMs = ttlMs - elapsed;
  return { allowed: false, remainingMs };
}

/**
 * Obtiene información del rate limit para una key
 * @param {string} key - Clave del rate limit
 * @returns {RateLimitInfo} Información del rate limit
 */
export function getRateLimitInfo(key: string): RateLimitInfo {
  const lastUsed = rateLimits.get(key);

  if (!lastUsed) {
    return { lastUsed: 0, isActive: false };
  }

  return {
    lastUsed,
    isActive: true,
  };
}

/**
 * Limpia un rate limit específico (útil para testing o admin override)
 * @param {string} key - Clave del rate limit a limpiar
 */
export function clearRateLimit(key: string): void {
  rateLimits.delete(key);
}

/**
 * Limpia todas las entradas expiradas
 * @param {number} maxAge - Edad máxima en ms (doble del TTL típico)
 */
function cleanupExpired(maxAge: number = 120000): void {
  const now = Date.now();
  const threshold = now - maxAge;

  for (const [key, timestamp] of rateLimits) {
    if (timestamp < threshold) {
      rateLimits.delete(key);
    }
  }
}

/**
 * Obtiene el tamaño actual del almacén de rate limits
 * @returns {number} Número de entradas activas
 */
export function getRateLimitSize(): number {
  return rateLimits.size;
}

// Limpieza automática cada 5 minutos
setInterval(() => {
  cleanupExpired();
}, CLEANUP_INTERVAL_MS);
