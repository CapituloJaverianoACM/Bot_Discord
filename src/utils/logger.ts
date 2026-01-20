/**
 * @file logger.ts
 * @description Sistema centralizado de logging con request IDs, métricas de errores,
 * y alertas automáticas. Proporciona logging estructurado con contexto enriquecido,
 * máscara de datos sensibles, y tracking de error rate para monitoreo proactivo.
 */

import crypto from 'crypto';

/**
 * Niveles de logging disponibles
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

/**
 * Contexto opcional para enriquecer logs
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  guildId?: string;
  commandName?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Entrada de log estructurada
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Ventana de métricas de errores (5 minutos)
 */
interface ErrorWindow {
  total: number;
  errors: number;
}

/**
 * Métricas de errores agregadas
 */
export interface ErrorMetrics {
  errorRate: number;
  totalRequests: number;
  totalErrors: number;
  windowMinutes: number;
  topErrorCommands: Array<{ command: string; count: number }>;
  topErrorTypes: Array<{ type: string; count: number }>;
}

// Almacenamiento de métricas
const errorWindows = new Map<number, ErrorWindow>();
const errorsByCommand = new Map<string, number>();
const errorsByType = new Map<string, number>();

// Configuración
const WINDOW_SIZE_MS = 5 * 60 * 1000; // 5 minutos
const CLEANUP_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Obtiene la clave de ventana actual
 * @returns {number} Timestamp de la ventana (cada 5 minutos)
 */
function getCurrentWindow(): number {
  return Math.floor(Date.now() / WINDOW_SIZE_MS);
}

/**
 * Limpia ventanas antiguas (>15 minutos)
 */
function cleanupOldWindows() {
  const now = Date.now();
  const threshold = Math.floor((now - CLEANUP_THRESHOLD_MS) / WINDOW_SIZE_MS);

  for (const [windowKey] of errorWindows) {
    if (windowKey < threshold) {
      errorWindows.delete(windowKey);
    }
  }
}

/**
 * Registra una request en las métricas
 * @param {boolean} isError - Si la request resultó en error
 * @param {string} [commandName] - Nombre del comando ejecutado
 * @param {string} [errorType] - Tipo de error si aplica
 */
function recordRequest(isError: boolean, commandName?: string, errorType?: string) {
  const windowKey = getCurrentWindow();

  if (!errorWindows.has(windowKey)) {
    errorWindows.set(windowKey, { total: 0, errors: 0 });
  }

  const window = errorWindows.get(windowKey)!;
  window.total++;

  if (isError) {
    window.errors++;

    if (commandName) {
      errorsByCommand.set(commandName, (errorsByCommand.get(commandName) ?? 0) + 1);
    }

    if (errorType) {
      errorsByType.set(errorType, (errorsByType.get(errorType) ?? 0) + 1);
    }
  }

  // Limpieza periódica
  if (window.total % 50 === 0) {
    cleanupOldWindows();
  }
}

/**
 * Calcula el error rate actual (últimos 5 minutos)
 * @returns {number} Porcentaje de errores (0-100)
 */
export function getErrorRate(): number {
  const windowKey = getCurrentWindow();
  const window = errorWindows.get(windowKey);

  if (!window || window.total === 0) {
    return 0;
  }

  return (window.errors / window.total) * 100;
}

/**
 * Obtiene el total de requests en la ventana actual
 * @returns {number} Número de requests
 */
export function getRequestCount(): number {
  const windowKey = getCurrentWindow();
  const window = errorWindows.get(windowKey);
  return window?.total ?? 0;
}

/**
 * Obtiene el total de errores en la ventana actual
 * @returns {number} Número de errores
 */
export function getErrorCount(): number {
  const windowKey = getCurrentWindow();
  const window = errorWindows.get(windowKey);
  return window?.errors ?? 0;
}

/**
 * Verifica si el error rate supera el threshold
 * @param {number} threshold - Porcentaje límite (0-100)
 * @returns {boolean} True si supera el threshold
 */
export function checkErrorThreshold(threshold: number): boolean {
  const rate = getErrorRate();
  const count = getRequestCount();

  // Requiere al menos 10 requests para evitar falsos positivos
  if (count < 10) {
    return false;
  }

  return rate > threshold;
}

/**
 * Obtiene errores agrupados por comando
 * @returns {Map<string, number>} Map de comando -> cantidad de errores
 */
export function getErrorsByCommand(): Map<string, number> {
  return new Map(errorsByCommand);
}

/**
 * Obtiene errores agrupados por tipo
 * @returns {Map<string, number>} Map de tipo -> cantidad de errores
 */
export function getErrorsByType(): Map<string, number> {
  return new Map(errorsByType);
}

/**
 * Obtiene métricas completas de errores
 * @returns {ErrorMetrics} Métricas agregadas
 */
export function getErrorMetrics(): ErrorMetrics {
  const errorRate = getErrorRate();
  const totalRequests = getRequestCount();
  const totalErrors = getErrorCount();

  const topErrorCommands = Array.from(errorsByCommand.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([command, count]) => ({ command, count }));

  const topErrorTypes = Array.from(errorsByType.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    errorRate,
    totalRequests,
    totalErrors,
    windowMinutes: WINDOW_SIZE_MS / 60000,
    topErrorCommands,
    topErrorTypes,
  };
}

/**
 * Resetea las métricas de errores
 */
export function resetMetrics() {
  errorWindows.clear();
  errorsByCommand.clear();
  errorsByType.clear();
}

/**
 * Enmascara información sensible en un string
 * @param {string} text - Texto a enmascarar
 * @returns {string} Texto con datos sensibles ocultos
 * @example
 * maskSensitive("user@example.com") // "us***@example.com"
 * maskSensitive("token: abc123xyz789") // "token: abc123**"
 */
export function maskSensitive(text: string): string {
  if (!text) return text;

  // Máscara de emails: xx***@domain.com
  text = text.replace(/\b([a-zA-Z0-9])[a-zA-Z0-9._-]*@([a-zA-Z0-9.-]+)\b/g, (_, first, domain) => {
    return `${first}${first}***@${domain}`;
  });

  // Máscara de tokens (primeros 8 chars, resto con **)
  text = text.replace(
    /\b(token|key|secret|password)[:\s]+([a-zA-Z0-9]{8})[a-zA-Z0-9]+/gi,
    (_, prefix, start) => {
      return `${prefix}: ${start}**`;
    },
  );

  return text;
}

/**
 * Formatea una entrada de log
 * @param {LogLevel} level - Nivel del log
 * @param {string} message - Mensaje
 * @param {LogContext} [context] - Contexto opcional
 * @returns {string} Log formateado
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];

  let log = `[${timestamp}] [${levelName}] ${maskSensitive(message)}`;

  if (context && Object.keys(context).length > 0) {
    const contextStr = JSON.stringify(context, null, 2);
    log += `\n  Context: ${maskSensitive(contextStr)}`;
  }

  return log;
}

/**
 * Logger centralizado
 */
class Logger {
  /**
   * Log nivel DEBUG
   * @param {string} message - Mensaje
   * @param {LogContext} [context] - Contexto opcional
   */
  debug(message: string, context?: LogContext) {
    console.debug(formatLog(LogLevel.DEBUG, message, context));
    recordRequest(false, context?.commandName);
  }

  /**
   * Log nivel INFO
   * @param {string} message - Mensaje
   * @param {LogContext} [context] - Contexto opcional
   */
  info(message: string, context?: LogContext) {
    console.info(formatLog(LogLevel.INFO, message, context));
    recordRequest(false, context?.commandName);
  }

  /**
   * Log nivel WARN
   * @param {string} message - Mensaje
   * @param {LogContext} [context] - Contexto opcional
   */
  warn(message: string, context?: LogContext) {
    console.warn(formatLog(LogLevel.WARN, message, context));
    recordRequest(false, context?.commandName);
  }

  /**
   * Log nivel ERROR
   * @param {string} message - Mensaje
   * @param {LogContext} [context] - Contexto opcional
   */
  error(message: string, context?: LogContext) {
    console.error(formatLog(LogLevel.ERROR, message, context));
    const errorType = context?.errorType ?? 'UnknownError';
    recordRequest(true, context?.commandName, errorType);
  }

  /**
   * Log nivel CRITICAL
   * @param {string} message - Mensaje
   * @param {LogContext} [context] - Contexto opcional
   */
  critical(message: string, context?: LogContext) {
    console.error(formatLog(LogLevel.CRITICAL, message, context));
    const errorType = context?.errorType ?? 'CriticalError';
    recordRequest(true, context?.commandName, errorType);
  }
}

/**
 * Instancia singleton del logger
 */
export const logger = new Logger();

/**
 * Genera un request ID único
 * @returns {string} UUID v4
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
