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

Notas
- Usa ramas `feature/*` para nuevas funcionalidades.
- CI: hay un workflow de GitHub Actions que valida typecheck y lint en PRs.
