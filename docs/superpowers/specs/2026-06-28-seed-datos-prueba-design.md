# Seed de datos de prueba (reset + cohorte demo) — Diseño

**Fecha:** 2026-06-28
**Estado:** Aprobado el enfoque; pendiente revisión de spec.
**US relacionadas:** US1–US12 (objetivo: poblar todas las pantallas para visualización y pruebas).

## Objetivo

Tener una forma simple de **resetear la base y cargar un set de datos de prueba realista**, accionable desde la **pantalla de Admin** con un botón, para poder visualizar información en todas las pantallas (sobre todo el Dashboard) y probar el sistema end-to-end.

El protagonista (`juanca`) debe ver el Dashboard **completamente poblado**: colección + faltantes (progreso), repetidas publicadas, propuestas enviadas/recibidas en varios estados, intercambios en historial, subastas activas (propias y participando), sugerencias y notificaciones.

## Decisiones tomadas (con el usuario)

1. **Entorno:** las dos (local y AWS). Comparten el mismo MongoDB Atlas, así que sembrar una vez se ve en ambas. La acción se dispara desde el frontend, que pega al backend/Atlas correspondiente.
2. **Estrategia de datos:** **reset total** (dataset limpio y conocido), no aditivo.
3. **Escala:** **grande**, ~12 usuarios (admin + protagonista + 10 contrapartes).
4. **Mecanismo:** **endpoint admin server-side** + **botón en la pantalla Admin** (no scripts externos, no seeder de boot).
5. **Guarda:** **sin flag de entorno.** La protección es: ruta admin-only (ya existente) + **modal de confirmación que exige tipear `RESET`** en la UI. Funciona contra cualquier base, incluida la de producción (decisión explícita del usuario).
6. **Catálogo:** reutilizar y extender el `FiguritaBaseSeeder` comentado (Maradona, Ronaldo, etc.).
7. **Calificaciones (US10):** **sí** se siembran (aunque el front hoy las muestre mockeadas), referenciando intercambios reales.

## Por qué este enfoque

- El **token admin orquesta todo**: cada endpoint de creación toma el id del actor en el *body/path*, no del JWT (la derivación desde el JWT es deuda técnica conocida). Reusando los **services del dominio** desde un `DemoSeedService`, los efectos colaterales (notificaciones al recibir/aceptar/rechazar propuestas, `Intercambio` al aceptar, notificaciones de subasta) ocurren **solos**, igual que en uso real.
- El **reset por API sería poco fiable**: `GET /api/figuritas` devuelve resultados *agrupados* (un id por base+owner, oculta duplicados) y `DELETE /api/usuarios/{id}` no hace cascada (deja figuritas huérfanas). Por eso el reset se hace **server-side con `MongoTemplate.dropCollection`**.

## Arquitectura / Componentes

### Backend

**1. `AdminController` — nuevo endpoint**
```
POST /api/admin/seed-demo        (hereda @PreAuthorize("hasRole('ADMIN')") de la clase)
  Body (opcional): { "reset": true }   // default true
  → 200 OK  DemoSeedResultDTO
  → 403     si no es ADMIN
```

**2. `DemoSeedService` (nuevo `@Service`)** — orquestador. Dependencias:
- `MongoTemplate` (reset por `dropCollection`).
- `PasswordEncoder` (hashear contraseñas — `UsuarioService.crear` NO hashea).
- Repos de catálogo: `SeleccionRepository`, `EquipoRepository`, `JugadorRepository`, `CategoriaFiguritaRepository`, `FiguritaBaseRepository`.
- Services de dominio: `UsuarioService`, `FiguritaService`, `SolicitudDeIntercambioService`, `SubastaService`, `OfertaService`, `SugerenciaService`.
- `IntercambioRepository` + `CalificacionService`/repo (para calificar tras los intercambios).

Método público: `DemoSeedResultDTO seed(boolean reset)`.

**3. `DemoSeedResultDTO` (nuevo)** — resumen para mostrar en la UI:
```
{
  usuarios, figuritasBase, figuritas, solicitudes, intercambios,
  subastas, ofertas, sugerencias, notificaciones, calificaciones,  // counts (int)
  protagonista: { username: "juanca", password: "demo1234" },
  admin: { username: "admin", password: "adminpass123" },
  mensaje: "..."
}
```

### Frontend

**1. `adminService.ts`** — agregar:
```ts
export interface SeedResult { /* espejo de DemoSeedResultDTO */ }
seedDemo: () => apiFetch<SeedResult>('/admin/seed-demo',
  { method: 'POST', body: JSON.stringify({ reset: true }) })
```

**2. `AdminPage.tsx`** — nueva tarjeta **"Mantenimiento de datos"** (acento rojo `#D82D31`):
- Botón **"Resetear base y cargar datos de demo"**.
- Al click → **modal** (montado condicionalmente, según convención del proyecto) con:
  - Advertencia clara de que borra **toda** la base.
  - Input de texto: el botón de confirmar queda **deshabilitado hasta tipear exactamente `RESET`**.
  - Estados: idle / loading ("Reseteando y sembrando…") / success (muestra el resumen de counts + credenciales) / error.
- En éxito: cerrar modal, mostrar resumen y **re-fetchear** `getStats()` para refrescar la pantalla.

No hay cambios de routing: la tarjeta vive en `/admin` (ya admin-only vía `PrivateRoute requiredRole="admin"`).

## Datos del escenario (determinístico)

### Catálogo (reconstruido en cada reset)
- **Selecciones (~7):** Argentina, Brasil, Francia, España, Inglaterra, Portugal, Países Bajos (con confederación CONMEBOL/UEFA).
- **Categorías (3):** Oro, Plata, Bronce.
- **Equipos (~22):** los del seeder viejo (Boca, River, Racing, San Lorenzo, Independiente, Santos, Flamengo, Corinthians, Palmeiras, Vasco, Barcelona, Real Madrid, Juventus, Liverpool, PSG, AC Milan, Manchester City) + algunos extra (Bayern, Chelsea, Inter, Atlético Madrid, Ajax).
- **Jugadores (~30):** los del seeder viejo + estrellas actuales por selección (Messi, Julián Álvarez, Dibu Martínez; Mbappé, Griezmann; Vinicius, Rodrygo; Pedri, Lamine Yamal; Bellingham, Kane; Cristiano, Bruno Fernandes; Van Dijk, Depay…).
- **`figuritas_base` (~80–90):** numeradas 1..N. Cada jugador en sus 3 categorías (Oro/Plata/Bronce) para dar variedad de repetidas y de búsqueda/filtros.

### Usuarios (12)
| username | rol | password | papel |
|---|---|---|---|
| `admin` | ADMIN | `adminpass123` | dispara el seed, ve `/admin` (US12) |
| `juanca` | USER | `demo1234` | **protagonista** (login para ver el dashboard lleno) |
| `sofia, mateo, valen, cami, nico, lucas, martina, thiago, agus, flor` | USER | `demo1234` | contrapartes |

> Contraseñas hasheadas con `PasswordEncoder` antes de persistir. El rol se setea explícitamente (no se depende del quirk `username=="admin"` de `AuthController`).

### Colecciones (la matriz)
- **`juanca`** posee ~30% del álbum (p.ej. bases 1..25 de ~80 → progreso ~31%). Un subconjunto (`Jrep`, ~8 bases) lo tiene **×2/×3** → esas son sus **publicadas/excedentes**. El resto del álbum son sus **faltantes**.
- Cada **contraparte** recibe una porción distinta y solapada, con repetidas elegidas para que:
  - **Sugerencias U↔juanca:** la contraparte tiene **×2** de alguna base que a juanca le falta **y** NO posee alguna base de `Jrep` (que juanca tiene repetida) → intercambio bidireccional viable. Al menos 3–4 contrapartes cumplen esto con juanca.
  - **Sugerencias entre contrapartes:** repetidas cruzadas también entre ellas, para datos más ricos y stats de admin.

### Propuestas (US5 / US8 / US9)
- **Recibidas por juanca (3, PENDIENTES al crearse):** `sofia`, `mateo`, `valen` crean una `SolicitudDeIntercambio` cuyo `figurita` es una instancia repetida de juanca, ofreciendo 1–2 figuritas propias. Cada `crear` **notifica a juanca** ("Nueva propuesta").
  - juanca **acepta** la de `sofia` → transfiere figuritas, crea `Intercambio` (usuarioGenerador=`sofia`, usuarioIntercambiador=`juanca`), notifica a `sofia`.
  - juanca **rechaza** la de `mateo` → notifica a `mateo`.
  - la de `valen` queda **PENDIENTE** (para ver el estado en pantalla y permitir aceptar/rechazar manualmente).
- **Enviadas por juanca (2):** juanca crea solicitudes apuntando a figuritas de `nico` y `lucas` (bases que a juanca le faltan y que ellos tienen repetidas), ofreciendo sus repetidas.
  - se **acepta** la dirigida a `nico` → `Intercambio` (usuarioGenerador=`juanca`) + notifica a juanca ("aceptada") → aparece en **historial** de juanca y como **novedad**.
  - la de `lucas` queda **PENDIENTE**.

**Restricción de ownership/orden:** aceptar transfiere figuritas (cambia owner). Se eligen **instancias distintas** para cada oferta/solicitud, de modo que una instancia consumida por una propuesta aceptada no se use en otra propuesta pendiente. Como juanca tiene repetidas (≥2 por base de `Jrep`), ofrecer una instancia deja la otra disponible.

### Subastas (US6 / US7)
- **juanca** crea 1 subasta sobre una figurita propia (instancia no consumida), luego `iniciar` → **EN_CURSO** (duración 72 h). Aparece en "mis subastas". 1–2 contrapartes **ofertan** → la subasta de juanca recibe ofertas.
- **2–3 contrapartes** crean subastas y las inician; **juanca oferta** en una → aparece en "participando" y en "subastas activas" del dashboard.
- **1 subasta con condiciones** (p.ej. `{tipo:"seleccion", valor:"Argentina"}`), asegurando que al menos una oferta cumpla.
- Las ofertas usan figuritas **realmente poseídas** por el ofertante (no consumidas).

### Calificaciones (US10)
- Tras crear los `Intercambio` (de las propuestas aceptadas), se consultan vía `IntercambioRepository.findAll()` y por cada uno se crean `Calificacion` en ambas direcciones (p.ej. juanca↔sofia con notas 4–5). Referencian el `Intercambio` real.

### Sugerencias (US4)
- **`SugerenciaService.regenerarTodas()` se llama al final**, después de todas las transferencias de ownership, para que reflejen el estado final.

### Notificaciones (US11) y Stats (US12)
- Se generan **solas** por los flujos de propuestas/subastas. juanca queda con varias (propuesta recibida, aceptada, rechazada, posiblemente subasta) → alimentan "novedades/alertas" del dashboard. Las stats de admin se nutren del volumen de usuarios/figuritas/subastas/ofertas.

## Orden de ejecución en `seed(reset)`
1. Si `reset`: `dropCollection` de las 15 colecciones.
2. Catálogo: selecciones → categorías → equipos → jugadores → figuritas_base.
3. Usuarios (password encodeada, rol explícito).
4. Colecciones (instancias de figurita por la matriz).
5. Propuestas: crear recibidas → aceptar/rechazar; crear enviadas → aceptar una.
6. Subastas: crear → iniciar → ofertar (incluida una con condiciones).
7. Calificaciones sobre los intercambios resultantes.
8. `regenerarTodas()` (sugerencias).
9. Construir y devolver `DemoSeedResultDTO` con los counts reales (consultando repos).

## Contrato del endpoint
- **Request:** `POST /api/admin/seed-demo` con `Authorization: Bearer <jwt admin>`, body `{ "reset": true }` (opcional, default true).
- **Response 200:** `DemoSeedResultDTO` (counts + credenciales + mensaje).
- **403** si el token no tiene rol ADMIN.
- Sin transacción global (Atlas es replica set pero el seed es grande; ante fallo parcial el usuario re-ejecuta, que vuelve a resetear). El método loguea cada etapa.

## Lista exacta de colecciones a dropear (reset)
`usuarios`, `figuritas`, `figuritas_base`, `categorias_figurita`, `condiciones`, `equipos`, `jugadores`, `selecciones`, `intercambios`, `notificaciones`, `ofertas`, `solicitudes_intercambio`, `subastas`, `sugerencias`, `calificaciones`.

## Cómo se usa
1. Login como `admin` / `adminpass123` (si la base está vacía, registrar `admin` primero — el JWT es stateless, sobrevive al reset 24 h).
2. Ir a `/admin` → tarjeta "Mantenimiento de datos" → botón → tipear `RESET` → confirmar.
3. Ver el resumen. Logout y login como `juanca` / `demo1234` para ver el dashboard poblado.
4. Funciona igual apuntando a local o a AWS (mismo backend/Atlas).

## Testing
- **Backend:** test unitario de `DemoSeedService` con mocks de repos/services verificando: que `reset=true` invoca `dropCollection` de las 15 colecciones; que se crean usuarios con password **encodeada** y roles correctos; que `regenerarTodas()` se llama **al final**. Verificación de interacciones (estilo Mockito, consistente con los tests existentes). Test de que el endpoint exige ADMIN (`@WebMvcTest` o verificación de seguridad, si la infra lo permite; si no, documentarlo como verificación manual).
- **Frontend (vitest):** test de que el botón de confirmar del modal está **deshabilitado hasta tipear `RESET`**, y que `adminService.seedDemo()` hace `POST /admin/seed-demo`.
- **Verificación manual (checklist):** ejecutar el botón → login `juanca` → confirmar que cada sección del dashboard tiene datos (progreso, publicadas, recibidas/enviadas con estados, subastas activas, sugerencias, novedades) y que `/admin` muestra stats no vacías.

## Fuera de alcance
- **Subasta finalizada con ganador**: no se siembra determinísticamente (duración mínima 1 h, `horaFin` queda en el futuro). Quedan EN_CURSO. (El job programado las finaliza si se las deja correr.)
- Integración Telegram; cálculo de reputación/promedio (US10 solo persiste `Calificacion` cruda); búsqueda server-side (US3).

## Riesgos / Notas
- **Destructivo por diseño**: borra TODA la base apuntada (local y AWS comparten Atlas). La guarda es la confirmación tipeada en la UI; el usuario aceptó el riesgo explícitamente.
- **Bootstrap del admin**: para llamar al endpoint hace falta un token admin previo. Tras el reset, `admin` se recrea con `adminpass123`. Si la base arranca vacía, registrar `admin` una vez antes.
- **Acoplamiento `DemoSeedService` ↔ modelo**: vive en `service/DemoSeedService.java` (orquestador) y el DTO en `dtos/DemoSeedResultDTO.java`; es código de demo, no de negocio. Documentar como tal en su Javadoc.
