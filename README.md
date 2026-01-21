<div align="center">

# 🤖 ACM Bot - Discord

### Bot de Discord multipropósito con TypeScript, Bun y Railway

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-black?logo=bun)](https://bun.sh/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14.25-5865F2?logo=discord)](https://discord.js.org/)
[![Railway](https://img.shields.io/badge/Railway-Volume-blueviolet?logo=railway)](https://railway.app/)
[![License](https://img.shields.io/badge/License-Private-red)]()

</div>

---

## 📋 Tabla de Contenidos

- [✨ Características](#-características)
- [🚀 Inicio Rápido](#-inicio-rápido)
- [⚙️ Configuración](#️-configuración)
- [🎮 Comandos Disponibles](#-comandos-disponibles)
- [🎯 Funcionalidades](#-funcionalidades)
- [🛠️ Desarrollo](#️-desarrollo)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)

---

## ✨ Características

🎫 **Sistema de Tickets**
- Creación de tickets mediante reacciones (🎫)
- Canales privados de texto y voz por ticket
- Gestión completa por la junta directiva

🔐 **Verificación por Email**
- Sistema OTP (One-Time Password) de 6 dígitos
- Validación de correos electrónicos
- Prevención de reutilización de correos
- Soporte SMTP y HTTP API
- **Retry logic inteligente** (3 intentos automáticos)
- **Rate limiting** (30s cooldown)

🎤 **Voice Master**
- Canales de voz temporales personalizables
- Controles interactivos (nombre, límite, permisos)
- Auto-eliminación de canales vacíos
- Sistema LFM (Looking For More)

📢 **Sistema de Anuncios**
- Embeds personalizables con colores
- Notificaciones a roles específicos
- Canal dedicado para anuncios

📊 **Monitoreo y Métricas** ⭐ NUEVO
- Sistema de logging profesional con request IDs
- Métricas en tiempo real (error rate, latencia)
- **Alertas automáticas** al canal de admins
- Comando `/metrics` para visualización
- Tracking de errores por comando y tipo

💾 **Persistencia con Railway Volume** ⭐ NUEVO
- Almacenamiento en volumen local (latencia ~2ms)
- Sin dependencias externas (antes AWS S3)
- Configuración automática en Railway
- Backup y restauración sencillos

📅 **Gestión de Eventos**
- Creación de eventos programados
- Soporte para eventos externos y de voz
- Notificaciones automáticas

👋 **Bienvenida Automática**
- Mensajes de bienvenida personalizados
- Embeds elegantes
- Canal configurable

---

## 🚀 Inicio Rápido

### Prerequisitos

- [Bun](https://bun.sh/) instalado en tu sistema
- Cuenta de Discord Developer con una aplicación creada
- Servidor de Discord para pruebas

### Instalación

1. **Clonar el repositorio**
```powershell
git clone <repository-url>
cd Bot_Discord
```

2. **Instalar dependencias**
```powershell
bun install
```

3. **Configurar variables de entorno**
```powershell
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
```

4. **Registrar comandos en Discord**
```powershell
# Para servidor de pruebas
bun run deploy:dev

# Para servidor de producción
bun run deploy:prod
```

5. **Iniciar el bot**
```powershell
# Modo desarrollo
bun run dev

# Modo producción
bun run build
bun run start
```

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

```env
# Discord
DISCORD_TOKEN=tu_token_del_bot
CLIENT_ID=id_de_tu_aplicacion
GUILD_ID_TEST=id_servidor_pruebas
GUILD_ID_PROD=id_servidor_produccion

# SMTP (para verificación de email)
SMTP_API_KEY=tu_smtp_api_key
SMTP_API_URL=https://api.smtp2go.com/v3/email/send
SMTP_FROM=noreply@ejemplo.com
SMTP_API_TIMEOUT_MS=30000

# Railway Volume (auto-configurado en Railway, usa ./data en local)
RAILWAY_VOLUME_MOUNT_PATH=/data
```

> **💡 Para Railway:** Solo necesitas crear un Volume en Settings → Volumes con mount path `/data`. Railway configura la variable automáticamente.
>
> **💡 Para desarrollo local:** El bot crea automáticamente la carpeta `./data` en el directorio del proyecto.

### Configuración Inicial del Servidor

1. **Ejecutar el comando de setup**
```
/setup role_admin:@Admin role_junta:@Junta role_verify:@Verified ...
```

2. **Configurar los siguientes elementos:**
   - 👤 Roles: Admin, Junta, Verificado, Evento Ping
   - 📝 Canales: Bienvenida, Tickets, Anuncios, VC Create
   - 🎙️ Sistema de Voz: Pool de VCs y categoría

3. **Activar el sistema de tickets**
```
/ticketmessage
```

---

## 🎮 Comandos Disponibles

### 👑 Administración

| Comando | Descripción | Permisos |
|---------|-------------|----------|
| `/setup` | Configura roles y canales del bot | Administrador |
| `/config-reset confirmacion:CONFIRMAR` | ⚠️ Elimina toda la configuración | Guild Owner |
| `/presence set\|clear` | Configura la presencia del bot | Administrador |
| `/clear [valor] [unidad]` | Elimina mensajes (por cantidad o tiempo) | Manage Messages |

### 📊 Monitoreo ⭐ NUEVO

| Comando | Descripción | Permisos |
|---------|-------------|----------|
| `/metrics` | Muestra métricas en tiempo real | Admin/Junta |

**Métricas mostradas:** Error rate (🔴🟡🟢), requests/errors, uptime, rate limits, top errores

### 📢 Comunicación

| Comando | Descripción | Permisos |
|---------|-------------|----------|
| `/announce [mensaje] [título]` | Publica un anuncio oficial | Administrador |
| `/event create\|cancel\|list` | Gestiona eventos programados | Administrador |

### 🎫 Sistema de Tickets

| Comando | Descripción | Permisos |
|---------|-------------|----------|
| `/ticketmessage` | Publica el mensaje de tickets | Junta |
| `/ticketclose` | Cierra el ticket actual | Junta |

### 🔐 Verificación

| Comando | Descripción | Permisos |
|---------|-------------|----------|
| `/verify start [email]` | Inicia verificación (cooldown 30s) | Usuario |
| `/verify code [otp]` | Completa la verificación | Usuario |

**Mejoras:** Retry automático (3x), rate limiting, OTP 10min, logging completo

---

## 🎯 Funcionalidades

### 🎫 Sistema de Tickets

Los usuarios pueden crear tickets privados reaccionando con 🎫 al mensaje de tickets:

1. Se crea una categoría privada
2. Canal de texto para comunicación
3. Canal de voz para conversaciones
4. Solo visible para el solicitante y la junta

**Restricciones:**
- Un ticket por usuario simultáneamente
- Solo la junta puede cerrar tickets

### 🎤 Voice Master

Sistema de canales de voz temporales con controles completos:

**Características:**
- ✏️ Personalizar nombre del canal
- 👥 Establecer límite de usuarios
- 📊 Configurar estado personalizado
- 🎮 Marcar juego actual
- 🔒 Bloquear/Desbloquear canal
- ✅ Permitir usuarios/roles específicos
- ❌ Expulsar y bloquear usuarios
- 📨 Invitar usuarios por DM
- 🔍 Marcar como LFM (Looking For More)

**Uso:**
1. Unirse al canal "VC CREATE"
2. Se crea automáticamente un canal temporal
3. Usar los menús interactivos para configurar
4. El canal se elimina 5 minutos después de quedar vacío

### 🔐 Verificación por Email

Sistema de verificación en dos pasos:

1. **Iniciar verificación:** `/verify start [email]`
   - Se envía un código OTP de 6 dígitos
   - Válido por 10 minutos

2. **Confirmar código:** `/verify code [123456]`
   - Se asigna el rol de verificado
   - El correo se marca como usado

**Seguridad:**
- Códigos criptográficamente seguros
- Prevención de reutilización de correos
- Validación de formato de email
- Logs enmascarados para privacidad

### 📅 Eventos Programados

Crea eventos de Discord con opciones avanzadas:

**Tipos de eventos:**
- 🌐 **External:** Eventos fuera de Discord (requiere ubicación y fin)
- 🎤 **Voice:** Eventos en canales de voz del servidor

**Opciones:**
- Fecha y hora de inicio/fin
- Descripción detallada
- Ubicación (externos)
- Canal de voz (voz)
- Notificaciones a roles
- Embeds personalizados con colores

---

## 🛠️ Desarrollo

### Scripts Disponibles

```powershell
# Desarrollo
bun run dev              # Inicia el bot en modo desarrollo

# Producción
bun run build            # Compila TypeScript a JavaScript
bun run start            # Ejecuta el bot compilado

# Comandos
bun run deploy:dev       # Registra comandos en servidor de pruebas
bun run deploy:prod      # Registra comandos en servidor de producción
bun run commands:list    # Lista comandos registrados

# Code Quality
bun run lint             # Ejecuta ESLint
bun run typecheck        # Verifica tipos de TypeScript
```

### Estructura de Comandos

Crear un nuevo comando en `src/commands/`:

```typescript
/**
 * @file mi-comando.ts
 * @description Descripción breve del comando
 */

import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('mi-comando')
  .setDescription('Descripción del comando')
  .addStringOption(opt => 
    opt.setName('opcion')
      .setDescription('Una opción')
      .setRequired(true)
  );

async function execute(interaction: any) {
  // Lógica del comando
  await interaction.reply('¡Comando ejecutado!');
}

export default { data, execute };
```

### Estructura de Eventos

Crear un nuevo evento en `src/events/`:

```typescript
/**
 * @file mi-evento.ts
 * @description Descripción del evento
 */

export default {
  name: 'eventName',
  once: false,
  async execute(...args: any[]) {
    // Lógica del evento
  },
};
```

---

## 📁 Estructura del Proyecto

```
Bot_Discord/
├── src/
│   ├── commands/          # Comandos slash del bot
│   │   ├── announce.ts    # Sistema de anuncios
│   │   ├── clear.ts       # Limpieza de mensajes
│   │   ├── event.ts       # Gestión de eventos
│   │   ├── ping.ts        # Comando de latencia
│   │   ├── presence.ts    # Configuración de presencia
│   │   ├── setup.ts       # Configuración inicial
│   │   ├── ticket-*.ts    # Sistema de tickets
│   │   └── verify.ts      # Verificación por email
│   ├── events/            # Eventos de Discord
│   │   ├── ready.ts       # Bot listo
│   │   ├── interactionCreate.ts  # Interacciones
│   │   ├── messageCreate.ts      # Mensajes
│   │   ├── messageReactionAdd.ts # Reacciones
│   │   ├── guildMemberAdd.ts     # Nuevos miembros
│   │   └── voiceStateUpdate.ts   # Cambios de voz
│   ├── utils/             # Utilidades
│   │   ├── embed.ts       # Constructor de embeds
│   │   ├── mailer.ts      # Sistema de correos
│   │   ├── otp.ts         # Generación de OTPs
│   │   ├── voiceMasterState.ts   # Estado de VCs
│   │   └── verifyRequest.ts      # Verificación
│   ├── config/            # Configuración
│   │   └── store.ts       # Almacenamiento (S3)
│   ├── index.ts           # Punto de entrada
│   ├── deploy-commands.ts # Registro de comandos
│   └── list-commands.ts   # Listar comandos
├── config/
│   └── config.json        # Configuración local
├── package.json           # Dependencias
├── tsconfig.json          # Configuración TypeScript
├── .env                   # Variables de entorno
└── README.md             # Este archivo
```

---

## 📝 Notas

- **Branches:** Usa `feature/*` para nuevas funcionalidades
- **CI/CD:** GitHub Actions ejecuta typecheck y lint en PRs
- **Persistencia:** Configuración almacenada en S3 o localmente
- **Logs:** Todos los eventos importantes se registran en consola
- **Seguridad:** Información sensible enmascarada en logs

---

<div align="center">

### 🌟 ¡Disfruta usando el bot! 🌟

</div>
