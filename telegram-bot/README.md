# Bot de Telegram — TACS

Cliente REST del backend. No implementa lógica de negocio; consume la API existente vía long polling (grammY).

## Variables de entorno
- `TELEGRAM_BOT_TOKEN` — token de @BotFather (obligatorio).
- `BACKEND_URL` — URL del backend (default `http://localhost:8080`; en docker `http://backend:8080`).
- `NOTIF_POLL_MS` — intervalo del poller de notificaciones en ms (default `30000`).

## Correr con Docker (recomendado)
Con `TELEGRAM_BOT_TOKEN` en el `.env` de la raíz del repo:
```bash
docker compose up --build telegram-bot
```

## Correr local (dev)
```bash
cd telegram-bot
cp ../.env.example .env   # y completar TELEGRAM_BOT_TOKEN y BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

## Tests
```bash
npm test        # Vitest (unitarios: apis, formatters, flujos, comandos, poller)
npm run build   # tsc (type-check + compilación a dist/)
```

## Comandos del bot

**Sesión**
- `/login` — iniciar sesión (paso a paso; borra el mensaje de la contraseña)
- `/logout` — cerrar sesión
- `/whoami` — ver la sesión actual

**Figuritas**
- `/buscar <texto>` — buscar figuritas disponibles (catálogo, con filtro por texto)
- `/miscoleccion` — ver tu colección
- `/faltantes` — figuritas que te faltan
- `/repetidas` — tus figuritas repetidas
- `/publicar` — publicar una figurita repetida (US1)

**Intercambios**
- `/solicitudes` — solicitudes recibidas y enviadas
- `/proponer` — proponer un intercambio por una figurita publicada (US5)
- `/aceptar <n>` / `/rechazar <n>` — sobre la n-ésima solicitud recibida (US9)

**Subastas**
- `/subastas` — subastas activas
- `/ofertar` — ofertar en una subasta con figuritas propias (US7)

**Notificaciones**
- `/notificaciones` — ver tus notificaciones
- Push automático: el bot te avisa de notificaciones nuevas mientras tengas sesión iniciada.

## Arquitectura (breve)
- `api/` — cliente HTTP (`client.ts`) + un módulo por recurso; adjunta el JWT y mapea errores a `ApiError`.
- `session/` — `store.ts` (sesión JWT en memoria por chatId) + `flows.ts` (estado de flujos conversacionales).
- `flows/` — handlers de flujos paso a paso (login, publicar, proponer, ofertar) + `router.ts` que despacha por `kind`.
- `commands/` — reply-builders puros (testeables) que consumen las apis.
- `format/` — pretty-print de figuritas, solicitudes y subastas.
- `push/notifier.ts` — poller de notificaciones (baseline en la 1ª pasada, luego empuja las nuevas no leídas).
- `index.ts` — bootstrap de grammY: registra comandos (antes del router de texto) y arranca el poller + polling.
