# Colección self-service: agregar figuritas poseídas (con cantidad) y faltantes (wishlist)

**Fecha:** 2026-07-03
**Origen:** correcciones del docente (Diego) sobre el TP. El buscador ya está; falta que el usuario **construya su colección** con un form: elegir una figu del "maestro" (selección / jugador / nº) e indicar **cuántas tiene** (repetidas) o marcarla como **faltante** (sin cantidad). Eso alimenta subasta e intercambio, que ya están hechos. "El funcionamiento final del TP no es negociable."

## Objetivo

Dar al usuario final un flujo self-service para poblar su colección:

1. **Parado en mi colección → Repetidas/Todas → "Agregar Figurita"**: elige del maestro + **cantidad** → quedan N copias en su colección.
2. **Parado en mi colección → Faltantes → "Agregar Figurita"**: elige del maestro (sin cantidad) → queda declarada como faltante (**wishlist**).

Desde ahí las repetidas son seleccionables en las pantallas de subasta/intercambio existentes, y los faltantes declarados alimentan las sugerencias (US4) y las notificaciones proactivas (US11).

## Decisiones tomadas (con el usuario)

| Tema | Decisión |
|---|---|
| Semántica de "faltante" | **Lista explícita (wishlist)** que el usuario declara. La pestaña Faltantes pasa a mostrar esa lista. |
| Fuente de matching US4/US11 | **La wishlist declarada** (no el derivado "todo lo que no tenés"). |
| Semántica de cantidad al agregar poseídas | **N = total (set)**. "Tengo N de esta". Idempotente; permite corregir. |
| Ubicación del form | **Modal** reutilizable disparado desde botones "Agregar Figurita" en las pestañas. Reusa el buscador del maestro que ya usa Admin-Gift + browse paginado del álbum. |
| Bajar cantidad / borrar copia comprometida | **Cascada** (no 409): libera primero copias no comprometidas; para comprometidas desarma el compromiso y notifica; recién ahí borra la copia. |
| Cómo se "cancela" una subasta en la cascada | **Soft-cancel**: nuevo `EstadoSubasta.CANCELADA` (la notif a ofertantes sigue linkeando a la subasta; queda en historial). Análogo `EstadoSolicitud.CANCELADO` para propuestas. |

## Estado actual relevante (lo que ya existe y se reutiliza)

- **Copias:** 1 `Figurita` (base + owner) = 1 copia; la cantidad se calcula agrupando por base. No hay campo `cantidad`.
- **Repetidas:** `GET /api/usuarios/{u}/figuritas/repetidas` (grupos con count > 1). **Todas:** `GET /api/usuarios/{u}/figuritas`.
- **Faltantes (hoy, derivado):** `GET /api/usuarios/{u}/figuritas/faltantes` → devuelve `FiguritaBaseDTO` de las bases que el usuario NO posee (`FiguritaBaseRepository.findFaltantesPaged`).
- **Maestro:** `GET /api/figuritas-base/search?search=` (matchea jugador/selección/**número**), y `GET /api/figuritas?usuarioId={me}&...` (catálogo paginado y filtrado que **excluye lo que el caller ya posee**).
- **Primitivo de alta:** `AdminController.giftFigurita` crea `Figurita.builder().figuritaBase(base).owner(u).build()` + `figuritaService.crear(...)`. Es exactamente "agregar una copia", pero admin-only.
- **Reverse-lookups:** publicaciones `FiguritaPublicadaService.removeFiguritaFromPublications(figuritaId)` (ya usado al aceptar un intercambio) y `findByFiguritaId`; solicitudes `SolicitudDeIntercambioRepository.findByFiguritaIds(...)`. **Falta** el de subasta (`Subasta.figurita` es ref única; hoy no hay `findByFiguritaId`).
- **Notificaciones:** `NotificacionService.crear(...)`; patrón de `SubastaService.finalizar()` que notifica a ganador/perdedores (ofertantes salen de `subasta.getOfertas()` → `Oferta.getUsuario()`). Propuestas: `SolicitudDeIntercambioService.rechazar(id)` ya notifica al proponente.
- **US4 hoy (`SugerenciaService.regenerarTodas`):** para (U,V), `aRecibir` = repetidas de V con `!ownedU.contains(base)`; `aOfrecer` = repetidas de U con `!ownedV.contains(base)`.
- **US11 hoy (`UsuarioRepositoryImpl.findUsuariosQueLesFaltaFigurita(baseId)`):** devuelve usuarios que NO poseen esa base. Se invoca en `SubastaService.crear` y `FiguritaPublicadaService.publicar`.

## Modelo de datos

- **Copias poseídas: sin cambios** (sigue 1 `Figurita` por copia).
- **Nuevo `Faltante`** — `@Document("faltantes")`, patrón Lombok estándar del proyecto:
  - `String id`
  - `String usuarioId` (indexado)
  - `@DocumentReference(lazy = true) FiguritaBase figuritaBase`
  - `LocalDateTime fecha`
  - Índice único compuesto `(usuarioId, figuritaBase)` → idempotencia / sin duplicados.
- **`EstadoSubasta`**: agregar valor `CANCELADA` (hoy: `PENDIENTE, EN_CURSO, FINALIZADA`).
- **`SolicitudDeIntercambio.EstadoSolicitud`**: agregar valor `CANCELADO` (hoy: `PENDIENTE, ACEPTADO, RECHAZADO`).

## Backend — endpoints

Todos los writes validan que el caller sea `{username}` (o admin) vía JWT/`SecurityContextHolder`.

### A. Setear copias poseídas (generaliza admin-gift, self-service)
- `PUT /api/usuarios/{username}/figuritas/{figuritaBaseId}` con body `{ "cantidad": N }` (N ≥ 0).
  - `current` = copias que el usuario tiene de esa base.
  - `N > current` → crea `N - current` `Figurita` nuevas (como giftFigurita, en loop).
  - `N < current` → hay que liberar `current - N` copias vía **cascada de liberación** (ver abajo).
  - `N == current` → no-op.
  - Respuesta: `FiguritaResponseDTO` actualizado (con `count` = N). `N = 0` es válido (borra todas, con cascada).

### B. Wishlist (faltantes declarados)
- `POST /api/usuarios/{username}/faltantes` con body `{ "figuritaBaseId": "..." }` → agrega (idempotente por índice único). **Rechaza (409/400)** si el usuario ya posee esa base ("ya la tenés").
- `DELETE /api/usuarios/{username}/faltantes/{figuritaBaseId}` → quita de la wishlist (404 si no estaba).
- `GET /api/usuarios/{username}/figuritas/faltantes` → **se repurposea**: ahora devuelve la **wishlist declarada** (misma forma `PagedResponse<FiguritaBaseDTO>`, así el hook del front no cambia). El derivado `findFaltantesPaged` deja de estar cableado a esta ruta (se verifica que ningún otro consumidor dependa del significado viejo; el modal de faltantes usa `/api/figuritas?usuarioId=me`, no esta ruta).

### C. Reverse-lookup y cancelación (para la cascada)
- `SubastaRepository`: agregar `findByFiguritaId(String figuritaId)` (subastas activas — `PENDIENTE`/`EN_CURSO` — cuya `figurita` es esa copia).
- `SubastaService.cancelarPorFigurita(String figuritaId)`: por cada subasta activa que referencia la copia → `estado = CANCELADA`, notificar a cada ofertante distinto (`getOfertas()→getUsuario()`) con `NotificacionService.crear` (enlace `/subastas/{id}`), guardar. (Las ofertas quedan asociadas pero la subasta ya no es válida; no se transfieren figuritas porque no se llama a `finalizar`).
- `SolicitudDeIntercambioService.cancelarPorFigurita(String figuritaId)`: por cada solicitud **PENDIENTE** que referencie la copia — como figurita pedida (`figurita`) **o** como ofrecida (`figuritasOfrecidas`) — → `estado = CANCELADO`, notificar a la **contraparte** correspondiente (si la copia era la *pedida* → notificar al proponente `solicitud.usuario`; si era *ofrecida* → notificar al dueño de la figurita pedida `solicitud.figurita.owner`), guardar. Requiere un reverse-lookup que cubra ambos campos (extender `SolicitudDeIntercambioRepositoryCustom`).

### D. Orquestador nuevo: `ColeccionService`
Concentra la lógica nueva y evita ciclos de dependencias (depende de `FiguritaService`, `SubastaService`, `SolicitudDeIntercambioService`, `FiguritaPublicadaService`, `FaltanteRepository`, `UsuarioService`; ninguno de ellos depende de él).
- `setCount(username, baseId, N)`: implementa A.
- `liberarFigurita(figuritaId)`: desarma todos los compromisos de una copia y la borra:
  1. `publicadaService.removeFiguritaFromPublications(figuritaId)` (si la publicación queda vacía → `RETIRADA`).
  2. `subastaService.cancelarPorFigurita(figuritaId)`.
  3. `solicitudService.cancelarPorFigurita(figuritaId)`.
  4. `figuritaService.eliminar(figuritaId)`.
- Wishlist add/remove/list (B).

### Cascada de liberación (reemplaza el 409)

Al liberar `need = current - N` copias de una base para un usuario, **ordenar por menor disrupción** y liberar de a una hasta cubrir `need`:

| Estado de la copia | Acción | Notifica |
|---|---|---|
| Sin comprometer | borrar la `Figurita` | — |
| Solo publicada (DISPONIBLE, sin propuesta activa) | sacar de la publicación (retirar si queda vacía), borrar copia | — (nadie se comprometió) |
| En **subasta** activa | `cancelarPorFigurita` (soft-cancel → `CANCELADA`), borrar copia | **sí**, ofertantes |
| En **propuesta** PENDIENTE (pedida u ofrecida) | `cancelarPorFigurita` (soft-cancel → `CANCELADO`), borrar copia | **sí**, contraparte |

Como se liberan primero las no comprometidas, la cascada disruptiva solo ocurre cuando el usuario realmente baja por debajo de lo que tiene comprometido — el caso que pidió el docente. En el flujo normal (colección vacía → set N) nunca se dispara.

## US4 + US11 → leen la wishlist

- **US4 (`SugerenciaService.regenerarTodas`)**: cargar, por usuario, el set de baseIds de su `Faltante` (`wishlist[U]`). Reemplazar el criterio derivado:
  - `aRecibir` = repetidas de V cuyo base ∈ `wishlist[U]` (y ∉ `ownedU`, defensivo).
  - `aOfrecer` = repetidas de U cuyo base ∈ `wishlist[V]`.
- **US11 (`findUsuariosQueLesFaltaFigurita(baseId)`)**: cambiar la semántica a "usuarios que declararon esa base en su wishlist" → query sobre `faltantes` (`FaltanteRepository.findUsuariosByFiguritaBaseId(baseId)` o equivalente). Los callers (`SubastaService.crear`, `FiguritaPublicadaService.publicar`) no cambian.

## Frontend

- **Modal `AgregarFigurita` reutilizable** (`frontend/src/pages/coleccion/components/`):
  - Buscador del maestro (reusa `useBaseSearch` / `GET /api/figuritas-base/search`, ya matchea jugador/selección/número) **+ browse paginado del álbum** (la "batería de cartas"). Muestra foto/jugador/selección/número.
  - **Modo poseída:** elegir base + input `cantidad` → `PUT /api/usuarios/{u}/figuritas/{baseId}`. Puede pre-cargar `cantidad` con el count actual. Browse source: `/api/figuritas` (todo el maestro).
  - **Modo faltante:** elegir base (sin cantidad) → `POST /api/usuarios/{u}/faltantes`. Browse source: `/api/figuritas?usuarioId=me` (excluye lo que ya poseés) y descartar client-side lo ya en wishlist.
- **Pestañas Repetidas/Todas** (`RepetidasPage`/`TodasPage`): botón **"Agregar Figurita"** → modal modo poseída; `refetch()` al confirmar.
- **Pestaña Faltantes** (`FaltantesPage`): fuente pasa a la wishlist declarada (misma ruta, el hook no cambia); botón **"Agregar Figurita"** (modo faltante) + acción **quitar** por tarjeta (`DELETE …/faltantes/{baseId}`).
- **Subastas**: manejar el nuevo estado `CANCELADA` en el render (badge/estado) donde se listan/filtran subastas. **Propuestas**: manejar `CANCELADO` análogamente.
- El campo "buscar por número" que sugería Diego ya queda cubierto por el search del maestro; agregar un input nº explícito es opcional.

## Reglas / casos borde

- Bajar cantidad por debajo de copias comprometidas → **cascada** (arriba), nunca corrupción de datos.
- Agregar a wishlist una base ya poseída → rechazado.
- Matching US4 filtra defensivamente las bases que U ya posee, aunque estén en su wishlist.
- Auth: los tres writes exigen caller == `{username}` o admin.
- *(Nice-to-have, no obligatorio)*: al setear copias de una base con N ≥ 1, autoquitarla de la wishlist del usuario (quedó consistente: si la tenés, no te falta).

## Testing

- **Unit backend:**
  - `setCount`: crear delta (0→N, current→N mayor), no-op (N==current), bajar sin comprometidas, `N=0`.
  - Cascada: bajar por debajo de comprometidas dispara cancelación de subasta (→ `CANCELADA` + notif a ofertantes) y de propuesta (→ `CANCELADO` + notif a contraparte); publicación DISPONIBLE se retira sin notificar; se libera primero lo no comprometido.
  - Wishlist: add idempotente, dedup por índice único, reject-si-poseída, delete (existente/inexistente).
  - US4: matchea repetidas de V contra wishlist de U (y no contra el derivado); excluye base poseída.
  - US11: `findUsuarios…` devuelve solo quienes declararon la wishlist.
- **Frontend:** `npm run build` + `npm run lint`; smoke manual de los dos modos del modal y del quitar-faltante.

## Fases

- **Fase 1 — núcleo (lo no-negociable):** modelo `Faltante` + `PUT set-count` que sube (0→N, current→N mayor) y baja **solo removiendo copias no comprometidas**; si el N pedido obligaría a tocar copias comprometidas, en esta fase se responde **409** (placeholder que la Fase 2 reemplaza por la cascada). Además: endpoints wishlist + modal (2 modos) + botones en las pestañas + repurpose GET faltantes. Con esto el usuario ya construye su colección y engancha subasta/intercambio.
- **Fase 2 — cascada de liberación:** `EstadoSubasta.CANCELADA` + `EstadoSolicitud.CANCELADO`, reverse-lookups, `cancelarPorFigurita` en ambos servicios, `liberarFigurita` en `ColeccionService`, y bajar cantidad/borrar con cascada + notificaciones. Render de estados cancelados en el front.
- **Fase 3 — matching desde wishlist:** reapuntar `SugerenciaService` (US4) y `findUsuariosQueLesFaltaFigurita` (US11) a la wishlist.

## Archivos afectados (previsión)

**Backend (nuevos):** `models/Faltante.java`, `repository/FaltanteRepository.java`, `service/ColeccionService.java`, `controller/ColeccionController.java` (o extender `UsuarioController`), DTOs de request (`SetCantidadRequestDTO`, `FaltanteRequestDTO`).
**Backend (modificados):** `models/EstadoSubasta.java`, `models/SolicitudDeIntercambio.java` (enum), `repository/SubastaRepository*.java` (+`findByFiguritaId`), `repository/SolicitudDeIntercambioRepository*.java` (reverse-lookup ambos campos), `service/SubastaService.java` (+`cancelarPorFigurita`), `service/SolicitudDeIntercambioService.java` (+`cancelarPorFigurita`), `service/SugerenciaService.java` (US4), `repository/UsuarioRepositoryImpl.java` + `FaltanteRepository` (US11), `controller/UsuarioController.java` (repurpose GET faltantes).
**Frontend (nuevos):** `pages/coleccion/components/AgregarFiguritaModal.tsx` (+ hook de mutación).
**Frontend (modificados):** `RepetidasPage.tsx`, `TodasPage.tsx`, `FaltantesPage.tsx`, hooks/servicios de colección, render de estados `CANCELADA`/`CANCELADO` en subastas/propuestas.

## Fuera de alcance

- Coordinación del intercambio físico (ocurre fuera de la app, como Mercado Libre — el enunciado no lo pide).
- Rediseño visual del catálogo/álbum más allá de reutilizar las tarjetas existentes.
