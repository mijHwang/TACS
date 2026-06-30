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

- US10 — sistema de reputación (hoy solo CRUD de calificaciones, sin promedio)
- US11 — alertas proactivas (figurita faltante / subasta por finalizar)
- US3 — búsqueda con filtros del lado del servidor
- **Integración con Telegram** y **load test (Vegeta/wrk)** — requeridos para promoción

## Equipo

- Hwang, Min Jun
- Sicher, Matias
- Abascal, Nicolas

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Docker | 24+ |
| Docker Compose | v2 (incluido en Docker Desktop) |

---

## Cómo levantar la aplicación

```bash
# Desde la raíz del repositorio
docker compose up --build
```

### Online (AWS)
La aplicación está alojada en una instancia AWS y accesible por HTTPS. URL principal (detrás de Cloudflare):
```
https://tacs-g3-figuritas.dev/
```

| URL | Vía | Notas |
|---|---|---|
| `https://tacs-g3-figuritas.dev` | **Cloudflare** (proxy/CDN) → EC2 | Dominio `.dev` (Name.com) delegado a Cloudflare. CDN + DDoS + SSL en el borde. **Principal.** |
| `https://tacs-g3-figuritas.duckdns.org` | Directo a la EC2 (Let's Encrypt) | Sigue activo en paralelo (acceso directo al origen). |

Ambos resuelven a la IP elástica `34.195.221.240`. Cloudflare termina el TLS público con su Universal SSL y reconecta al origen en **Full (strict)** validando un Cloudflare Origin Certificate instalado en Nginx.

| URL | Descripción |
|---|---|
| `http://localhost` | Aplicación web (frontend) |
| `http://localhost:8080/api/health` | Health check del backend |

#### Deploy con HTTPS (Let's Encrypt)

El TLS se sirve desde el Nginx del frontend con certificados gratuitos de Let's Encrypt,
renovados automáticamente por un contenedor `certbot`. Toda la config vive en el repo y se
activa con un **override de producción** (`docker-compose.prod.yml`), así el `docker compose up`
de desarrollo —que usa el `nginx.conf` HTTP simple— no se ve afectado.

**Requisitos previos en la EC2:** el dominio resuelve a la IP pública + puertos **80 y 443**
abiertos en el Security Group.

```bash
# 1) (UNA sola vez) emitir el certificado
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh

# 2) Levantar/actualizar el deploy con HTTPS
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Las siguientes veces alcanza con el paso 2. El certificado se renueva solo (certbot cada 12h;
Nginx recarga cada 6h). Los certificados se generan bajo `./certbot/` (gitignored, nunca se commitean).

| Archivo | Rol |
|---|---|
| `frontend/nginx.prod.conf` | Server 443 con TLS + redirect 80→443 + challenge ACME |
| `docker-compose.prod.yml` | Expone 443, monta certs, agrega el contenedor `certbot` |
| `init-letsencrypt.sh` | Bootstrap del certificado (1ra vez) |

#### Cloudflare (CDN + DDoS + edge SSL)

El dominio `tacs-g3-figuritas.dev` (Name.com) está **delegado a Cloudflare** (nameservers de
Cloudflare) y proxeado (nube naranja). Cloudflare aporta CDN, protección DDoS y SSL en el borde,
y reconecta al origen en modo **Full (strict)**.

- **DNS (Cloudflare):** registro `A @ → 34.195.221.240` (Proxied) + `A www → 34.195.221.240` (Proxied).
- **Edge ↔ navegador:** Universal SSL (cert gratis de Cloudflare para el dominio).
- **Cloudflare ↔ origen:** un **Cloudflare Origin Certificate** (15 años) instalado en Nginx. El
  `server` block de `tacs-g3-figuritas.dev` en `frontend/nginx.prod.conf` lo usa y se selecciona por
  SNI; el bloque del DuckDNS sigue como default para acceso directo a la IP.
- **IP real:** Nginx usa `real_ip` con los rangos de Cloudflare (`CF-Connecting-IP`), así el backend
  ve la IP del visitante y no la de Cloudflare.
- El cert/key de origen viven en `./cloudflare/` en la EC2 (**gitignored**, nunca se commitean). Para
  rotarlos: regenerar el Origin Certificate en Cloudflare, reemplazar `cloudflare/origin.{pem,key}` y
  recrear el contenedor `frontend`.

### Usuarios de prueba

> Los datos se persisten en **MongoDB Atlas**, por lo que **sobreviven** al reinicio de los contenedores.

Se puede crear usuarios a través del formulario de registro en la UI. El usuario con username `admin` recibe rol ADMIN; el resto, rol USER.

#### Cargar datos de demo (reset + seed)

Para poblar el sistema con un escenario realista y poder visualizar/probar todas las pantallas, hay un botón en la pantalla de **Admin**:

1. Logueate como **`admin`** / `adminpass123` (si la base está vacía, registralo primero desde la UI; el username `admin` recibe rol ADMIN automáticamente).
2. Andá a **`/admin`** → tarjeta **"Mantenimiento de datos"** → botón **"Resetear base y cargar datos de demo"**.
3. En el modal, escribí **`RESET`** para habilitar la confirmación.
4. Al terminar verás un resumen (usuarios, figuritas, propuestas, subastas, etc.). Logueate como **`juanca`** / `demo1234` para ver el dashboard completo.

> ⚠️ **Acción destructiva.** El endpoint `POST /api/admin/seed-demo` (admin-only) hace `dropCollection` de **todas** las colecciones antes de sembrar. Como local y el deploy comparten cluster de Atlas, **no lo ejecutes contra la base de producción** salvo que realmente quieras resetearla. La única guarda es el rol ADMIN + la confirmación tipeada en la UI (decisión de diseño: sin flag de entorno).

**Cohorte sembrada:** `admin` (ADMIN) + `juanca` (protagonista) + 10 contrapartes (`sofia`, `mateo`, `valen`, `cami`, `nico`, `lucas`, `martina`, `thiago`, `agus`, `flor`) — todas con password **`demo1234`**. Incluye catálogo de 48 figuritas, colecciones con repetidas/faltantes, propuestas en sus 3 estados, intercambios, subastas activas con ofertas, calificaciones y sugerencias. La lógica vive en `DemoSeedService` (backend) y `SeedDemoCard` (frontend).

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
|**persistencia**|Mongo Atlas Cloud|DB nombre: tacs |

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
| US1 | Publicar figurita (nº, selección/equipo/categoría, jugador, **cantidad**, **modalidad** directo/subasta) | ⚠️ | ❌ sin alta | ⚠️ el modelo `Figurita` no guarda cantidad ni modalidad; no hay form de publicación |
| US2 | Registrar figuritas faltantes | ✅ | ✅ | ✅ |
| US3 | Buscar con filtros (nº, selección, jugador…) | ⚠️ | ✅ | ⚠️ no hay búsqueda con filtros server-side; el frontend filtra el `getAll` |
| US4 | Sugerencias automáticas de intercambio | ✅ | ✅ | ✅ matching bidireccional persistido (colección `sugerencias`), job diario 3 AM + endpoint admin `/api/sugerencias/regenerar`, página `/sugerencias` que prearma la propuesta |
| US5 | Proponer intercambio (1+ figuritas ofrecidas) | ✅ | ✅ | ✅ |
| US6 | Publicar subasta (duración + condiciones) | ✅ | ✅ | ✅ |
| US7 | Ofertar en subasta | ✅ | ⚠️ | ⚠️ backend OK; la UI oferta con `MOCK_MY_STICKERS` |
| US8 | Ver publicaciones/propuestas/subastas y estado | ✅ | ✅ | ✅ Dashboard con datos reales vía `dashboardService`: figuritas publicadas, propuestas enviadas/recibidas, subastas activas, alertas; bonus: progreso de colección (US2) y acciones rápidas |
| US9 | Aceptar / rechazar propuestas | ✅ | ✅ | ✅ aceptar transfiere figuritas, crea `Intercambio` y notifica |
| US10 | Calificar / reputación | ⚠️ CRUD | ❌ mock | ❌ sin cálculo de reputación ni validación de intercambio previo |
| US11 | Alertas (figurita faltante / subasta por finalizar / nueva propuesta) | ⚠️ | ⚠️ | ⚠️ solo notificaciones in-app por evento; alertas proactivas son stubs |
| US12 | Estadísticas de admin | ✅ | ✅ | ⚠️ stats limitadas a subastas/ofertas/usuarios |

**Requisitos de promoción aún ausentes:** integración con **Telegram** (cero código) y **load test** (Vegeta/wrk). **NFR pendiente:** Javadoc en métodos no triviales.

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


Debemos levantarlo en nube, meterle un cloudflare para evitar constantes requests.

Que arme escenarios reales para tests. 