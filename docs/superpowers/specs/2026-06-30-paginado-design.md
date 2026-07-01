# Diseño: Paginado server-side (offset) en TACS

- **Fecha:** 2026-06-30
- **Tarea Trello:** [#25 — Agregar paginado a las pantallas/endpoints necesarias](https://trello.com/c/eax3seU4/25-agregar-paginado-a-las-pantallas-endpoints-necesarias)
- **Tareas relacionadas:** [#30 — Se tarda demasiado en cargar figuritas](https://trello.com/c/QGKuxt1k) (lo resuelve el paginado del catálogo), [#7 — Búsqueda y exploración de figuritas](https://trello.com/c/SSw9bBjO) (filtros de BuscarPage)

## 1. Contexto y problema

Hoy **no existe paginado server-side en ningún lado** del stack. Todos los endpoints de listado devuelven un `List<...>` completo en un único array JSON; ningún endpoint acepta `page`/`size`/`offset`/`limit`. El único paginado del repo es **client-side** en `frontend/src/pages/perfil/HistorialPage.tsx` (slice de un array ya descargado entero). Las demás "truncaciones" (Dashboard `slice(0,8)`, `max-h-72` en Admin) son presentacionales: el payload completo igual se descarga.

Esto causa:
- **Carga lenta del catálogo** (`GET /api/figuritas` trae y agrupa todas las figuritas de la plataforma en memoria; el front filtra en JS) — bug #30.
- Feeds e historiales por usuario que crecen sin límite (notificaciones, intercambios, subastas).
- Endpoints que cargan colecciones enteras en memoria con `findAll()` + filtro Java.

## 2. Decisiones tomadas (brainstorming)

1. **Alcance:** HIGH + MEDIUM (10 endpoints/pantallas). Los listados naturalmente acotados quedan fuera.
2. **Estilo:** páginas numeradas (offset), uniforme back y front. Mecanismo backend: Spring Data `Pageable`/`Page<T>`.
3. **Filtros:** se mueven **completos a server-side** en catálogo y subastas (sin esto el paginado da resultados incorrectos). De paso resuelve #30.
4. **Historial de perfil (HistorialPage):** queda paginando **client-side**; se paginan server-side las 3 pantallas dedicadas que comparten sus endpoints.
5. **Fixes de queries necesarios para que el paginado sirva** (in scope): reescribir `SolicitudDeIntercambioRepositoryImpl.findByFiguritaOwnerId` y `FiguritaPublicadaRepositoryImpl.findDisponibles` (ambos hoy `findAll()` + filtro en memoria) a queries reales paginadas.
6. **Fuera de scope explícito:** scans en memoria de `AdminStatsService.getStats()`, `OfertaService.crear()` y `SugerenciaService.regenerarTodas()` — son problemas de performance no relacionados con listados paginados.

## 3. Contrato de respuesta

DTO de envoltura propio (no se serializa `Page<T>` de Spring directo: en Spring moderno emite warning y su shape JSON es inestable):

```java
public record PagedResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last) {

  public static <T> PagedResponse<T> from(org.springframework.data.domain.Page<T> p) {
    return new PagedResponse<>(
        p.getContent(), p.getNumber(), p.getSize(),
        p.getTotalElements(), p.getTotalPages(), p.isLast());
  }
}
```

- **Parámetros de query:** `page` (default `0`), `size` con **tope máximo `100`**. Defaults de `size`: **`12`** para el catálogo (grilla de BuscarPage), **`10`** para listados y feeds (subastas, notificaciones, sugerencias, publicaciones, historiales).
- **Sort determinístico obligatorio** en cada query paginada (si no, las páginas repiten/saltan items). Defaults: fecha desc en feeds/historiales; número asc en el catálogo.
- **Página fuera de rango:** el backend devuelve `content` vacío con `totalPages` correcto; el front clampea a la última página válida.

## 4. Endpoints en scope (10)

### HIGH (no acotados, crecen con la plataforma)

| Endpoint | Backend | Cambios |
|---|---|---|
| `GET /api/figuritas` | `FiguritaRepositoryImpl` (MongoTemplate + Criteria) | + `page,size` + filtros `nombre,numero,seleccion,equipo,categoria,jugador` server-side (`Criteria` → `query.with(pageable)` + `mongoTemplate.count(...)`, envolver con `PageableExecutionUtils.getPage`). Sort por número. **Resuelve #30.** |
| `GET /api/subastas` | `SubastaRepositoryImpl` | + `page,size,estado`. ActivasPage pide `estado=EN_CURSO`. Sort por fecha fin. El recálculo de ofertas válidas/líder pasa a operar solo sobre el slice de la página. |
| `GET /api/notificaciones/usuario/{id}` | `NotificacionRepository` (MongoRepository) | + `page,size`, derived query `findByUsuarioIdOrderByFechaDesc(String, Pageable)`. |
| `GET /api/usuarios/{userName}/sugerencias` | `SugerenciaRepository` | + `page,size` paginando los grupos de sugerencia. |
| `GET /api/publicaciones/disponibles/{id}` | `FiguritaPublicadaRepositoryImpl` | + `page,size` **y reescritura de `findDisponibles`**: excluir al caller y filtrar por estado en Mongo (no en memoria), paginado. Sort por fecha de publicación desc. |

### MEDIUM (historiales por usuario, append-only)

| Endpoint | Backend | Cambios |
|---|---|---|
| `GET /api/subastas/usuario/{id}` (MiasPage) | `SubastaRepositoryImpl` | + `page,size`. Sort fecha fin desc. |
| `GET /api/subastas/participando/{id}` (ParticipandoPage) | `SubastaRepositoryImpl` | + `page,size`. |
| `GET /api/intercambios/usuario/{id}` (IntercambiosPage) | `IntercambioRepositoryImpl` / `IntercambioService` | + `page,size`; eliminar el doble `findByUsuarioId` (hoy se llama dos veces, una solo para loguear). Sort fecha desc. |
| `GET /api/solicitudes-intercambio/recibidas/{id}` (RecibidasPage) | `SolicitudDeIntercambioRepositoryImpl` | + `page,size` **y reescritura de `findByFiguritaOwnerId`** (hoy `findAll()` + filtro Java) a `Criteria` query paginada. |
| `GET /api/solicitudes-intercambio/enviadas/{id}` (EnviadasPage) | `SolicitudDeIntercambioRepository` | + `page,size`. |

### Fuera de scope (acotados — NO se paginan)
`GET /api/equipos`, `/api/selecciones`, `/api/categorias-figurita`, `/api/condiciones`, `/api/figuritas-base`, `/api/jugadores`, `/api/usuarios/{u}/figuritas/faltantes`, `/repetidas`, y endpoints sin consumidor de UI (`/api/usuarios`, `/api/ofertas`, `/api/calificaciones`, globales de intercambios/solicitudes).

## 5. Frontend

- **`<Paginador>`** reutilizable en `src/components/`, generalizando los botones numerados que ya existen en `HistorialPage.tsx`. Props: `page`, `totalPages`, `onChange`. Usado en todas las pantallas paginadas.
- **Capa de servicios:** tipo `PagedResponse<T>` + helper único `unwrapPage<T>(res)` en `src/services/api.ts`, de modo que los mappers existentes (`mapFigurita`, `mapSubasta`, etc.) sigan operando sobre el array interno (`content`) sin cambios. Las funciones de servicio afectadas pasan a aceptar `{ page, size, ...filtros }` y devolver `PagedResponse<mapeado>`.
- **Hooks React Query:** migran a `useQuery` cliveado por `[key, page, filtros]` con `placeholderData: keepPreviousData` (cambio de página sin parpadeo). **No** se usa `useInfiniteQuery` (eso correspondería a "cargar más"). Las páginas con `useEffect` crudo en scope (IntercambiosPage) primero mueven su fetch a este patrón.
- **Reset a página 0** al cambiar cualquier filtro (BuscarPage, ActivasPage).
- **DashboardPage:** hoy trae todo y hace `slice(0,N)`; pasa a pedir `page=0&size=N` y leer `.content`. (Consume varios de los endpoints ahora paginados — debe actualizarse junto con ellos para no romperse.)
- **HistorialPage:** queda client-side. Su fuente `useTransactions` recorre las páginas (`page=0,1,2…` hasta `last`) de los 3 endpoints (intercambios/usuario, subastas/usuario, subastas/participando) para reconstruir el historial completo, respetando el tope de `size`. Limitación documentada: el merge cruzado de las 3 colecciones no se pagina server-side (decisión 4).

## 6. Compatibilidad y orden de implementación

Cambiar la respuesta de array plano a `{content,...}` es **breaking** para cada consumidor. Por eso se implementa en **slices verticales por endpoint**: backend (repo + service + controller) + frontend (service + hook + página) + tests, todo junto, endpoint por endpoint. Así nunca queda un consumidor leyendo un shape que cambió.

**Orden sugerido:**
1. Infraestructura compartida: `PagedResponse` (back), `PagedResponse<T>` + `unwrapPage` + `<Paginador>` (front).
2. Catálogo `GET /api/figuritas` + BuscarPage (mayor valor, resuelve #30).
3. Subastas `GET /api/subastas` + ActivasPage.
4. Notificaciones, sugerencias, publicaciones disponibles.
5. Historiales MEDIUM (incluye los dos fixes de query) + actualización de DashboardPage y useTransactions.

## 7. Testing

- **Backend:** tests de repositorio/servicio por cada query paginada (slice correcto, count, filtros, sort determinístico, página vacía, página fuera de rango) + tests de controller (MockMvc) verificando el shape de `PagedResponse` y el binding de `page`/`size`/filtros. Se siguen los patrones de test existentes. Caveat de entorno: algunos tests requieren mongo local o Atlas alcanzable (ver memoria del proyecto); preferir `@DataMongoTest`/mocks donde sea posible.
- **Frontend:** test unitario de `<Paginador>` (estados borde: 1 página, primera/última, clamp) + smoke test con Puppeteer en BuscarPage (navegar entre páginas y aplicar filtros) usando el MCP disponible.

## 8. Punto a confirmar en el plan

La **forma exacta de la respuesta de `GET /api/figuritas`** (lista de figuritas vs agrupado por figurita base, y cómo entra "disponibles de otros usuarios" del card #7) se verifica leyendo el código línea por línea al escribir el plan de implementación, para definir la unidad de paginado correcta (por figurita vs por grupo) y el sort estable asociado. Es el único punto con incertidumbre del diseño.

## 9. Criterios de aceptación

- Los 10 endpoints en scope aceptan `page`/`size` y devuelven `PagedResponse<T>` con `totalElements`/`totalPages`/`last` correctos.
- BuscarPage y ActivasPage filtran server-side; la paginación es correcta con filtros activos.
- El catálogo carga rápido aun con muchas figuritas (no se descarga todo) — #30 verificable.
- Todas las pantallas en scope muestran control de páginas (`<Paginador>`) y navegan sin parpadeo.
- DashboardPage e HistorialPage siguen funcionando tras el cambio de contrato.
- Tests back y front en verde; smoke test de BuscarPage pasa.
