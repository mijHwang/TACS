# Bot de Telegram para TACS — Diseño (Spec)

- **Fecha:** 2026-06-30
- **Estado:** Aprobado para implementación por fases
- **Autor:** Grupo 3 (con asistencia de IA)
- **User Stories cubiertas:** integración Telegram (requisito de promoción) + US1 (publicar repetida); base para US3/US8/US11 (lectura)

## 1. Contexto y objetivo

El enunciado permite que la UI sea frontend **o** Telegram, y exige **ambos** para promoción
([TP_Enunciado.md:69](../../TP_Enunciado.md), [:79](../../TP_Enunciado.md)). El frontend ya existe; falta
la integración con Telegram (figura como pendiente en `README.md`).

El objetivo de este v1 es un bot de Telegram que actúa como **cliente REST puro** del backend Java
existente, exponiendo las acciones más básicas del sistema. El bot **no** implementa lógica de negocio
ni toca el backend ni la base: traduce mensajes de Telegram a llamadas HTTP contra la API que ya existe.

## 2. Decisiones de diseño (cerradas)

| Decisión | Elección | Motivo |
|---|---|---|
| Hosting / lenguaje | Servicio aparte **Node/TypeScript con grammY**, nuevo servicio en `docker-compose` | Reusa el TS que el equipo ya maneja del frontend; no toca el backend Java que están por entregar (cero riesgo); grammY es cómodo para flujos conversacionales |
| Auth Telegram→usuario | **`/login` paso a paso** (usuario y contraseña en mensajes separados, ambos borrados) con *grammY conversations* | Alineado con el enunciado (auth no es el foco); evita exponer la contraseña en una sola línea |
| Transporte con Telegram | **Long polling** (`bot.start()`) | No requiere exponer puerto público ni HTTPS hacia Telegram; idéntico en local y en la EC2; simple de defender |
| Sesión | **En memoria** (`Map<chatId, Session>`) | Suficiente para v1/demo; persistirla es extensión trivial futura |
| Cliente HTTP | `fetch` nativo (Node 20+) envuelto en un módulo propio | Sin dependencias extra; fácil de mockear en tests |
| Tests | **Vitest** | Mismo ecosistema Vite del frontend |

## 3. Arquitectura

El bot es un proceso Node independiente que:
1. Recibe *updates* de Telegram por long polling.
2. Enruta cada comando a un handler.
3. El handler llama al backend vía el cliente REST, adjuntando el JWT de la sesión del `chatId`.
4. Formatea la respuesta y contesta en el chat.

```
Telegram  ──updates──>  Bot (Node/grammY)  ──HTTP+JWT──>  Backend Spring Boot  ──>  MongoDB
          <──replies──                      <──JSON──
```

Nuevo directorio `telegram-bot/` al lado de `backend/` y `frontend/`. Sin cambios en el backend.

### 3.1 Estructura de módulos

Cada módulo tiene un único propósito y se testea aislado. Los handlers reciben el cliente API por
inyección (no importan singletons), de modo que se mockean fácil.

```
telegram-bot/
  src/
    index.ts                 # bootstrap: crea Bot, registra middlewares + comandos, arranca polling
    config.ts                # lee y valida env: TELEGRAM_BOT_TOKEN, BACKEND_URL (falla rápido si faltan)
    api/
      client.ts              # wrapper fetch: base URL + header Authorization Bearer + mapeo de errores → ApiError
      auth.ts                # login(user,pass) -> token ; resolveUser(token, username) -> { id, username }
      figuritas.ts           # coleccion() ; faltantes() ; repetidas() ; catalogo()  (Fase 2)
      publicaciones.ts       # publicar() ; disponibles()                            (Fase 2)
      notificaciones.ts      # porUsuario()                                          (Fase 2)
    session/
      store.ts               # Map<chatId, Session{token, username, userId}> + get/set/clear
    middlewares/
      requireAuth.ts         # si no hay sesión válida -> responde "iniciá sesión con /login" y corta  (Fase 2)
    commands/
      start.ts               # /start  -> mensaje de bienvenida + ayuda
      login.ts               # /login  -> conversación (usuario, contraseña, borra mensajes)
      logout.ts              # /logout -> limpia la sesión
      whoami.ts              # /whoami -> debug: muestra usuario/userId de la sesión
      buscar.ts              # /buscar     (Fase 2)
      coleccion.ts           # /miscoleccion, /faltantes, /repetidas  (Fase 2)
      notificaciones.ts      # /notificaciones  (Fase 2)
      publicar.ts            # /publicar -> conversación (elegir repetida, cantidad)  (Fase 2)
    format/
      figuritas.ts           # pretty-print de figuritas / publicaciones / notificaciones (Fase 2)
    errors.ts                # ApiError (status + mensaje), helpers
  tests/                     # Vitest (.test.ts)
  package.json
  tsconfig.json
  Dockerfile
  .dockerignore
  README.md                  # cómo correr el bot, comandos, variables de entorno
```

## 4. Modelo de sesión y seguridad

### 4.1 Sesión

```ts
type Session = { token: string; username: string; userId: string };
const sessions = new Map<number, Session>();   // clave = chatId
```

- En memoria. Si el contenedor reinicia, los usuarios re-loguean (aceptable para v1/demo).
- El JWT vence a las 24 h. Ante un **401** del backend, el bot limpia la sesión y pide `/login` de nuevo.

### 4.2 Manejo de secretos (requisito del enunciado)

- `TELEGRAM_BOT_TOKEN` y `BACKEND_URL` se inyectan por **variables de entorno**, nunca en el repo —
  mismo patrón que `JWT_SECRET` / `SPRING_MONGODB_URI`.
- El `.env` de la raíz (ya **gitignored**, `.gitignore:36`) lleva el valor real; `.env.example` lleva
  solo placeholders.
- El token se obtiene de **@BotFather**. Si alguna vez se expone, se rota con `/revoke` en @BotFather.
- El bot **no loguea** tokens ni contraseñas. El mensaje del usuario con la contraseña se borra del chat
  apenas se procesa (`ctx.deleteMessage()`), best-effort.

## 5. Flujos de datos

### 5.1 Login (conversación)

```
/login
  → "¿Usuario?"            (espera mensaje)
  → "¿Contraseña?"         (espera mensaje; al recibirla, borra ese mensaje)
  → POST /auth/login  { username, password }     →  200 con el JWT como string plano en el body
  → GET  /api/usuarios/by-username/{username}  (Bearer token)  →  Usuario { id, ... }
  → sessions.set(chatId, { token, username, userId: usuario.id })
  → "✅ Sesión iniciada. ¡Hola, {username}!"
```

Errores: credenciales inválidas → el backend responde 401/403 al `authenticate`; el bot muestra
"Usuario o contraseña incorrectos" y no crea sesión.

> Nota de implementación: `POST /auth/login` devuelve `ResponseEntity<String>` (el token **en texto
> plano**, no JSON). El cliente debe leer el body como texto en esa llamada puntual.

### 5.2 Comando autenticado (ej. `/repetidas`)

```
update → requireAuth (¿hay sesión?) 
  → api.figuritas.repetidas(session)  →  GET /api/usuarios/{username}/figuritas/repetidas  (Bearer)
  → format.figuritas(...)  →  reply
```

### 5.3 Publicar repetida — US1 (conversación)

```
/publicar
  → GET /api/usuarios/{username}/figuritas/repetidas   (lista las repetidas del usuario)
  → si no hay repetidas: "No tenés figuritas repetidas para publicar."
  → muestra lista numerada (#numero — jugador — count copias)
  → "¿Cuál querés publicar? (número de la lista)"  → valida selección
  → "¿Cuántas?"  → valida entero > 0
  → POST /api/publicaciones  { usuarioId: session.userId, figuritaBaseId, cantidad }
  → 201 → "✅ Publicaste la figurita #{numero} ({jugador}) × {cantidad}"
  → 400 → muestra el motivo devuelto por el backend
```

El `figuritaBaseId` sale del item elegido (FiguritaResponseDTO expone `figuritaBaseId`, `numero`,
`count`, `jugadorNombre`). El DTO de publicación solo pide `usuarioId` + `figuritaBaseId` + `cantidad`
(sin modo subasta), por lo que el flujo es corto.

## 6. Mapa de comandos → endpoints

| Comando | Método + endpoint | DTO / notas | Fase |
|---|---|---|---|
| `/start` | — | bienvenida + ayuda | 1 |
| `/login` | `POST /auth/login` + `GET /api/usuarios/by-username/{u}` | token (string) → resolver `userId` | 1 |
| `/logout` | — | limpia sesión | 1 |
| `/whoami` | — | debug: username + userId de la sesión | 1 |
| `/buscar [texto]` | `GET /api/figuritas?usuarioId={id}&search={texto}&page=0&size=10` | catálogo con filtros (US3), excluye las propias; `PagedResponse<FiguritaResponseDTO>` | 2 |
| `/miscoleccion` | `GET /api/usuarios/{u}/figuritas` | `PagedResponse<FiguritaResponseDTO>` | 2 |
| `/faltantes` | `GET /api/usuarios/{u}/figuritas/faltantes` | `PagedResponse<FiguritaBaseDTO>` | 2 |
| `/repetidas` | `GET /api/usuarios/{u}/figuritas/repetidas` | `PagedResponse<FiguritaResponseDTO>` | 2 |
| `/notificaciones` | `GET /api/notificaciones/usuario/{userId}` | `PagedResponse<Notificacion>` | 2 |
| `/publicar` | `GET .../repetidas` + `POST /api/publicaciones` | flujo conversacional, US1 | 2 |

Todas las llamadas (salvo `/auth/login`) viajan con `Authorization: Bearer {token}`.
Para los listados, v1 muestra la **primera página** (size 10) e indica si hay más (la paginación con
botones inline queda para Fase 3).

## 7. Manejo de errores

- `api/client.ts` mapea respuestas no-2xx a `ApiError { status, message }`:
  - **401** → limpia la sesión y responde "Tu sesión expiró, usá /login".
  - **400** → muestra el motivo del backend (validaciones, p. ej. al publicar).
  - **5xx / red** → "El servidor no está disponible, probá de nuevo en un momento".
- `bot.catch(...)` global como red de seguridad: ninguna excepción debe tumbar el proceso.
- Comando que requiere auth sin sesión → `requireAuth` responde "Necesitás iniciar sesión con /login".

## 8. Testing

Vitest. No se mockea Telegram a nivel de red: los handlers se escriben como funciones que reciben un
contexto mínimo + el cliente API (inyectado), y se afirma el efecto (qué reply se manda, si se crea o
no la sesión). Cobertura mínima:

- `api/client`: arma bien URL + headers; mapea 200/400/401/5xx a `ApiError` (mock de `fetch`).
- `api/auth`: `login` parsea el token texto-plano; `resolveUser` extrae el `userId`.
- `format/*`: salida correcta dada una lista de DTOs (incluido el caso vacío).
- Handlers clave: `/login` (éxito y credenciales inválidas), `/publicar` (éxito, sin repetidas,
  cantidad inválida), y el path "sin sesión" de un comando autenticado.

## 9. Integración con docker-compose y entorno

Nuevo servicio en `docker-compose.yml`:

```yaml
  telegram-bot:
    build:
      context: ./telegram-bot
      dockerfile: Dockerfile
    container_name: tacs-telegram-bot
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - BACKEND_URL=http://backend:8080
    networks:
      - tacs-net
    restart: unless-stopped
    depends_on:
      - backend
```

- En Docker, el bot alcanza el backend por red interna (`http://backend:8080`).
- En dev local fuera de Docker: `BACKEND_URL=http://localhost:8080`.
- `Dockerfile` multi-stage: instala deps → `tsc` build → imagen runtime con `node dist/index.js`.
- `.env.example` agrega (placeholders):
  ```
  # Token del bot de Telegram (obtenido de @BotFather). NUNCA commitear el real.
  TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVwxyz
  # URL del backend visto desde el bot. En docker-compose: http://backend:8080
  BACKEND_URL=http://backend:8080
  ```

## 10. Plan de fases

### Fase 1 — Bot base + login (checkpoint de validación)
Entregable: el bot levanta, responde `/start`, y `/login` con un usuario real crea sesión válida.
- Scaffold `telegram-bot/` (package.json, tsconfig, Dockerfile, .dockerignore, README).
- `config.ts`, `api/client.ts`, `api/auth.ts`, `session/store.ts`, `errors.ts`.
- Comandos `/start`, `/login` (conversación), `/logout`, `/whoami`.
- Servicio en `docker-compose.yml` + entradas en `.env.example`.
- Tests: `api/client`, `api/auth`, handler `/login`.
- **Criterio de aceptación / checkpoint:** con el `TELEGRAM_BOT_TOKEN` real en `.env` y el backend
  arriba, `docker compose up` levanta el bot; en Telegram, `/login` con un usuario existente responde
  "✅ Sesión iniciada" y `/whoami` muestra el `userId` correcto resuelto contra el backend.
  **Se pausa acá para validar antes de la Fase 2.**

### Fase 2 — Servicios esenciales (lectura + publicar)
Entregable: comandos de lectura y `/publicar` (US1) funcionando.
- `api/figuritas.ts`, `api/publicaciones.ts`, `api/notificaciones.ts`, `middlewares/requireAuth.ts`,
  `format/figuritas.ts`.
- Comandos `/buscar`, `/miscoleccion`, `/faltantes`, `/repetidas`, `/notificaciones`, `/publicar`.
- Tests de formatters + handlers (incluye paths de error y sin-sesión).
- **Criterio de aceptación:** un usuario logueado puede buscar, ver su colección/faltantes/repetidas,
  ver notificaciones y publicar una repetida que aparece como disponible para otros.

### Fase 3 — Tareas complejas (fuera de este v1)
Documentada, **no incluida** en este v1. Lista para retomar:
- Intercambios (US5/US8/US9): `/proponer`, `/solicitudes` (recibidas/enviadas), aceptar/rechazar.
- Subastas (US6/US7): `/subastas`, `/ofertar`, crear subasta.
- Push de notificaciones a Telegram (polling del backend), webhook, persistencia de sesión,
  paginación con botones inline, `/register`.

## 11. Qué NO entra (YAGNI explícito)

Intercambios, subastas, push de notificaciones, webhook, persistencia de sesión, registro y paginación
con botones quedan para Fase 3. El diseño deja `api/*` y `commands/*` preparados para sumarlos sin
reescritura.

## 12. Riesgos y consideraciones

- **Token expuesto** en el chat durante el setup → mitigado con `/revoke` en @BotFather y rotación al `.env`.
- **Resolución de `userId`:** el JWT solo lleva `username` (no el `id`); el bot lo resuelve con
  `/api/usuarios/by-username/{username}`. Si ese endpoint cambia, el login del bot se rompe (cubierto por test).
- **Sesión en memoria:** se pierde al reiniciar el contenedor; aceptable para v1, documentado.
- **Disponibilidad del backend:** si el backend no está arriba, los comandos responden error amable;
  el bot no crashea.
