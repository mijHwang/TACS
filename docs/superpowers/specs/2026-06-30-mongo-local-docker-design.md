# Mongo local en Docker Compose — diseño

**Fecha:** 2026-06-30
**Estado:** aprobado el diseño base; pendiente review del spec por el usuario.

## Problema

El corrector marcó (no bloqueante) que el TP exige un **entorno local completo**: hoy para
correr la app localmente hay que depender de **MongoDB Atlas** (cuenta + IP en la allowlist +
credenciales en `SPRING_MONGODB_URI`). Un `docker compose up` recién clonado no levanta una
base; sin Atlas, toda operación de datos falla.

## Objetivo

Que la base **viaje dentro de Docker**: al hacer `docker compose up` en **cualquier máquina**
(la PC del dev o el servidor EC2) se levante Mongo, el backend se conecte a ese Mongo y el
seeder cargue el catálogo. Sin depender de servicios externos.

**Decisión del usuario:** usar el Mongo del container **en todos lados** (local *y* servidor),
reemplazando Atlas. Es la opción más simple y autocontenida.

## Alcance

- Agregar un servicio `mongo` al `docker-compose.yml` base, **siempre activo** (sin compose profiles).
- Persistir los datos en un volumen nombrado.
- Apuntar el backend a ese Mongo por defecto, esperando a que esté sano antes de arrancar.
- Actualizar `.env.example` y la documentación (`README.md`, `CLAUDE.md`, `backend/CLAUDE.md`).

**Fuera de alcance (YAGNI):**
- Autenticación de Mongo (no se expone fuera de la red de Docker; se anota como hardening futuro).
- Migración de los datos actuales de Atlas (el server arranca con base nueva; el seeder recarga el catálogo).
- Auto-correr el seed de demo (es destructivo: `dropCollection`; sigue siendo manual por el botón de Admin).
- Tocar `docker-compose.preview.yml` (archivo personal untracked del usuario para puertos alternativos).

## Diseño

### 1. `docker-compose.yml` (base)

Nuevo servicio `mongo`:

```yaml
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
```

`backend` pasa a depender de Mongo y a defaultear la URI al Mongo del container:

```yaml
backend:
  environment:
    - SPRING_PROFILES_ACTIVE=docker
    - SPRING_MONGODB_URI=${SPRING_MONGODB_URI:-mongodb://mongo:27017/tacs}
    - JWT_SECRET=${JWT_SECRET}
  depends_on:
    mongo:
      condition: service_healthy
```

Volumen nombrado al final del archivo:

```yaml
volumes:
  mongo-data:
```

**Por qué `${SPRING_MONGODB_URI:-...}`:** si alguien igual quiere Atlas, setea la env y se respeta;
si no la setea, usa el Mongo del container. Cero config para el caso normal.

**Por qué `depends_on: condition: service_healthy`:** `CatalogoSeeder` (un `CommandLineRunner`)
pega a Mongo al arrancar; si Mongo no está listo, el arranque falla o espera el timeout del driver.
El healthcheck garantiza que el backend arranque recién con Mongo sano.

**Sin exponer el 27017 al host:** el Mongo queda accesible solo dentro de `tacs-net`. Evita exponer
una base sin auth a internet en la EC2 y evita choques de puerto locales. (Si se quiere acceso desde
el host para Compass o `./mvnw test`, se agrega `ports: ["127.0.0.1:27017:27017"]` — solo localhost.)

### 2. `.env.example`

- `SPRING_MONGODB_URI` deja de ser obligatorio: se comenta como opción (para Atlas) y por defecto
  manda el Mongo del container.
- `JWT_SECRET` con un valor de **desarrollo** real y usable (≥32 chars) para que `cp .env.example .env`
  funcione sin editar nada. En el server se reemplaza por uno propio.

### 3. Documentación

- `README.md`: actualizar la sección de "Requisitos"/levantado (ya no hace falta Atlas), la nota de
  persistencia ("MongoDB Atlas" → "Mongo en container con volumen `mongo-data`, sobrevive reinicios"),
  la tabla de componentes, y agregar el **paso de deploy** en la EC2 (quitar/commentar `SPRING_MONGODB_URI`
  del `.env` del server para que use el Mongo del container).
- `CLAUDE.md` y `backend/CLAUDE.md`: corregir las afirmaciones de "persistencia en Atlas" para reflejar
  el Mongo containerizado por defecto (Atlas opcional vía env).

## Flujos resultantes

| Escenario | Comportamiento |
|---|---|
| Clon nuevo + `cp .env.example .env` + `docker compose up` | Levanta mongo+backend+frontend, base local, catálogo seedeado. Sin Atlas. ✅ |
| `.env` con `SPRING_MONGODB_URI=mongodb+srv://...` (Atlas) | El backend usa Atlas; el container mongo igual arranca (queda sin uso). |
| Server EC2 (`-f docker-compose.prod.yml`) | Levanta mongo+backend+frontend(+TLS). El backend usa el Mongo del container una vez que el `.env` del server deja de apuntar a Atlas. |

## Riesgos y notas

- **Datos del server:** al cortar Atlas, la base del server arranca vacía (no se migra). Mitiga: el
  seeder recarga el catálogo; el demo se recarga con el botón. Los datos pasan a vivir en el disco de
  la EC2 (volumen `mongo-data`); sin los backups gestionados de Atlas. Pérdida del volumen = pérdida de datos.
- **Memoria en la EC2 (t4g.small, 2 GB):** se suma el container Mongo (~100–200 MB). Debería entrar, vigilar.
- **Seguridad:** Mongo sin auth, pero no expuesto fuera de `tacs-net`. Aceptable para el TP; hardening futuro = auth.
- **Paso manual de deploy:** editar el `.env` de la EC2 es responsabilidad del usuario (no se hace en esta tarea;
  no se commitea ni se deploya nada sin pedido explícito).

## Verificación

1. `docker compose config` valida el merge del YAML (sin errores).
2. `docker compose up --build` (en máquina sin conflicto de puertos, o vía el override de puertos del usuario):
   - `tacs-mongo` queda `healthy`.
   - Log del backend: "Catálogo cargado: N selecciones, M figuritas base." (o "Catálogo ya presente").
   - `GET /api/health` 200; el frontend sirve la SPA; login/registro funcionan.
3. `docker compose down && docker compose up` → los datos persisten (el catálogo no se recarga: "ya presente").
