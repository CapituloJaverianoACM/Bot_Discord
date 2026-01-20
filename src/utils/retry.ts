/**
 * @file retry.ts
 * @description Sistema de retry inteligente con exponential backoff.
 * Diferencia entre errores temporales (retriables) y permanentes.
 */

import { logger } from './logger';

/**
 * Opciones para retry con backoff
 */
export interface RetryOptions {
  maxAttempts: number;
  delays: number[];
  shouldRetry: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Ejecuta una función con reintentos y exponential backoff
 * @template T
 * @param {() => Promise<T>} fn - Función a ejecutar
 * @param {RetryOptions} options - Opciones de retry
 * @returns {Promise<T>} Resultado de la función
 * @throws {Error} Error original después de agotar reintentos
 * @example
 * const result = await retryWithBackoff(
 *   () => fetchData(),
 *   {
 *     maxAttempts: 3,
 *     delays: [2000, 4000, 8000],
 *     shouldRetry: isTemporaryError,
 *     onRetry: (attempt, err) => console.log(`Retry ${attempt}: ${err}`)
 *   }
 * );
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, delays, shouldRetry, onRetry } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      if (attempt > 1) {
        logger.info('Retry successful', { attempt, maxAttempts });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Si es el último intento, lanzar error
      if (attempt === maxAttempts) {
        logger.error('All retry attempts exhausted', {
          attempts: maxAttempts,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
        break;
      }

      // Verificar si debe reintentar
      if (!shouldRetry(error)) {
        logger.warn('Error is not retriable, failing immediately', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
        throw error;
      }

      // Calcular delay
      const delay = delays[attempt - 1] || delays[delays.length - 1];

      logger.warn('Retrying after error', {
        attempt,
        maxAttempts,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });

      // Callback de retry
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Esperar antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Agregar información de reintentos al error
  const enrichedError = new Error(
    `Failed after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
  (enrichedError as any).cause = lastError;
  (enrichedError as any).attempts = maxAttempts;

  throw enrichedError;
}

/**
 * Determina si un error es temporal y debe reintentar
 * @param {any} error - Error a evaluar
 * @returns {boolean} True si es error temporal
 */
export function isTemporaryError(error: any): boolean {
  if (!error) return false;

  // DOMException AbortError (timeout)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  // Error estándar con name
  if (error instanceof Error) {
    const temporaryNames = ['AbortError', 'NetworkError', 'TimeoutError', 'FetchError'];
    if (temporaryNames.includes(error.name)) {
      return true;
    }
  }

  // Códigos de error de Node.js (networking)
  if (typeof error === 'object' && error.code) {
    const temporaryCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNREFUSED',
      'NetworkingError',
    ];
    if (temporaryCodes.includes(error.code)) {
      return true;
    }
  }

  // Códigos HTTP temporales
  if (typeof error === 'object' && error.status) {
    const temporaryStatuses = [408, 429, 500, 502, 503, 504];
    if (temporaryStatuses.includes(error.status)) {
      return true;
    }
  }

  // Metadata de AWS SDK
  if (typeof error === 'object' && error.$metadata?.httpStatusCode) {
    const status = error.$metadata.httpStatusCode;
    const temporaryStatuses = [408, 429, 500, 502, 503, 504];
    if (temporaryStatuses.includes(status)) {
      return true;
    }
  }

  return false;
}

/**
 * Determina si un error es permanente y NO debe reintentar
 * @param {any} error - Error a evaluar
 * @returns {boolean} True si es error permanente
 */
export function isPermanentError(error: any): boolean {
  if (!error) return false;

  // Códigos de error SMTP de autenticación
  if (typeof error === 'object' && error.code) {
    const permanentCodes = ['EAUTH'];
    if (permanentCodes.includes(error.code)) {
      return true;
    }
  }

  // Códigos HTTP permanentes
  if (typeof error === 'object' && error.status) {
    const permanentStatuses = [400, 401, 403, 404, 422];
    if (permanentStatuses.includes(error.status)) {
      return true;
    }
  }

  // Metadata de AWS SDK
  if (typeof error === 'object' && error.$metadata?.httpStatusCode) {
    const status = error.$metadata.httpStatusCode;
    const permanentStatuses = [400, 401, 403, 404, 422];
    if (permanentStatuses.includes(status)) {
      return true;
    }
  }

  // Validación de email
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('invalid email') || message.includes('email inválido')) {
      return true;
    }
  }

  return false;
}
