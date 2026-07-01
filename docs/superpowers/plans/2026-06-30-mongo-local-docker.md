# Mongo local en Docker Compose — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `docker compose up` levante también un MongoDB en container (con datos persistentes) y el backend se conecte a él por defecto, eliminando la dependencia de MongoDB Atlas para correr la app en cualquier máquina (local o servidor).

**Architecture:** Se agrega un servicio `mongo` (mongo:7) al `docker-compose.yml` base, siempre activo, con volumen nombrado y healthcheck. El `backend` pasa a depender de Mongo (`condition: service_healthy`) y a defaultear `SPRING_MONGODB_URI` al Mongo del container (`mongodb://mongo:27017/tacs`), respetando una env si se la setea (p. ej. Atlas). El `CatalogoSeeder` ya existente carga el catálogo al arrancar.

**Tech Stack:** Docker Compose v2.40, MongoDB 7, Spring Boot 4 / Spring Data MongoDB.

## Global Constraints

- **No commitear ni pushear sin pedido explícito del usuario.** Los pasos de commit de abajo están marcados **(OPCIONAL)** y solo se ejecutan si el usuario lo pide. (Preferencia registrada del usuario.)
- **No tocar el `.env` real del usuario** (gitignored, apunta a su Atlas). Solo se edita `.env.example`. Para verificar se usa `--env-file` con una copia en el scratchpad.
- **No deployar ni tocar la EC2** en esta tarea. El paso de cambiar el `.env` del server se **documenta**, no se ejecuta.
- **No exponer el puerto 27017 al host** (Mongo sin auth; solo accesible dentro de `tacs-net`).
- Puertos del host ocupados en la máquina del usuario: **80 (Apache)** y **8080 (IntelliJ)**. El e2e full-stack se corre con el override de puertos del `preview` o liberando esos puertos.
- Versión de Docker Compose objetivo: **v2.40** (soporta long-form `depends_on` con `condition`).

---

### Task 1: Servicio `mongo` + wiring del backend en `docker-compose.yml`

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: servicio `mongo` en la red `tacs-net`, accesible como host `mongo:27017`; volumen nombrado `mongo-data`; el `backend` arranca recién con Mongo `healthy` y usa `SPRING_MONGODB_URI` (default `mongodb://mongo:27017/tacs`).

- [ ] **Step 1: Reemplazar el contenido de `docker-compose.yml`**

El archivo actual no tiene servicio de base. Reemplazarlo por esta versión (agrega `mongo`, el `depends_on`/URI del backend y la sección `volumes`):

```yaml
services:
  # ─────────────────────────────────────────────
  # MONGO — base de datos (local, persistente por volumen)
  # ─────────────────────────────────────────────
  mongo:
    image: mongo:7
    container_name: tacs-mongo
    volumes:
      - mongo-data:/data/db
    networks:
      - tacs-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  # ─────────────────────────────────────────────
  # BACKEND — Spring Boot corriendo en JVM
  # ─────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tacs-backend
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      # Por defecto usa el Mongo del container; si se setea SPRING_MONGODB_URI (p. ej. Atlas) se respeta.
      - SPRING_MONGODB_URI=${SPRING_MONGODB_URI:-mongodb://mongo:27017/tacs}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - tacs-net
    restart: unless-stopped

  # ─────────────────────────────────────────────
  # FRONTEND — React (Vite build) servido por Nginx
  # ─────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: tacs-frontend
    ports:
      - "80:80"
    networks:
      - tacs-net
    restart: unless-stopped

# Red interna bridge: los contenedores se comunican por nombre de servicio
networks:
  tacs-net:
    driver: bridge

# Volumen nombrado: los datos de Mongo sobreviven a `docker compose down`
volumes:
  mongo-data:
```

- [ ] **Step 2: Validar que el YAML mergea sin errores**

Run: `docker compose config`
Expected: imprime la config resuelta sin error; aparece el servicio `mongo`, el `backend` con `depends_on: mongo` y la `SPRING_MONGODB_URI` resuelta (a `mongodb://mongo:27017/tacs` si no hay `.env` con Atlas).

> Nota: si el usuario tiene un `.env` con `SPRING_MONGODB_URI` de Atlas, `config` mostrará esa URI (es lo esperado: la env tiene prioridad). Eso no invalida el cambio.

- [ ] **Step 3: Verificar que Mongo levanta y queda `healthy` (sin tocar puertos del host)**

Run:
```bash
docker compose up -d mongo
docker compose ps
```
Expected: `tacs-mongo` con estado `running` y health `healthy` (esperar ~20–30s por el `start_period`). Como no se expone 27017 al host, no hay conflicto de puertos.

- [ ] **Step 4: Confirmar el volumen y bajar**

Run:
```bash
docker volume ls | grep mongo-data
docker compose down
```
Expected: existe el volumen `<proyecto>_mongo-data`; `down` no lo borra (los datos persisten).

- [ ] **Step 5: (OPCIONAL) Commit — solo si el usuario lo pide**

```bash
git add docker-compose.yml
git commit -m "feat(docker): agregar MongoDB local al compose con volumen y healthcheck"
```

---

### Task 2: `.env.example` — URI opcional + JWT_SECRET de desarrollo usable

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Consumes: el default de `SPRING_MONGODB_URI` definido en Task 1.
- Produces: un `.env.example` que, copiado a `.env`, deja la app lista sin editar nada (usa el Mongo del container; JWT_SECRET de dev presente).

- [ ] **Step 1: Reemplazar el contenido de `.env.example`**

```dotenv
# ─────────────────────────────────────────────────────────────────────────────
# Por defecto la app usa el MongoDB que levanta docker compose (servicio "mongo"),
# así corre en cualquier máquina sin servicios externos. NO hace falta setear
# SPRING_MONGODB_URI.
#
# Para usar MongoDB Atlas en su lugar, descomentá y completá esta línea:
# SPRING_MONGODB_URI=mongodb+srv://<usuario>:<password_url_encoded>@<cluster>.mongodb.net/<database>?appName=<app>
# ─────────────────────────────────────────────────────────────────────────────

# Secreto de firma JWT (HS256, mínimo 32 caracteres / 256 bits).
# El valor de abajo es SOLO para desarrollo (throwaway, puede vivir en el repo).
# En el servidor/prod generá uno propio, p. ej.:  openssl rand -base64 48
JWT_SECRET=dev-only-secret-not-for-prod-change-me-1234567890
```

- [ ] **Step 2: Verificar que una `.env` copiada resuelve bien (sin tocar el `.env` real)**

Run (Bash):
```bash
SCRATCH="/c/Users/MATIAS~1/AppData/Local/Temp/claude/C--Users-Matias-Sicher-Documents-aUTN-abTecnicas-Avanzadas-de-Construccion-de-Software-TACS/7975fb1c-7f00-42a5-bff0-024211a642c1/scratchpad"
cp .env.example "$SCRATCH/.env.test"
docker compose --env-file "$SCRATCH/.env.test" config | grep -E "SPRING_MONGODB_URI|JWT_SECRET"
```
Expected: `SPRING_MONGODB_URI: mongodb://mongo:27017/tacs` (vino del default, porque la línea Atlas está comentada) y `JWT_SECRET: dev-only-secret-not-for-prod-change-me-1234567890`.

- [ ] **Step 3: (OPCIONAL) Commit — solo si el usuario lo pide**

```bash
git add .env.example
git commit -m "docs(env): SPRING_MONGODB_URI opcional (default Mongo local) + JWT_SECRET de dev"
```

---

### Task 3: Verificación end-to-end (stack completo + seeder + persistencia)

**Files:** ninguno (solo verificación).

**Interfaces:**
- Consumes: Task 1 (compose) y Task 2 (.env.example).

Como 80/8080 están ocupados en la máquina del usuario, se usa el override de puertos del `preview` (8081 backend / 8095 frontend), que ahora hereda el `mongo` del base. Esto prueba el flujo backend → Mongo del container → seeder. (Alternativa: liberar 80/8080 y correr `docker compose up --build` pelado.)

- [ ] **Step 1: Levantar el stack completo en puertos que no chocan**

Run:
```bash
docker compose -f docker-compose.yml -f docker-compose.preview.yml up --build -d
```
Expected: buildea backend+frontend y arranca `mongo`, `backend`, `frontend`.

> Si el merge del `depends_on` con el `preview` (que usa forma corta `depends_on: [mongo]`) diera warning, es del archivo personal `preview` y no bloquea; el driver de Mongo reintenta igual.

- [ ] **Step 2: Confirmar que el backend conectó y el seeder corrió**

Run:
```bash
docker compose -f docker-compose.yml -f docker-compose.preview.yml logs backend | grep -iE "catálogo|catalogo|Started TpApplication"
```
Expected: aparece `Started TpApplication ...` y una línea de `CatalogoSeeder` ("Catálogo cargado: N selecciones, M figuritas base." o "Catálogo ya presente; se omite la carga inicial.").

- [ ] **Step 3: Health del backend y SPA del frontend**

Run:
```bash
curl -s http://localhost:8081/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8095/
```
Expected: el health responde 200 (cuerpo del endpoint) y el frontend devuelve `200`.

- [ ] **Step 4: Persistencia entre reinicios**

Run:
```bash
docker compose -f docker-compose.yml -f docker-compose.preview.yml down
docker compose -f docker-compose.yml -f docker-compose.preview.yml up -d
docker compose -f docker-compose.yml -f docker-compose.preview.yml logs backend | grep -iE "ya presente|Catálogo cargado"
```
Expected: en el segundo arranque el log dice "Catálogo ya presente" (los datos sobrevivieron al `down`, el volumen persistió).

- [ ] **Step 5: Bajar el stack de verificación**

Run: `docker compose -f docker-compose.yml -f docker-compose.preview.yml down`
Expected: contenedores detenidos; el volumen `mongo-data` sigue existiendo.

---

### Task 4: Documentación (README + CLAUDE.md + backend/CLAUDE.md)

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `backend/CLAUDE.md`

Actualizar todas las afirmaciones de "persistencia en Atlas" para reflejar que **por defecto** la base es el Mongo del container (Atlas pasa a ser opcional vía env).

- [ ] **Step 1: `README.md` — sección "Cómo levantar la aplicación"**

Buscar:
```markdown
## Cómo levantar la aplicación

```bash
# Desde la raíz del repositorio
docker compose up --build
```
```
Reemplazar por:
```markdown
## Cómo levantar la aplicación

La app es **autocontenida**: `docker compose` levanta frontend, backend **y la base MongoDB**
(con un volumen para que los datos persistan). No hace falta ninguna cuenta ni base externa.

```bash
# Desde la raíz del repositorio
cp .env.example .env       # primera vez: crea el .env con un JWT_SECRET de desarrollo
docker compose up --build
```

> Para usar **MongoDB Atlas** en lugar del Mongo local, descomentá y completá `SPRING_MONGODB_URI`
> en el `.env` (ver `.env.example`).
```

- [ ] **Step 2: `README.md` — nota de persistencia (Usuarios de prueba)**

Buscar:
```markdown
> Los datos se persisten en **MongoDB Atlas**, por lo que **sobreviven** al reinicio de los contenedores.
```
Reemplazar por:
```markdown
> Los datos se persisten en el **MongoDB del container** (volumen `mongo-data`), por lo que **sobreviven** al reinicio de los contenedores. Se borran solo con `docker compose down -v`.
```

- [ ] **Step 3: `README.md` — advertencia del seed-demo (supuesto de Atlas compartido)**

Buscar:
```markdown
> ⚠️ **Acción destructiva.** El endpoint `POST /api/admin/seed-demo` (admin-only) hace `dropCollection` de **todas** las colecciones antes de sembrar. Como local y el deploy comparten cluster de Atlas, **no lo ejecutes contra la base de producción** salvo que realmente quieras resetearla. La única guarda es el rol ADMIN + la confirmación tipeada en la UI (decisión de diseño: sin flag de entorno).
```
Reemplazar por:
```markdown
> ⚠️ **Acción destructiva.** El endpoint `POST /api/admin/seed-demo` (admin-only) hace `dropCollection` de **todas** las colecciones antes de sembrar. Afecta **solo a la base donde lo corras** (local y servidor ahora tienen cada uno su propio Mongo en Docker, ya no comparten cluster de Atlas). Aun así, **no lo ejecutes contra la base del servidor** salvo que realmente quieras resetearla. La única guarda es el rol ADMIN + la confirmación tipeada en la UI (decisión de diseño: sin flag de entorno).
```

- [ ] **Step 4: `README.md` — tabla de componentes**

Buscar:
```markdown
|**persistencia**|Mongo Atlas Cloud|DB nombre: tacs |
```
Reemplazar por:
```markdown
| **mongo** | MongoDB 7 (container, volumen `mongo-data`) | 27017 (solo dentro de `tacs-net`) |
```

- [ ] **Step 5: `README.md` — paso de deploy en la EC2 (usar el Mongo del container)**

Buscar:
```markdown
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

| Archivo | Rol |
```
Reemplazar por:
```markdown
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

> **Base de datos en el server:** el override de prod hereda el servicio `mongo` del compose base,
> así que el servidor usa **su propio MongoDB en Docker** (volumen `mongo-data` en el disco de la EC2).
> Para que el backend lo use, el `.env` de la EC2 **no debe** setear `SPRING_MONGODB_URI` (o dejarlo
> comentado); si apunta a Atlas, seguirá usando Atlas. La base del server arranca vacía la primera vez
> (el seeder recarga el catálogo; el demo se carga con el botón de Admin).

| Archivo | Rol |
```

- [ ] **Step 6: `CLAUDE.md` (raíz) — párrafo "Required"**

Buscar:
```markdown
**Required:** a `.env` file at the repo root provides `SPRING_MONGODB_URI` (the MongoDB Atlas connection string), consumed by the backend service in `docker-compose.yml`. See `.env.example` for the format. Without it the backend boots but every data operation fails. Connecting to Atlas requires the running machine's public IP to be in the cluster's Network Access list and valid Database Access credentials in the URI.
```
Reemplazar por:
```markdown
**Database:** `docker-compose.yml` includes a `mongo` service (MongoDB 7, named volume `mongo-data`); the backend connects to it by default (`SPRING_MONGODB_URI` defaults to `mongodb://mongo:27017/tacs`). So a fresh `docker compose up` is fully self-contained — no external DB needed. To use **MongoDB Atlas** instead, set `SPRING_MONGODB_URI` in `.env` (see `.env.example`); the backend still needs `JWT_SECRET` (a dev value ships in `.env.example`).
```

- [ ] **Step 7: `CLAUDE.md` (raíz) — bullet de "Key Design Decisions"**

Buscar:
```markdown
- Persistence uses MongoDB Atlas via Spring Data MongoDB. The connection string is injected through `SPRING_MONGODB_URI` (from `.env`); the `docker` profile (`application-docker.properties`) reads it. An earlier in-memory HashMap implementation was replaced by this MongoDB migration.
```
Reemplazar por:
```markdown
- Persistence uses MongoDB via Spring Data MongoDB. By default it's a containerized `mongo` service in `docker-compose.yml` (volume `mongo-data`); the connection string is injected through `SPRING_MONGODB_URI` (defaults to `mongodb://mongo:27017/tacs`, overridable in `.env` to point at MongoDB Atlas). The `docker` profile (`application-docker.properties`) reads it. An earlier in-memory HashMap implementation was replaced by this MongoDB migration.
```

- [ ] **Step 8: `backend/CLAUDE.md` — sección "Persistence (MongoDB Atlas)"**

Buscar:
```markdown
## Persistence (MongoDB Atlas)

Data is persisted in MongoDB Atlas via Spring Data MongoDB. Repositories are interfaces extending `MongoRepository<Entity, String>`; models are annotated with `@Document(collection = "...")` and `@Id`. Cross-entity references use `@DocumentReference(lazy = true)`. Complex queries live in a `*RepositoryCustom` interface with a `*Impl` class backed by `MongoTemplate` (see `FiguritaRepositoryCustomImpl`, `NotificacionRepositoryImpl`, `SolicitudDeIntercambioRepositoryImpl`).

The connection string comes from `SPRING_MONGODB_URI` (set in the repo-root `.env`, injected by `docker-compose.yml`). The `docker` Spring profile (`application-docker.properties`) binds it via `spring.mongodb.uri`. Reaching Atlas requires the running machine's public IP in the cluster's Network Access list and valid Database Access credentials. Data **persists across restarts** (it's a real database, not in-memory).
```
Reemplazar por:
```markdown
## Persistence (MongoDB)

Data is persisted in MongoDB via Spring Data MongoDB. Repositories are interfaces extending `MongoRepository<Entity, String>`; models are annotated with `@Document(collection = "...")` and `@Id`. Cross-entity references use `@DocumentReference(lazy = true)`. Complex queries live in a `*RepositoryCustom` interface with a `*Impl` class backed by `MongoTemplate` (see `FiguritaRepositoryCustomImpl`, `NotificacionRepositoryImpl`, `SolicitudDeIntercambioRepositoryImpl`).

By default the database is the containerized `mongo` service in `docker-compose.yml` (MongoDB 7, named volume `mongo-data`): a fresh `docker compose up` is self-contained, no external DB needed. The connection string comes from `SPRING_MONGODB_URI` (defaults to `mongodb://mongo:27017/tacs`); set it in the repo-root `.env` to point at **MongoDB Atlas** instead (Atlas then requires the machine's public IP in the cluster's Network Access list and valid credentials). The `docker` Spring profile (`application-docker.properties`) binds it via `spring.mongodb.uri`. Data **persists across restarts** via the volume (it's a real database, not in-memory).
```

- [ ] **Step 9: Verificar que no quedaron referencias obsoletas a "Atlas" como única persistencia**

Run: `grep -rni "atlas" README.md CLAUDE.md backend/CLAUDE.md`
Expected: las menciones restantes a Atlas son todas en contexto de "opcional / alternativa", no como la base por defecto.

- [ ] **Step 10: (OPCIONAL) Commit — solo si el usuario lo pide**

```bash
git add README.md CLAUDE.md backend/CLAUDE.md
git commit -m "docs: persistencia por defecto = Mongo del container (Atlas opcional)"
```

---

## Self-Review

**1. Spec coverage:**
- Servicio `mongo` siempre activo + volumen + healthcheck → Task 1. ✅
- Backend depende de Mongo sano + URI default al container → Task 1. ✅
- `.env.example` (URI opcional + JWT dev) → Task 2. ✅
- Documentación (README, CLAUDE.md, backend/CLAUDE.md) → Task 4. ✅
- Verificación (`config`, mongo healthy, e2e, persistencia) → Tasks 1 y 3. ✅
- Fuera de alcance (auth, migración Atlas, auto seed-demo, no tocar preview/EC2/.env real) → respetado en Global Constraints. ✅

**2. Placeholder scan:** sin TBD/TODO; todo el contenido a escribir está completo (YAML, dotenv, bloques de doc, comandos con output esperado). ✅

**3. Type/string consistency:** nombre de servicio `mongo`, host `mongo:27017`, DB `tacs`, volumen `mongo-data`, env `SPRING_MONGODB_URI`/`JWT_SECRET` usados consistentes en todas las tareas. ✅
