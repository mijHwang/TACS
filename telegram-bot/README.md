# Bot de Telegram — TACS

Cliente REST del backend. No implementa lógica de negocio; consume la API existente vía long polling (grammY).

**Status de producción:** ✅ **Deployado en AWS EC2** (https://tacs-g3-figuritas.dev/).
- Bot en vivo: **@tacs_figuritas_g3_bot** (Telegram).
- Corre como 4º contenedor en `docker-compose.yml` + `docker-compose.prod.yml`.
- 83 tests Vitest, build limpio, revisado y validado.

## Variables de entorno
- `TELEGRAM_BOT_TOKEN` — token de @BotFather (obligatorio).
- `BACKEND_URL` — URL del backend (default `http://localhost:8080`; en docker `http://backend:8080`).
- `NOTIF_POLL_MS` — intervalo del poller de notificaciones en ms (default `30000`).

## Deployment

### Producción (AWS EC2)
El bot ya corre en la EC2 como parte del stack estándar:
```bash
cd ~/TACS
git fetch origin && git reset --hard origin/master
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```
El token está en `~/.env` del servidor (gitignored). Contenedores: `mongo`, `backend`, `frontend`, `telegram-bot`.

### Local con Docker
Con `TELEGRAM_BOT_TOKEN` en el `.env` de la raíz del repo:
```bash
docker compose up --build telegram-bot
```
⚠️ **Conflicto de token:** long polling con un solo token = **un único poller activo a la vez**. Si corres el bot local Y prod simultáneamente con el mismo token, Telegram tira 409. **Parar prod antes de probar local** (`docker compose ... stop telegram-bot` en la EC2), o usar un 2º token de @BotFather para dev.

## Correr local (dev)
```bash
cd telegram-bot
cp ../.env.example .env   # y completar TELEGRAM_BOT_TOKEN y BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

## Desarrollo local

```bash
npm install
npm run build   # TypeScript compile
npm test        # Vitest: 83 tests (apis, formatters, flujos, comandos, poller)
npm run dev     # Ejecutar el bot local (requiere .env con TELEGRAM_BOT_TOKEN)
```

**Requisitos:**
- Node 20+
- `.env` con `TELEGRAM_BOT_TOKEN` y `BACKEND_URL`.
- Backend corriendo (ej. `docker compose up backend mongo` si usas local dev).
- Token no en uso en otro poller (el de prod debe estar parado).

## Comandos del bot (@tacs_figuritas_g3_bot en Telegram)

**Sesión**
- `/login` — iniciar sesión (conversa paso a paso; borra automáticamente el mensaje de la contraseña)
- `/logout` — cerrar sesión
- `/whoami` — ver usuario y ID de sesión actual
- `/start` — mostrar la bienvenida con todos los comandos

**Figuritas (lectura)**
- `/buscar <texto>` — buscar figuritas disponibles en el catálogo (filtro por texto opcional)
- `/miscoleccion` — tu colección completa (paginado)
- `/faltantes` — figuritas que te faltan
- `/repetidas` — tus figuritas repetidas (las que tenés duplicadas)

**Publicaciones (US1)**
- `/publicar` — publicar una de tus figuritas repetidas para intercambio (flujo conversacional de 2 pasos)

**Intercambios (US5, US9)**
- `/solicitudes` — ver solicitudes recibidas y enviadas, con estados (PENDIENTE, ACEPTADO, etc.)
- `/proponer` — proponer un intercambio por una figurita que otro usuario publicó (flujo conversacional: elige la que quieres, ofrece tus repetidas)
- `/aceptar <n>` — aceptar la n-ésima solicitud recibida
- `/rechazar <n>` — rechazar la n-ésima solicitud recibida

**Subastas (US7)**
- `/subastas` — ver subastas activas (figurita, líder actual, ofertas)
- `/ofertar` — ofertar en una subasta con tus figuritas (flujo: elige la subasta, selecciona qué ofreces)

**Notificaciones (US11)**
- `/notificaciones` — ver tus notificaciones recientes
- **Push automático:** mientras tengas sesión iniciada, el bot te notifica en Telegram cuando: se publica una figurita que buscas, recibes una solicitud de intercambio, te hacen una oferta en una subasta, etc. (poller cada 30s por defecto).

## Arquitectura

**Módulos core:**
- `api/` — cliente HTTP (`client.ts`) + un submódulo por recurso (figuritas, publicaciones, intercambios, subastas, notificaciones); adjunta el JWT y mapea errores HTTP a `ApiError`.
- `session/store.ts` — sesión JWT en memoria por chatId (token, username, userId).
- `session/flows.ts` — estado de flujos conversacionales (login, publicar, proponer, ofertar).

**Flujos conversacionales (2+ pasos):**
- `flows/login.ts` — usuario/contraseña paso a paso.
- `flows/publicar.ts` — selecciona figurita base → cantidad.
- `flows/proponer.ts` — elige figurita ajena → ofrecé tus repetidas.
- `flows/ofertar.ts` — elige subasta → ofrecé tus figuritas.
- `flows/router.ts` — despacha texto entrante al handler del flujo activo.
- `flows/util.ts` — helpers (validación estricta de índices 1-based).

**Respuestas y formato:**
- `commands/` — reply-builders puros para cada comando (testeables, sin side effects).
- `format/` — pretty-print de figuritas, solicitudes y subastas.

**Notificaciones:**
- `push/notifier.ts` — poller que itera sesiones activas cada `NOTIF_POLL_MS` (default 30s), marca nuevas como leídas, y empuja a Telegram.

**Bootstrap:**
- `index.ts` — registra comandos (`bot.command(...)`) en grammY, router de texto para flujos activos, y arranca el poller.

**Errores y configuración:**
- `errors.ts` — `ApiError` con status HTTP.
- `config.ts` — lee env vars y valida.

**Testing:**
- 83 tests: Vitest, unitarios con mocks (sin integración con Telegram ni backend reales).
- Estructura: `tests/{api,flows,commands,format,push,session,guard}/` espejando `src/`.

## Casos de uso y limitaciones

**Casos de uso:**
1. **Coleccionista casual:** `/miscoleccion`, `/faltantes` → ve qué te falta sin abrir la web.
2. **Trading activo:** `/publicar` (publica repetidas) + `/proponer` (propone intercambios) + `/solicitudes` (gestiona ofertas).
3. **Subastas:** `/subastas` + `/ofertar` para participar sin abrir la web.
4. **Notificaciones:** `/notificaciones` y push automático te alertan si alguien publicó lo que buscas o hizo una oferta.

**Limitaciones conocidas:**
- **Token único:** long polling con un solo token → no correr dos bots con el mismo token (Telegram rechaza).
- **Crear subastas:** el bot no permite crear subastas nuevas (requiere `condiciones` complejas). Solo puede ofertar en existentes.
- **Persistencia de sesión:** las sesiones se guardan en memoria. Al reiniciar el bot, todos los usuarios pierden sesión (deben hacer `/login` nuevamente).
- **Flujos sin estado compartido:** si cambias de chat mientras estás a mitad de un flujo, ese flujo se abandona.
- **Búsqueda limitada:** `/buscar` busca en el catálogo (figuritas base), no en publicaciones específicas de otros usuarios.
- **Push cada 30s:** el poller chequea notificaciones cada 30s por defecto (configurable con `NOTIF_POLL_MS`).

## Troubleshooting

**P: El bot no responde en Telegram.**
- R: Verificá que el token sea válido y el bot esté corriendo (`docker compose logs telegram-bot`).
- R: Si el token está en uso en otro poller (dev + prod), Telegram tira error 409. Pará uno.

**P: "Tu sesión expiró" después de `/login`.**
- R: El backend rechazó el JWT (credenciales inválidas o token exp). Probá `/login` de nuevo.
- R: En prod, el backend cambió su `JWT_SECRET` → todos los tokens viejos se invalidan.

**P: `/proponer` dice "No hay figuritas publicadas".**
- R: Nadie ha hecho `/publicar` todavía. Publicá una figurita propia o seedeá con `/api/admin/seed-demo` en el backend.

**P: Las notificaciones no llegan.**
- R: Verificá que hayas hecho `/login` (el bot necesita tu sesión para polear).
- R: Aumentá `NOTIF_POLL_MS` solo si necesitas latencia más baja (ej. `NOTIF_POLL_MS=10000` = cada 10s).

## Seguridad y mantenimiento

- **Tokens JWT:** Se almacenan en memoria por chatId. Al reiniciar, se pierden (no se persistieron).
- **Rotación de token de Telegram:** Si vencerá el token de @BotFather, rotá con `/revoke` y actualizá `.env` (local + EC2) + redeployá.
- **Credenciales del backend:** Usuario/contraseña viajan vía `/auth/login` en HTTPS (en prod). El JWT se adjunta en todas las requests con `Authorization: Bearer`.
- **Límites de Telegram:** Telegram rate-limita; si el bot spamea, puede bloquearse temporalmente.
- **Long polling:** El poller es stateless y tolera fallos de red (reintenta en el próximo tick sin bloquear).

## Roadmap (fuera de scope)

- ❌ **Crear subastas** — requiere `CondicionImpl` y no agregó valor MVP.
- ❌ **Persistencia de sesión** — JWT no se persistió; optimizar si los usuarios necesitan sesiones más largas.
- ❌ **Webhook** — long polling es más simple para dev; webhook requiere HTTPS/IP pública + rotation manejo.
- ❌ **Búsqueda avanzada** — filtros por equipo/categoría en `/buscar`.
- ❌ **Caché local** — figuritas cachéadas localmente para offline; ahora todas las queries van al backend.
