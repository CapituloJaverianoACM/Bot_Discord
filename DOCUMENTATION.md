# 📚 Resumen de Documentación

## ✅ Archivos Documentados

Este documento resume la documentación agregada a todo el proyecto del Bot de Discord.

---

## 🗂️ Archivos Principales

### 📄 `src/index.ts`
**Punto de entrada del bot**
- ✅ Documentación del módulo y su propósito
- ✅ JSDoc para interfaces (`BotClient`)
- ✅ Comentarios sobre filtro de advertencias
- ✅ Documentación de variables clave (token, client)
- ✅ Explicación del sistema de carga de comandos
- ✅ Explicación del sistema de carga de eventos

### 📄 `src/deploy-commands.ts`
**Script de deployment de comandos**
- ✅ Descripción del archivo y su uso
- ✅ Documentación de variables de configuración
- ✅ JSDoc para función `loadCommands()`
- ✅ JSDoc para función `deploy()`
- ✅ Ejemplos de uso en comentarios

### 📄 `src/list-commands.ts`
**Utilidad para listar comandos**
- ✅ Descripción del propósito del script
- ✅ Documentación de variables
- ✅ JSDoc para función `main()`
- ✅ Instrucciones de uso

---

## 🎮 Comandos

### 📄 `src/commands/announce.ts`
**Sistema de anuncios**
- ✅ Descripción del comando y sus capacidades
- ✅ JSDoc para función `execute()`
- ✅ Documentación de opciones del comando

### 📄 `src/commands/clear.ts`
**Limpieza de mensajes**
- ✅ Descripción completa del sistema de limpieza
- ✅ Documentación de flags y constantes
- ✅ JSDoc para función `execute()`
- ✅ Explicación de unidades (mensajes/horas/días)

### 📄 `src/commands/event.ts`
**Gestión de eventos programados**
- ✅ Descripción del sistema de eventos
- ✅ Documentación de tipos de eventos (external/voice)
- ✅ JSDoc para función `execute()`
- ✅ Documentación de subcomandos

### 📄 `src/commands/ping.ts`
**Comando de latencia**
- ✅ Descripción simple y clara
- ✅ JSDoc para función `execute()`
- ✅ Explicación del cálculo de roundtrip time

### 📄 `src/commands/presence.ts`
**Configuración de presencia**
- ✅ Descripción de rich presence
- ✅ JSDoc para función `execute()`
- ✅ Documentación de tipos de actividad
- ✅ Explicación de estados

### 📄 `src/commands/setup.ts`
**Configuración inicial del servidor**
- ✅ Descripción completa del comando
- ✅ Lista de elementos configurables
- ✅ JSDoc para función `execute()`
- ✅ Documentación de roles y canales

### 📄 `src/commands/ticket-close.ts`
**Cierre de tickets**
- ✅ Descripción del sistema de cierre
- ✅ JSDoc para función `execute()`
- ✅ Documentación de permisos requeridos

### 📄 `src/commands/ticket-message.ts`
**Publicación de mensaje de tickets**
- ✅ Descripción del sistema de tickets
- ✅ JSDoc para función `execute()`
- ✅ Explicación del emoji 🎫

### 📄 `src/commands/verify.ts`
**Verificación por email**
- ✅ Descripción del proceso de dos pasos
- ✅ JSDoc para función `maskEmail()`
- ✅ JSDoc para función `execute()`
- ✅ Documentación de subcomandos (start/code)
- ✅ Explicación de prevención de reutilización

---

## 🎭 Eventos

### 📄 `src/events/ready.ts`
**Evento de bot listo**
- ✅ Descripción del evento
- ✅ JSDoc para el manejador
- ✅ Documentación de propiedades (name, once, execute)

### 📄 `src/events/guildMemberAdd.ts`
**Evento de nuevo miembro**
- ✅ Descripción del sistema de bienvenida
- ✅ JSDoc para el manejador
- ✅ Explicación del envío de embeds

### 📄 `src/events/messageCreate.ts`
**Evento de creación de mensaje**
- ✅ Descripción del evento
- ✅ JSDoc para el manejador
- ✅ Documentación del comando fallback !ping

### 📄 `src/events/messageReactionAdd.ts`
**Evento de reacción agregada**
- ✅ Descripción del sistema de tickets
- ✅ JSDoc para el manejador
- ✅ Explicación del proceso de creación de tickets
- ✅ Documentación de permisos y categorías

### 📄 `src/events/voiceStateUpdate.ts`
**Evento de cambio de estado de voz**
- ✅ Descripción completa del sistema Voice Master
- ✅ JSDoc para función `scheduleCleanup()`
- ✅ JSDoc para función `buildControls()`
- ✅ JSDoc para el manejador principal
- ✅ Documentación del tiempo de limpieza (5 minutos)

### 📄 `src/events/interactionCreate.ts`
**Evento de interacción**
- ✅ Descripción completa del manejador
- ✅ JSDoc para función `handleVoiceMasterSelect()`
- ✅ JSDoc para función `handleVoiceMasterModal()`
- ✅ JSDoc para función `applyPermit()`
- ✅ JSDoc para función `applyReject()`
- ✅ JSDoc para función `applyInvite()`
- ✅ JSDoc para función `showModal()`
- ✅ JSDoc para función `showSelector()`
- ✅ JSDoc para función `updateControlStatus()`
- ✅ Documentación de flags efímeros

---

## 🛠️ Utilidades

### 📄 `src/utils/embed.ts`
**Constructor de embeds**
- ✅ Descripción del módulo
- ✅ JSDoc para interface `EmbedOptions`
- ✅ JSDoc para función `buildEmbed()`
- ✅ JSDoc para función `parseHexColor()`
- ✅ Ejemplos en comentarios

### 📄 `src/utils/otp.ts`
**Sistema de códigos OTP**
- ✅ Descripción completa del sistema
- ✅ JSDoc para interface `OtpEntry`
- ✅ JSDoc para función `generateOtp()`
- ✅ JSDoc para función `verifyOtp()`
- ✅ JSDoc para función `pendingOtp()`
- ✅ JSDoc para función `clearOtp()`
- ✅ Documentación del TTL (10 minutos)

### 📄 `src/utils/mailer.ts`
**Sistema de envío de correos**
- ✅ Descripción completa del módulo
- ✅ Documentación de métodos soportados (SMTP/HTTP)
- ✅ JSDoc para interface `SmtpConfig`
- ✅ JSDoc para interface `HttpMailConfig`
- ✅ JSDoc para función `getConfig()`
- ✅ JSDoc para función `getHttpConfig()`
- ✅ JSDoc para función `maskEmail()`
- ✅ JSDoc para función `describeSmtpError()`
- ✅ JSDoc para función `sendOtpEmail()`
- ✅ JSDoc para función `sendViaHttpApi()`
- ✅ Documentación de variables de entorno

### 📄 `src/utils/voiceMasterState.ts`
**Gestión de estado de canales de voz**
- ✅ Descripción del módulo
- ✅ JSDoc para interface `VoiceMasterState`
- ✅ JSDoc para función `setVoiceState()`
- ✅ JSDoc para función `getVoiceState()`
- ✅ JSDoc para función `clearVoiceState()`
- ✅ Documentación del almacén en memoria

### 📄 `src/utils/verifyRequest.ts`
**Verificación de requests**
- ✅ Descripción del placeholder
- ✅ JSDoc para función `verifyRequestPlaceholder()`
- ✅ Nota @todo para futura implementación

---

## 🔍 Monitoreo y Logging

### 📄 `src/utils/logger.ts`
**Sistema centralizado de logging**
- ✅ Descripción completa del sistema de logging profesional
- ✅ JSDoc para enum `LogLevel` (DEBUG/INFO/WARN/ERROR/CRITICAL)
- ✅ JSDoc para interface `LogContext` (requestId, userId, guildId, commandName, duration)
- ✅ JSDoc para interface `LogEntry` (timestamp, level, message, context)
- ✅ JSDoc para interface `ErrorWindow` (total, errors)
- ✅ JSDoc para interface `ErrorMetrics` (errorRate, totalRequests, totalErrors, topErrorCommands, topErrorTypes)
- ✅ JSDoc para función `getErrorRate()` - Calcula porcentaje de errores en ventana de 5 minutos
- ✅ JSDoc para función `getRequestCount()` - Obtiene total de requests en ventana actual
- ✅ JSDoc para función `getErrorCount()` - Obtiene total de errores en ventana actual
- ✅ JSDoc para función `checkErrorThreshold(threshold)` - Verifica si supera threshold (requiere min 10 requests)
- ✅ JSDoc para función `getErrorsByCommand()` - Map de comando -> cantidad de errores
- ✅ JSDoc para función `getErrorsByType()` - Map de tipo de error -> cantidad
- ✅ JSDoc para función `getErrorMetrics()` - Métricas completas agregadas
- ✅ JSDoc para función `resetMetrics()` - Limpia todas las métricas
- ✅ JSDoc para función `maskSensitive(text)` - Enmascara emails y tokens automáticamente
- ✅ JSDoc para función `generateRequestId()` - Genera UUID v4 único
- ✅ JSDoc para clase `Logger` con métodos debug/info/warn/error/critical
- ✅ Documentación del sistema de ventanas deslizantes (5 min)
- ✅ Documentación de limpieza automática (>15 min)
- ✅ Ejemplo: `logger.info('User verified', {requestId, userId, email: maskEmail(email)})`

### 📄 `src/utils/rateLimit.ts`
**Sistema de rate limiting**
- ✅ Descripción del sistema en memoria
- ✅ JSDoc para interface `RateLimitResult` (allowed, remainingMs)
- ✅ JSDoc para interface `RateLimitInfo` (lastUsed, isActive)
- ✅ JSDoc para función `checkRateLimit(key, ttlMs)` - Valida cooldowns y retorna estado
- ✅ JSDoc para función `getRateLimitInfo(key)` - Obtiene info de rate limit
- ✅ JSDoc para función `clearRateLimit(key)` - Limpia rate limit específico (testing/admin)
- ✅ JSDoc para función `getRateLimitSize()` - Número de entradas activas
- ✅ Documentación de limpieza automática cada 5 minutos
- ✅ Documentación de formato de keys: `action:guildId:userId`
- ✅ Ejemplo: `checkRateLimit("verify:123456789:987654321", 30000)`

### 📄 `src/utils/retry.ts`
**Sistema de retry inteligente**
- ✅ Descripción del sistema con exponential backoff
- ✅ JSDoc para interface `RetryOptions` (maxAttempts, delays, shouldRetry, onRetry)
- ✅ JSDoc para función `retryWithBackoff(fn, options)` - Ejecuta con reintentos y backoff
- ✅ JSDoc para función `isTemporaryError(error)` - Detecta errores retriables (network, timeout, 5xx)
- ✅ JSDoc para función `isPermanentError(error)` - Detecta errores permanentes (auth, 4xx)
- ✅ Documentación de errores temporales: AbortError, NetworkError, TimeoutError, ECONNRESET, ETIMEDOUT, códigos HTTP 408/429/500-504
- ✅ Documentación de errores permanentes: EAUTH, códigos HTTP 400/401/403/404/422, validación de email
- ✅ Documentación de propagación de error original con contexto enriquecido
- ✅ Ejemplo: `retryWithBackoff(() => fetchData(), {maxAttempts: 3, delays: [2000, 4000, 8000], shouldRetry: isTemporaryError})`

### 📄 `src/utils/alerts.ts`
**Sistema de alertas a Discord**
- ✅ Descripción del sistema de notificaciones a admins
- ✅ JSDoc para type `AlertSeverity` (info/warning/critical)
- ✅ JSDoc para interface `AlertOptions` (title, description, severity, fields, timestamp)
- ✅ JSDoc para función `sendAdminAlert(client, guildId, options)` - Envía alerta al canal configurado
- ✅ Documentación de colores por severidad: azul (#5865F2) info, naranja (#F59E0B) warning, rojo (#EF4444) critical
- ✅ Documentación de emojis por severidad: ℹ️ info, ⚠️ warning, 🚨 critical
- ✅ Documentación de rate limiting interno (1 alerta del mismo tipo cada 10 minutos)
- ✅ Documentación de fallback: canal alerts > announcements
- ✅ Documentación de validación de permisos (ViewChannel, SendMessages, EmbedLinks)
- ✅ JSDoc para función `hashAlertKey(title)` - Hash MD5 para rate limiting
- ✅ JSDoc para función `clearAlertHistory()` - Limpia historial (testing)
- ✅ Ejemplo: `sendAdminAlert(client, "123", {title: "High Error Rate", description: "25% errors", severity: "warning", fields: [...]})`

---

## 📊 Comandos de Administración

### 📄 `src/commands/metrics.ts`
**Visualización de métricas en tiempo real**
- ✅ Descripción del comando de estadísticas
- ✅ JSDoc para función `formatDuration(ms)` - Convierte ms a formato legible (días/horas/minutos)
- ✅ JSDoc para función `execute(interaction)` - Muestra métricas del bot
- ✅ Documentación de permisos requeridos: Administrator o rol admin/junta
- ✅ Documentación de métricas mostradas:
  - Error rate con emoji según severidad (🔴 >20%, 🟡 >10%, 🟢 <10%)
  - Total requests/errors en ventana de 5 minutos
  - Uptime del bot formateado
  - Rate limits activos
  - Ping del websocket
  - Top comandos con errores
  - Top tipos de errores
- ✅ Documentación de respuesta efímera (solo visible para quien ejecuta)
- ✅ Ejemplo de uso: `/metrics` muestra embed con todas las estadísticas

---

## ⚙️ Configuración

### 📄 `src/commands/setup.ts`
**Configuración del servidor**
- ✅ Documentación ampliada con nuevas opciones
- ✅ Nueva opción `channel_alerts` (opcional) - Canal para alertas del sistema
- ✅ Nueva opción `alert_threshold` (opcional, 10-50, default: 20) - % de errores para alertar
- ✅ Documentación de validación de threshold (mínimo 10%, máximo 50%)
- ✅ Actualización de embed de confirmación mostrando canal de alertas y threshold
- ✅ Ejemplo: `/setup ... channel_alerts:#alertas alert_threshold:25`

### 📄 `src/commands/verify.ts`
**Sistema de verificación por email**
- ✅ Documentación actualizada con mejoras de producción
- ✅ Rate limiting: 30s cooldown entre intentos de `/verify start`
- ✅ Retry logic del mailer: 3 intentos con delays de 2s, 4s, 8s
- ✅ Request IDs únicos para rastrear flujo completo de verificación
- ✅ Logging estructurado en cada paso (start, email send, code verify, role assign)
- ✅ OTP persistente en caso de error de email (permite reintentos)
- ✅ Defer automático vía handler global (elimina race conditions)
- ✅ Validación de estado de interacción antes de cada respuesta
- ✅ Propagación de requestId a mailer y store para logging correlacionado
- ✅ Ejemplo de flujo: User → /verify start → Rate limit check → Generate OTP → Send email (retry 3x) → Log success

### 📄 `src/config/store.ts`
**Sistema de almacenamiento**
- ✅ Descripción completa del sistema
- ✅ JSDoc para interface `GuildConfig`
- ✅ Nuevo campo `channels.alerts` - ID del canal de alertas administrativas
- ✅ Nuevo campo `alertThreshold` - Porcentaje de error rate (0-100) para alertas automáticas
- ✅ JSDoc para interface `ConfigFile`
- ✅ Documentación de variables de AWS S3
- ✅ JSDoc para función `streamToString()`
- ✅ JSDoc actualizado para función `loadFromBucket()` - Incluye logging con métricas de latencia
- ✅ JSDoc actualizado para función `saveToBucket()` - Incluye logging con métricas de latencia
- ✅ JSDoc para función `getGuildConfig()`
- ✅ JSDoc actualizado para función `upsertGuildConfig(config, requestId?)` - Acepta requestId opcional
- ✅ Explicación del sistema de caché
- ✅ Logging de operaciones S3 con códigos HTTP y duración

---

## 🎯 Eventos

### 📄 `src/events/interactionCreate.ts`
**Handler principal de interacciones**
- ✅ Documentación actualizada con sistema de monitoreo
- ✅ Generación de requestId único para cada interacción
- ✅ Inyección de requestId en objeto interaction
- ✅ Logging estructurado con contexto completo (type, commandName, userId, guildId, requestId)
- ✅ Contador de interacciones para verificar error threshold cada 10 interacciones
- ✅ Sistema de alertas automáticas cuando error rate supera threshold configurado
- ✅ Envío de alerta con métricas detalladas: error rate, requests, errors, top commands, window
- ✅ Defer automático para comandos con flag `defer: true`
- ✅ Logging de éxito/error de ejecución de comandos
- ✅ Manejo robusto de errores con logging estructurado
- ✅ Nivel CRITICAL para errores en el handler principal
