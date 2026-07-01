# TACS — TP Grupo 3


## Descripción del Proyecto

**TACS** es una plataforma para el intercambio de figuritas del Mundial de Fútbol 2026.

**Propósito:** Facilitar que los usuarios publiquen figuritas repetidas, busquen coincidencias 
con otros usuarios, realicen propuestas de intercambio, completen operaciones dentro de la plataforma y publiquen subastas de figuritas repetidas

**Funcionalidades principales:**

- Autenticación y gestión de cuentas
- Búsqueda y filtrado de figuritas disponibles
- Propuestas de intercambio entre usuarios
- Gestión de propuestas (aceptar/rechazar)
- Colección personal y tracking de figuritas
- Notificaciones de actividad
- Historial de intercambios completados
- Subastas de figuritas (crear, listar, participar, pujar)

**Pendientes principales** (detalle en [Cobertura de User Stories](#cobertura-de-user-stories)):

- US11 — alertas proactivas por cierre de subasta
- **Load test (Vegeta/wrk)**

## Equipo

- Hwang, Min Jun
- Sicher, Matias

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Docker | 24+ |
| Docker Compose | v2 (incluido en Docker Desktop) |

---

## Cómo levantar la aplicación

La app es **autocontenida**: `docker compose` levanta frontend, backend **y la base MongoDB**
(con un volumen para que los datos persistan). No hace falta ninguna cuenta ni base externa.

```bash
# Desde la raíz del repositorio
cp .env.example .env       # primera vez: crea el .env con un JWT_SECRET de desarrollo
docker compose up --build
```

> **Auto-seed al primer arranque:** con un volumen de Mongo vacío, el backend siembra automáticamente
> el escenario de demo (3 protagonistas + admin + una semana de actividad simulada) al terminar de
> levantar — no hace falta tocar nada. Es **idempotente**: en reinicios posteriores respeta los datos
> (no re-siembra ni borra). Para volver a sembrar desde cero: `docker compose down -v` y volvé a
> levantar, o usá el botón de Admin. Se controla con `SEED_ON_STARTUP` (prendido en el compose de dev,
> **apagado en `docker-compose.prod.yml`** para no tocar la base de producción).

> Para usar **MongoDB Atlas** en lugar del Mongo local, descomentá y completá `SPRING_MONGODB_URI`
> en el `.env` (ver `.env.example`).

### Online (AWS)
La aplicación está alojada en una instancia AWS y accesible por HTTPS. URL principal (detrás de Cloudflare):
```
https://tacs-g3-figuritas.dev/
```

El dominio es **`tacs-g3-figuritas.dev`** (registrado en **Name.com**, gratis vía GitHub Student Pack), delegado a **Cloudflare** (proxy/CDN/DDoS) y apuntando a la IP elástica `34.195.221.240`. Cloudflare termina el TLS público con su Universal SSL y reconecta al origen en **Full (strict)** validando un Cloudflare Origin Certificate instalado en Nginx.

> **DuckDNS quedó deprecado.** El dominio que se usa es el de Name.com (`.dev`). El viejo `tacs-g3-figuritas.duckdns.org` (con su cert de Let's Encrypt) puede seguir resolviendo a la EC2 como remanente, pero **ya no se usa** y queda pendiente de limpieza del server.

| URL | Descripción |
|---|---|
| `http://localhost` | Aplicación web (frontend) |
| `http://localhost:8080/api/health` | Health check del backend |

#### Deploy con HTTPS (Cloudflare)

El TLS público lo termina **Cloudflare** (Universal SSL), que reconecta al origen en modo
**Full (strict)** validando un **Cloudflare Origin Certificate** (15 años) instalado en el Nginx
del frontend. Toda la config de prod vive en el repo y se activa con un **override de producción**
(`docker-compose.prod.yml`), así el `docker compose up` de desarrollo —que usa el `nginx.conf` HTTP
simple— no se ve afectado.

**Requisitos previos en la EC2:** el dominio resuelve vía Cloudflare a la IP pública + puertos
**80 y 443** abiertos en el Security Group + el Origin Certificate presente en `./cloudflare/`.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

> **Base de datos en el server:** el override de prod hereda el servicio `mongo` del compose base,
> así que el servidor usa **su propio MongoDB en Docker** (volumen `mongo-data` en el disco de la EC2).
> Para que el backend lo use, el `.env` de la EC2 **no debe** setear `SPRING_MONGODB_URI` (o dejarlo
> comentado); si apunta a Atlas, seguirá usando Atlas. La base del server arranca vacía la primera vez;
> el **auto-seed de arranque está apagado en prod** (`SEED_ON_STARTUP=false` en `docker-compose.prod.yml`),
> así que el demo se carga manualmente con el botón de Admin (el seeder recarga el catálogo).
>
> Además, generá un `JWT_SECRET` propio en el `.env` de la EC2 — **no** dejes el valor de desarrollo
> de `.env.example`, que es público (firmar tokens con él permitiría falsificarlos).

| Archivo | Rol |
|---|---|
| `frontend/nginx.prod.conf` | Server 443 con el Origin Certificate + `real_ip` de Cloudflare; redirect 80→443 |
| `docker-compose.prod.yml` | Expone 443 y monta `./cloudflare` (el cert de origen) |

**Cómo está armado Cloudflare:**

- **DNS (Cloudflare):** `A @ → 34.195.221.240` (Proxied) + `A www → 34.195.221.240` (Proxied).
- **Edge ↔ navegador:** Universal SSL (cert gratis de Cloudflare para el dominio).
- **Cloudflare ↔ origen:** el Origin Certificate (SAN `tacs-g3-figuritas.dev` + `*.`) se selecciona
  por SNI en `frontend/nginx.prod.conf` y es el `default_server` 443.
- **IP real:** Nginx usa `real_ip` con los rangos de Cloudflare (`CF-Connecting-IP`), así el backend
  ve la IP del visitante y no la de Cloudflare.
- El cert/key de origen viven en `./cloudflare/origin.{pem,key}` en la EC2 (**gitignored**, nunca se
  commitean). **Rotación:** regenerar el Origin Certificate en Cloudflare, reemplazar esos 2 archivos
  y recrear el contenedor `frontend`.

> El setup anterior con DuckDNS + Let's Encrypt (`certbot`, `init-letsencrypt.sh`) fue **removido**:
> el dominio en uso es el de Name.com vía Cloudflare.

### Usuarios de prueba

> Los datos se persisten en el **MongoDB del container** (volumen `mongo-data`), por lo que **sobreviven** al reinicio de los contenedores. Se borran solo con `docker compose down -v`.

Se puede crear usuarios a través del formulario de registro en la UI. El usuario con username `admin` recibe rol ADMIN; el resto, rol USER.

#### Cargar datos de demo (reset + seed)

Para poblar el sistema con un escenario realista y poder visualizar/probar todas las pantallas, hay un botón en la pantalla de **Admin**:

1. Logueate como **`admin`** / `adminpass123` (si la base está vacía, registralo primero desde la UI; el username `admin` recibe rol ADMIN automáticamente).
2. Andá a **`/admin`** → tarjeta **"Mantenimiento de datos"** → botón **"Resetear base y cargar datos de demo"**.
3. En el modal, escribí **`RESET`** para habilitar la confirmación.
4. Al terminar verás un resumen (usuarios, figuritas, publicaciones, propuestas, subastas, etc.). Logueate como **`juanca`**, **`sofia`** o **`mateo`** / `demo1234` para ver el dashboard completo de cada protagonista.

> El mismo escenario se siembra **automáticamente** al levantar el docker con un Mongo vacío (ver la nota de *auto-seed* en "Cómo levantar la aplicación"); el botón sirve para **re-sembrar** o para bases que ya tienen datos.

> ⚠️ **Acción destructiva.** El endpoint `POST /api/admin/seed-demo` (admin-only) hace `dropCollection` de **todas** las colecciones antes de sembrar. Afecta **solo a la base donde lo corras** (local y servidor ahora tienen cada uno su propio Mongo en Docker, ya no comparten cluster de Atlas). Aun así, **no lo ejecutes contra la base del servidor** salvo que realmente quieras resetearla. La única guarda es el rol ADMIN + la confirmación tipeada en la UI (decisión de diseño: sin flag de entorno).

**Cohorte sembrada:** `admin` (ADMIN, `adminpass123`) + **3 protagonistas** (`juanca`, `sofia`, `mateo`) + 8 de reparto (`valen`, `cami`, `nico`, `lucas`, `martina`, `thiago`, `agus`, `flor`) — todos con password **`demo1234`**. Cada protagonista ejercita el set completo de User Stories y la actividad está **repartida a lo largo de la última semana** (backdating de fechas sobre un catálogo real del Mundial): publicaciones (US1), colecciones con repetidas/faltantes (US2), propuestas enviadas/recibidas en sus 3 estados (US5/US9), subastas activas con ofertas + una finalizada (US6/US7), calificaciones/reputación (US10), sugerencias bidireccionales (US4) y notificaciones repartidas en varios días. La lógica vive en `DemoSeedService` (backend, con `DemoTimeline` para el backdating de fechas e `InstancePool` para no asignar la misma figurita a dos actividades), el auto-seed de arranque en `DemoSeedBootstrap`, y `SeedDemoCard` (frontend).

### Comandos útiles

```bash
# Levantar en background
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend

# Bajar todo y eliminar contenedores
docker compose down
```

---

### Componentes

| Servicio | Tecnología | Puerto |
|---|---|---|
| **frontend** | React 19 + Vite + TailwindCSS 4 → build estático servido por Nginx | 80 |
| **backend** | Spring Boot 4 + Java 21 + Lombok | 8080 |
| **mongo** | MongoDB 7 (container, volumen `mongo-data`) | 27017 (solo dentro de `tacs-net`) |

Ambos corren en una red Docker interna (`tacs-net`). El frontend **nunca habla directamente con el backend desde el browser** — todo pasa por el proxy de Nginx. Esto elimina problemas de CORS.

---

## Decisiones de diseño

### Backend

- **Arquitectura en capas**: `Controller → Service → Repository`, separando responsabilidades y facilitando el testing unitario de cada capa y posterior migrado a microservicios.
- **Spring Boot 4 / Java 21**: se eligió la versión más reciente estable.
- DTOs para respuestas serializadas [NEW: Document pattern used in Subastas]
  Ejemplo: FiguritaResponseDTO para evitar serializar IDs sin resolver en la respuesta de /figuritas/repetidas
  Patrón: Repository devuelve DTO mapeado en lugar de entidades con referencias lazy
- Custom Repository Queries [NEW: Document pattern used]
  Ejemplo: FiguritaRepository.findRepetidas(usuarioId) con lógica de grouping y filtering en el repositorio

### Frontend

- **React 19 + Vite**: stack moderno, rápido en el desarrollo y buen rendimiento en builds.
- **TailwindCSS 4**: Nos permite iterar en la UI sin escribir CSS custom.
- **Lazy loading de páginas**: todas las páginas se importan con `React.lazy()` para que solo se descarguen cuando el usuario las visita.
- **Roles de usuario**: `PrivateRoute` soporta un `requiredRole` opcional. La ruta `/admin` solo es accesible para usuarios con rol `admin`.

### Persistencia

- **MongoDB**: base NoSQL orientada a documentos (formato tipo JSON), escalable.
- **Database**: `tacs`
- **Connection string**: se inyecta por la variable de entorno `SPRING_MONGODB_URI` (ver `.env.example`). **Nunca** se versiona la cadena real ni credenciales en el repo:

  ```
  SPRING_MONGODB_URI=mongodb+srv://<usuario>:<password_url_encoded>@<cluster>.mongodb.net/<database>?appName=<app>
  ```

**Colecciones**
El sistema actualmente utiliza las siguientes colecciones en MongoDB:

- `usuarios` — Cuentas de usuario
- `figuritas` — Instancias de figuritas (con propietario)
- `figuritas_base` — Definición base de figuritas
- `solicitudes_intercambio` — Propuestas de intercambio
- `intercambios` — Intercambios completados
- `notificaciones` — Notificaciones para usuarios
- `subastas` — Subastas de figuritas (WIP) 
- `ofertas` — Ofertas/pujas en subastas (WIP) 
- `sugerencias` — Sugerencias de intercambio bidireccional (US4), regeneradas a diario
- Datos de referencia: `selecciones`, `equipos`, `jugadores`, `categorias_figurita`



## Cobertura de User Stories

Leyenda: ✅ completo · ⚠️ parcial · ❌ no implementado

| US | Descripción | Backend | Frontend | Estado |
|---|---|---|---|---|
| US1 | Publicar figurita (nº, selección/equipo/categoría, jugador, modalidad directo/subasta) | ✅ | ✅ | ✅ `FiguritaPublicada` persiste publicaciones con estado y fecha; frontend permite publicar repetidas para intercambio o subasta |
| US2 | Registrar figuritas faltantes | ✅ | ✅ | ✅ |
| US3 | Buscar con filtros (nº, selección, equipo, categoría…) | ✅ | ✅ | ✅ `FiguritaController.getAll` acepta filtros server-side (`numero`, `search`, `seleccion`, `equipo`, `categoria`) con paginado |
| US4 | Sugerencias automáticas de intercambio | ✅ | ✅ | ✅ matching bidireccional persistido (colección `sugerencias`), job diario 3 AM + endpoint admin `/api/sugerencias/regenerar`, página `/sugerencias` que prearma la propuesta |
| US5 | Proponer intercambio (1+ figuritas ofrecidas) | ✅ | ✅ | ✅ |
| US6 | Publicar subasta (duración + condiciones) | ✅ | ✅ | ✅ |
| US7 | Ofertar en subasta | ✅ | ✅ | ✅ |
| US8 | Ver publicaciones/propuestas/subastas y estado | ✅ | ✅ | ✅ Dashboard con datos reales vía `dashboardService`: figuritas publicadas, propuestas enviadas/recibidas, subastas activas, alertas; progreso de colección y acciones rápidas |
| US9 | Aceptar / rechazar propuestas | ✅ | ✅ | ✅ aceptar transfiere figuritas, crea `Intercambio` y notifica |
| US10 | Calificar / reputación | ✅ | ✅ | ✅ reputación = promedio + histograma 1–5★ sobre la colección `Calificacion`; front califica con estrellas (`IntercambiosPage`) y muestra el widget real (`PerfilPage` vía `useReputacion`) |
| US11 | Alertas (figurita faltante / subasta por finalizar / nueva propuesta) | ✅ | ✅ | ⚠️ notificaciones in-app por evento (nueva propuesta, figurita faltante publicada, subasta creada); pendiente: alerta proactiva por cierre de subasta |
| US12 | Estadísticas de admin | ✅ | ✅ | ✅ |

**Requisito de promoción pendiente:** **load test** (Vegeta/wrk). **NFR pendiente:** Javadoc en métodos no triviales.

## Testing

Estado actual: **78 tests unitarios** de services (JUnit 5 + Mockito con mocks de repositorios): `UsuarioServiceTest`, `SolicitudDeIntercambioServiceTest`, `FiguritaServiceTest`, `NotificacionServiceTest`, `FiguritaBaseServiceTest`, `IntercambioServiceTest`, `OfertaServiceTest`.

```bash
cd backend && ./mvnw test
```

**Pendiente:**
- Tests de controllers (`@WebMvcTest` / `MockMvc`) e integración (`@DataMongoTest` / Testcontainers) — hoy inexistentes.
- Ampliar cobertura de subastas/ofertas (hoy 1 test).
- El CI (`.github/workflows/docker-build.yml`) solo valida el build de imágenes Docker; no corre `./mvnw test` ni `npm run lint`.

## Seguridad

- **Contraseñas**: hasheadas con **BCrypt** (`BCryptPasswordEncoder`) antes de persistir; nunca en texto plano.
- **Autenticación**: JWT (HS256) emitido en `/auth/login`; el resto de endpoints requiere `Authorization: Bearer <token>` (salvo `/auth/register`). Sesiones STATELESS.
- **Secreto JWT**: se inyecta por la variable de entorno `JWT_SECRET` (binding `jwt.secret`, ver `.env.example`); **no** está hardcodeado. Vigencia del token: 24 h.
- **Credenciales**: `SPRING_MONGODB_URI` y `JWT_SECRET` viven solo en `.env` (gitignored). El repo solo versiona `.env.example` con placeholders.
- **Autorización**: endpoints de administración protegidos con `@PreAuthorize("hasRole('ADMIN')")`.

**Pendiente (hardening):**
- Restringir CORS (hoy permisivo: todos los orígenes/métodos/headers).
- Derivar el `owner` de las operaciones desde el JWT autenticado en vez del body/path.
- Reemplazar el `printStackTrace` del filtro JWT por logging.


---

## Uso de IA

Durante el desarrollo se utilizó **Claude (familia 4.x, Sonnet/Opus) a través de Claude Code** —el CLI agéntico de Anthropic— como asistente de pair programming. Los archivos `CLAUDE.md` (raíz, `backend/`, `frontend/`) y `frontend/frontend-guidelines.md` son el contexto que consumen esos asistentes. Se utilizó para:

- Desarrollo de los endpoints del backend.
- Desarrollo de las interfaces de usuario de frontend.
- Configuración de la infraestructura (Dockerfiles y docker-compose).
- Generación de estructuras base y código repetitivo.
- Validación de ideas y decisiones de diseño (principalmente UI).
- Implemetación de la persistencia.

La herramienta fue utilizada como apoyo, manteniendo revisión y adaptación manual del código generado.
---

## 📁 Estructura del proyecto

```
TACS/
├── backend/                  # Spring Boot
│   ├── src/main/java/...
│   │   ├── controller/       # REST controllers
│   │   ├── service/          # Lógica de negocio
│   │   ├── repository/       # Repositorios MongoDB (Spring Data)
│   │   └── models/           # Entidades del dominio
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── pages/            # Páginas por feature (subastas, colección, etc.)
│   │   ├── components/       # Componentes reutilizables
│   │   ├── services/         # Llamadas a la API + mappers
│   │   ├── types/            # Tipos TypeScript del dominio
│   │   └── router/           # Definición de rutas
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```
