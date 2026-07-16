# TACS — TP Grupo 3

## Descripción del Proyecto

TACS es una plataforma para el intercambio de figuritas del Mundial de Fútbol 2026.

* **Propósito:** Facilitar que los usuarios publiquen figuritas repetidas, busquen coincidencias con otros usuarios, realicen propuestas de intercambio, completen operaciones dentro de la plataforma y publiquen subastas de figuritas repetidas.
* **Funcionalidades principales:**
    * Autenticación y gestión de cuentas
    * Búsqueda y filtrado de figuritas disponibles
    * Propuestas de intercambio entre usuarios
    * Gestión de propuestas (aceptar/rechazar)
    * Colección personal y tracking de figuritas
    * Notificaciones de actividad
    * Historial de intercambios completados
    * Subastas de figuritas (crear, listar, participar, pujar)
* **Pendientes principales** (detalle en Cobertura de User Stories):
    * US11 — alertas proactivas por cierre de subasta
    * Load test (Vegeta/wrk)

## Equipo

* Hwang, Min Jun
* Sicher, Matias

## Requisitos previos

| Herramienta | Versión mínima |
| :--- | :--- |
| Docker | 24+ |
| Docker Compose | v2 (incluido en Docker Desktop) |

---

## Cómo levantar la aplicación (Local)

La app es autocontenida: docker compose levanta frontend, backend y la base MongoDB (con un volumen para que los datos persistan). No hace falta ninguna cuenta ni base externa.

```bash
# Desde la raíz del repositorio
cp .env.example .env       # primera vez: crea el .env con un JWT_SECRET de desarrollo
docker compose up --build

```

> **Auto-seed al primer arranque**
>
> Con un volumen de Mongo vacío, el backend siembra automáticamente el escenario de demo (3 protagonistas + admin + una semana de actividad simulada) al terminar de levantar — no hace falta tocar nada. Es idempotente: en reinicios posteriores respeta los datos (no re-siembra ni borra). Para volver a sembrar desde cero: `docker compose down -v` y volvé a levantar, o usá el botón de Admin. Se controla con `SEED_ON_STARTUP` (prendido en el compose de dev).

Para usar MongoDB Atlas en lugar del Mongo local, descomentá y completá `SPRING_MONGODB_URI` en el `.env` (ver `.env.example`).

| URL | Descripción |
| --- | --- |
| `http://localhost` | Aplicación web (frontend) |
| `http://localhost:8080/api/health` | Health check del backend |

---

## Despliegue Online (Render)

La aplicación está alojada y desplegada utilizando múltiples servicios en [Render](https://render.com/). El despliegue se configura mediante un Blueprint (archivo `render.yaml`) que divide la aplicación en tres microservicios utilizando entornos de Docker.

### Servicios Desplegados:

1. **Frontend (React/Nginx):** `https://tacs-frontend.onrender.com`
2. **Backend (Spring Boot):** `https://tacs-backend-25gc.onrender.com`
3. **Telegram Bot:** `https://tacs-telegram-bot.onrender.com`

### Configuración del Entorno de Producción:

* **Variables de Entorno (Dashboard de Render):** Las variables sensibles no se versionan. Se inyectan manualmente en la plataforma:
* `SPRING_MONGODB_URI`: Apunta a la instancia de base de datos en producción (ej. Atlas).
* `TELEGRAM_BOT_TOKEN`: Token provisto por BotFather para el microservicio del bot.
* `JWT_SECRET`: Se utiliza la opción `generateValue: true` de Render para crear una firma criptográfica segura autogenerada.


* **Perfiles de Spring:** El backend se ejecuta con la variable `SPRING_PROFILES_ACTIVE=docker`, mapeando directamente contra la configuración de `application-docker.properties`.
* **Comunicación Interna:** El servicio del bot de Telegram se comunica con la API mediante la variable de entorno `BACKEND_URL` configurada con la URL pública del backend de Render.
* **TLS / HTTPS:** La terminación SSL/TLS es administrada automáticamente por Render en el edge para todos los servicios, por lo que no se requiere configuración manual de certificados o proxies inversos en los contenedores.

---

## Usuarios de prueba

Los datos se persisten en la base de datos de producción o en el volumen local (`mongo-data`), por lo que sobreviven al reinicio de los contenedores.
Se pueden crear usuarios a través del formulario de registro en la UI. **Por seguridad, todos los registros públicos se asignan forzosamente con rol `USER`.**

### Cargar datos de demo (reset + seed)

Para poblar el sistema con un escenario realista y poder visualizar/probar todas las pantallas, hay un botón en la pantalla de Admin:

1. Logueate como admin / `adminpass123` (si la base está vacía y no sembró automático, registralo primero desde la UI o usa el auto-seeder).
2. Andá a `/admin` → tarjeta "Mantenimiento de datos" → botón "Resetear base y cargar datos de demo".
3. En el modal, escribí `RESET` para habilitar la confirmación.

Al terminar verás un resumen. Logueate como `juanca`, `sofia` o `mateo` (password `demo1234`) para ver el dashboard completo de cada protagonista.

> ⚠️ **Acción destructiva:** El endpoint POST `/api/admin/seed-demo` (admin-only) hace `dropCollection` de todas las colecciones antes de sembrar. La única guarda es el rol ADMIN + la confirmación tipeada en la UI.

**Cohorte sembrada:** admin (ADMIN, `adminpass123`) + 3 protagonistas (`juanca`, `sofia`, `mateo`) + 8 de reparto (`valen`, `cami`, `nico`, `lucas`, `martina`, `thiago`, `agus`, `flor`) — todos con password `demo1234`. Cada protagonista ejercita el set completo de User Stories y la actividad está repartida a lo largo de la última semana.

---

## Comandos útiles (Desarrollo Local)

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

## Componentes

| Servicio | Tecnología | Puerto |
| --- | --- | --- |
| **frontend** | React 19 + Vite + TailwindCSS 4 → build estático servido por Nginx | `80` |
| **backend** | Spring Boot 4 + Java 21 + Lombok | `8080` |
| **mongo** | MongoDB 7 (container, volumen `mongo-data`) | `27017` (solo dentro de `tacs-net`) |
| **telegram-bot** | Microservicio independiente | N/A |

Ambos (front/back) corren en una red Docker interna (`tacs-net`). El frontend nunca habla directamente con el backend desde el browser en desarrollo local — todo pasa por el proxy de Nginx. Esto elimina problemas de CORS.

---

## Decisiones de diseño

### Backend

* **Arquitectura en capas:** Controller → Service → Repository, separando responsabilidades y facilitando el testing unitario de cada capa y posterior migrado a microservicios.
* **Spring Boot 4 / Java 21:** se eligió la versión más reciente estable.
* **DTOs para respuestas serializadas:** Ejemplo: `FiguritaResponseDTO` para evitar serializar IDs sin resolver. Patrón: Repository devuelve DTO mapeado en lugar de entidades con referencias lazy.
* **Custom Repository Queries:** Ejemplo: `FiguritaRepository.findRepetidas(usuarioId)` con lógica de grouping y filtering en el repositorio.
* **Excepciones y Validación (RFC 7807):** Uso de un `GlobalExceptionHandler` (`@RestControllerAdvice`) que estandariza las respuestas `400 Bad Request`, `404 Not Found` y `409 Conflict` usando el formato de Problem Details de Spring. Todas las peticiones entrantes son validadas con Jakarta (`@Valid`, `@NotBlank`, etc.).

### Persistencia y Concurrencia

* **MongoDB:** base NoSQL orientada a documentos (formato tipo JSON), escalable. Database: `tacs`.
* **Concurrencia Optimista:** Se agregó la anotación `@Version` a las colecciones principales (`SolicitudDeIntercambio`, `Figurita`, `Subasta`) para delegar al motor el control del problema de *Lost Update*.
* **Transacciones Multidocumento:** Habilitado el bean `MongoTransactionManager` para permitir el uso de `@Transactional`, garantizando operaciones atómicas seguras.
* **Actualizaciones Atómicas:** Reemplazo de flujos de lectura-modificación por el uso directo de `findAndModify` atómico (ej. para el método `aceptar()` de un intercambio).

### Colecciones principales en MongoDB:

* `usuarios`, `figuritas`, `figuritas_base`, `solicitudes_intercambio`, `intercambios`, `notificaciones`, `subastas`, `ofertas`, `sugerencias`.

### Frontend

* **React 19 + Vite + TailwindCSS 4:** Stack moderno, rápido en el desarrollo y buen rendimiento en builds.
* **Sin mocks de integración:** Toda la funcionalidad, incluyendo la edición del perfil de usuario y el cálculo del componente dinámico de reputación encadenado, se conecta a la API productiva mediante `fetch` o `React Query`.
* **Lazy loading de páginas:** importación con `React.lazy()`.
* **Roles de usuario:** `PrivateRoute` soporta un `requiredRole` opcional.

---

## Cobertura de User Stories

Leyenda: ✅ completo · ⚠️ parcial · ❌ no implementado

| US | Descripción | Backend | Frontend | Estado |
| --- | --- | --- | --- | --- |
| **US1** | Publicar figurita (nº, selección/equipo/categoría, jugador, modalidad directo/subasta) | ✅ | ✅ | **Completo** - `FiguritaPublicada` persiste publicaciones con estado y fecha. |
| **US2** | Registrar figuritas faltantes | ✅ | ✅ | **Completo** |
| **US3** | Buscar con filtros (nº, selección, equipo, categoría…) | ✅ | ✅ | **Completo** - `FiguritaController.getAll` acepta filtros server-side con paginado. |
| **US4** | Sugerencias automáticas de intercambio | ✅ | ✅ | **Completo** - Matching persistido, job diario 3 AM + endpoint admin de regeneración. |
| **US5** | Proponer intercambio (1+ figuritas ofrecidas) | ✅ | ✅ | **Completo** |
| **US6** | Publicar subasta (duración + condiciones) | ✅ | ✅ | **Completo** |
| **US7** | Ofertar en subasta | ✅ | ✅ | **Completo** |
| **US8** | Ver publicaciones/propuestas/subastas y estado | ✅ | ✅ | **Completo** - Dashboard con datos reales y progreso de colección. |
| **US9** | Aceptar / rechazar propuestas | ✅ | ✅ | **Completo** - Transfiere figuritas atómicamente, crea Intercambio y notifica. |
| **US10** | Calificar / reputación | ✅ | ✅ | **Completo** - Histograma 1–5★ y widget real vía `useReputacion`. |
| **US11** | Alertas (faltante / subasta / nueva propuesta) | ✅ | ✅ | ⚠️ **Parcial** - Pendiente alerta proactiva temporal por cierre inminente de subasta. |
| **US12** | Estadísticas de admin | ✅ | ✅ | **Completo** |

---

## Testing

**Estado actual:** 78 tests unitarios de services (JUnit 5 + Mockito con mocks de repositorios y del nuevo `MongoTemplate` de la actualización concurrente).

```bash
cd backend && ./mvnw test

```

**Pendiente:**

* Tests de controllers (`@WebMvcTest` / `MockMvc`) e integración (`@DataMongoTest` / Testcontainers).
* Ampliar cobertura de subastas/ofertas.

---

## Seguridad

* **Contraseñas:** hasheadas con BCrypt (`BCryptPasswordEncoder`) antes de persistir.
* **Autenticación:** Filtro JWT interceptando excepciones de expiración o tokens inválidos para retornar prolijamente `401 Unauthorized` vía JSON. Sesiones STATELESS.
* **Prevención de Escalamiento:** El endpoint de `/register` fue corregido para que no sea posible crear usuarios asignando un bypass del rol `ADMIN`.
* **Secreto JWT:** Vigencia del token de 24 h. Inyectado por entorno local (`.env`) o de producción (Render).
* **Autorización:** endpoints de administración protegidos con `@PreAuthorize("hasRole('ADMIN')")`.

---

## Uso de IA

Durante el desarrollo se utilizó Claude (familia 4.x, Sonnet/Opus) a través de Claude Code —el CLI agéntico de Anthropic— como asistente de pair programming. Los archivos `CLAUDE.md` (raíz, `backend/`, `frontend/`) y `frontend/frontend-guidelines.md` son el contexto que consumen esos asistentes.
La herramienta fue utilizada como apoyo (validación de diseño, configuración Docker, maquetación UI), manteniendo siempre una revisión y adaptación manual del código y las transacciones generadas.

---

## 📁 Estructura del proyecto

```text
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
│   │   ├── pages/            # Páginas por feature
│   │   ├── components/       # Componentes reutilizables
│   │   ├── services/         # Llamadas a la API + mappers
│   │   ├── types/            # Tipos TypeScript del dominio
│   │   └── router/           # Definición de rutas
│   ├── nginx.conf
│   └── Dockerfile
├── telegram-bot/             # Bot integrado
│   └── Dockerfile
└── docker-compose.yml

```

```

```
