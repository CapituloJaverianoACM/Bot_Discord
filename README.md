# Bot Discord (TypeScript + Bun)

Setup rápido

1. Instalar dependencias con Bun:

```powershell
bun install
```

2. Copiar `.env.example` a `.env` y rellenar valores reales.

3. Registrar comandos en tu servidor de prueba:

```powershell
# usa DEPLOY_TARGET=test por defecto
DEPLOY_TARGET=test bun run src/deploy-commands.ts
```

4. Ejecutar en desarrollo:

```powershell
bun run src/index.ts
```

Notas
- Usa ramas `feature/*` para nuevas funcionalidades.
- CI: hay un workflow de GitHub Actions que valida build y lint en PRs.

