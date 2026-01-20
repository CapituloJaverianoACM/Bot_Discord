# Bot Discord (TypeScript + Bun)

Setup rápido

1. Instalar dependencias con Bun:

```powershell
bun install
```

2. Copiar `.env.example` a `.env` y rellenar valores reales.

3. Registrar comandos en tu servidor de prueba (usa DEPLOY_TARGET=test por defecto):

```powershell
bun run deploy:dev
```

4. Listar los comandos registrados en la guild de test (opcional):

```powershell
bun run commands:list
```

5. Ejecutar en desarrollo:

```powershell
bun run dev
```

## Comandos clave
- `/setup`: configura roles y canales (admin/junta). Ahora incluye canal de anuncios y rol de ping para eventos/anuncios.
- `/ticketmessage`: publica el mensaje para crear tickets (reacciona con 🎫).
- `/ticketclose`: cierra el ticket actual (solo junta/admin con permisos de canal).
- `/clear [value] [unit] [color]`: borra mensajes (mensajes u horas/días), responde público y se autodeletea.
- `/presence set|clear`: ajusta el presence (admin/junta) con tipo/estado/color.
- `/verify start|code`: verificación por correo (OTP) y asignación de rol verificado.
- `/announce`: publica un anuncio en el canal de anuncios configurado, con título/opcional ping/color.
- `/event create|cancel|list`: crea/cancela/lista eventos programados (external o voice), con ping opcional al rol de eventos.

## Funcionalidades
- Tickets por reacción: reacciona con 🎫 en el canal configurado, se crea categoría + canal de texto + VC con permisos para solicitante y junta.
- Bienvenida: envía embed de bienvenida al canal configurado (default general/system).
- Voz: canal VC CREATE mueve a VC libre (vc1/vc2) o crea VC temporal y lo limpia tras 5 minutos sin usuarios.
- Presence: solo por comando (no hay valor por defecto).

Notas
- Usa ramas `feature/*` para nuevas funcionalidades.
- CI: GitHub Actions ejecuta typecheck y lint en PRs.
