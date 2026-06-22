# Spec — Sugerencias de Intercambio (US4)

- **Fecha:** 2026-06-22
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **User Story:** US4 — "Como usuario quiero recibir sugerencias automáticas de intercambio en función de mis faltantes y las figuritas repetidas de otros usuarios."
- **Alcance:** Backend (modelo + matching + job + endpoints + tests) y frontend (página nueva + sidebar + prefill de propuesta + wiring del Dashboard).

## 1. Contexto y problema

US4 está **sin implementar**. Estado actual:
- Backend stub: `models/Sugerencia.java` (POJO sin `@Document`/`@Id`) y `models/GestionadorSugerencias.java` (`sugerirUsuario(...)` → `null`). Sin repository/service/controller/endpoint.
- Frontend: no hay página ni entrada de sidebar. La sección "Disponibles para intercambio" del Dashboard (`pages/home/DashboardPage.tsx`) es **100% mock** (array `FIGURITAS`) y solo linkea a `/buscar`.
- Ladrillos existentes reutilizables: `FiguritaService.obtenerFaltantes(userId)` (bases que el usuario no tiene) y `FiguritaRepository.findRepetidas(userId)` (grupos con `count > 1`).

## 2. Objetivos / No-objetivos

**Objetivos**
1. Calcular sugerencias de **intercambio bidireccional viable**: para un par de usuarios (U, V), U recibe una repetida de V que le falta **y** U tiene una repetida que a V le falta.
2. **Persistir** las sugerencias en una colección `sugerencias`, regeneradas por un **job programado diario (3 AM)**.
3. Exponer las sugerencias por API, **agrupadas por usuario contraparte**.
4. Página frontend "Sugerencias" (sidebar nuevo) que muestra las sugerencias y permite **prearmar una propuesta** (US5) al hacer click.
5. Reemplazar el mock del Dashboard por sugerencias reales.

**No-objetivos (fuera de alcance)**
- Lifecycle/estado por sugerencia (descartar, marcar vista). Las sugerencias se regeneran enteras.
- Recalcular en tiempo real por evento (publicar figurita / registrar faltante / completar intercambio). Se usa job diario.
- Modalidad directo/subasta ni cantidad como campo de `Figurita` (no existen en el modelo). **Simplificación:** toda repetida se considera intercambiable.
- US10 (reputación) y US11 (alertas proactivas).

## 3. Decisiones (cerradas en brainstorming)

| Tema | Decisión |
|---|---|
| Dirección del match | **Bidireccional** (trato viable en ambos sentidos). |
| Granularidad | **Agrupado por usuario** contraparte. |
| Cómputo | **Persistido** en colección `sugerencias`. |
| Regeneración | **Job @Scheduled diario a las 3 AM** (cron configurable) + endpoint manual para testing. |
| Acción al click | **Prearmar propuesta** de intercambio (reusa flujo US5). |
| Dashboard | **Reemplazar** el mock "Disponibles para intercambio" por sugerencias reales. |

## 4. Diseño detallado — Backend

Capas estándar del proyecto: Controller → Service → Repository (ver `backend/CLAUDE.md`).

### 4.1 Modelo `Sugerencia` (reemplaza el stub)

Un documento por **cada contraparte viable** de un usuario.

```java
@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "sugerencias")
public class Sugerencia {
    @Id private String id;
    @DocumentReference(lazy = true) private Usuario usuario;        // a quién se le sugiere
    @DocumentReference(lazy = true) private Usuario contraparte;    // el otro usuario
    @DocumentReference(lazy = true) private List<Figurita> figuritasARecibir;  // repetidas de la contraparte que a `usuario` le faltan
    @DocumentReference(lazy = true) private List<Figurita> figuritasAOfrecer;  // repetidas de `usuario` que a la contraparte le faltan
    private LocalDateTime generadaEn;
}
```

- Se almacena **una instancia `Figurita` representativa por base** en cada lista (suficiente para armar una propuesta). El `id` de instancia es válido (existe y pertenece a su dueño).
- El stub `GestionadorSugerencias` se elimina; su intención se implementa en `SugerenciaService`.

### 4.2 Repository

```java
@Repository
public interface SugerenciaRepository extends MongoRepository<Sugerencia, String> {
    List<Sugerencia> findByUsuarioId(String usuarioId);  // o variante con ObjectId si hace falta (ver patrón en FiguritaRepositoryCustomImpl)
    void deleteByUsuarioId(String usuarioId);
}
```
> Nota: por usar `@DocumentReference`, las derived queries por id de referencia pueden requerir el patrón `*RepositoryCustom` + `MongoTemplate` con `ObjectId` (como `findByFiguritaOwnerId`). El plan resuelve la variante exacta.

### 4.3 `SugerenciaService` — matching + regeneración

**Algoritmo (bidireccional):**
```
regenerarTodas():
  cargar una vez: todas las figuritas y todas las bases
  para cada usuario U:
     faltantesU = bases que U no posee
     repetidasU = spares de U (grupos con count>1), 1 instancia representativa por base
     candidatos = []
     para cada usuario V != U:
        faltantesV = bases que V no posee
        repetidasV = spares de V
        aRecibir = repetidasV cuya base ∈ faltantesU
        aOfrecer = repetidasU cuya base ∈ faltantesV
        si aRecibir ≠ ∅ Y aOfrecer ≠ ∅:
           candidatos += Sugerencia(U, V, aRecibir, aOfrecer, now)
     reemplazar las sugerencias de U: deleteByUsuarioId(U) + saveAll(candidatos)
```
- Precalcular por-usuario (faltantes set + repetidas) para no recomputar dentro del doble loop. Complejidad O(usuarios²) sobre estructuras en memoria — sobrada para la escala del TP.
- Reemplazo **por usuario** (no `deleteAll` global) para evitar ventanas vacías.
- `obtenerPorUsuario(userId)` → `List<Sugerencia>` (lo que lee la API).

### 4.4 Job programado

- `@EnableScheduling` (en una `@Configuration` o en la clase `@SpringBootApplication`).
- Método anotado `@Scheduled(cron = "${sugerencias.cron:0 0 3 * * *}", zone = "${sugerencias.zone:America/Argentina/Buenos_Aires}")` que invoca `SugerenciaService.regenerarTodas()`. Default: **diario 3 AM** hora Argentina, configurable por property.
- No se testea el timing; se testea `regenerarTodas()` directo.

### 4.5 Controller + DTO

```java
@RestController
@RequestMapping("/api/sugerencias")
class SugerenciaController {
    // GET via usuarios para consistencia con /figuritas (ver abajo) — o aquí con query param.
    @PostMapping("/regenerar")  // manual, para testing/demo (evita esperar al job)
    ResponseEntity<Void> regenerar();  // 200/204; protegido @PreAuthorize("hasRole('ADMIN')")
}
```

Endpoint de lectura, **consistente con `/api/usuarios/{userName}/figuritas/...`**:
```
GET /api/usuarios/{userName}/sugerencias → List<SugerenciaResponseDTO>
```
(se agrega en `UsuarioController`, delegando en `SugerenciaService`).

`SugerenciaResponseDTO`:
```java
class SugerenciaResponseDTO {
    String contraparteId;
    String contraparteNombre;
    List<FiguritaResponseDTO> figuritasARecibir;  // ownerId = contraparte
    List<FiguritaResponseDTO> figuritasAOfrecer;  // ownerId = usuario
}
```
Reusa `FiguritaResponseDTO` (ya trae `id` de instancia, `figuritaBaseId`, `ownerId`, etc.). El mapeo resuelve las referencias lazy (mismo patrón que el resto de DTOs) para no serializar refs sin resolver.

## 5. Diseño detallado — Frontend

### 5.1 Página `SugerenciasPage` + ruta + sidebar
- Sidebar (`MainLayout`): nueva entrada **"Sugerencias"** (icono SVG inline, estilo existente). Ubicación sugerida: entre "Propuestas" y "Subastas".
- Ruta nueva en `router.tsx`: `{ path: 'sugerencias', element: <SugerenciasPage/> }` (lazy), dentro de `PrivateRoute`.
- `SugerenciasPage`: `GET /api/usuarios/{username}/sugerencias`. Renderiza **una tarjeta por contraparte**:
  - Encabezado: "Con @{contraparteNombre}".
  - Columna **"Te puede dar"**: `figuritasARecibir`, cada figurita clickeable.
  - Columna **"Vos le podés dar"**: `figuritasAOfrecer`, informativa.
  - Estado vacío: "No tenés sugerencias por ahora" (+ nota de que se recalculan a diario).

### 5.2 Prearmar propuesta
- Click en una figurita de "Te puede dar" →
  `navigate('/propuestas/nueva', { state: { figuritaSeleccionada: <esa FiguritaResponseDTO>, figuritasOfrecidasBaseIds: figuritasAOfrecer.map(f => f.figuritaBaseId) } })`.
- Extender `PropuestasNuevaPage`:
  - Hoy lee `state.figuritaSeleccionada` (deseada). Agregar lectura de `state.figuritasOfrecidasBaseIds`.
  - **Pre-tildar** en "¿Qué figuritas ofreces?" los grupos cuyo `figuritaBaseId` ∈ `figuritasOfrecidasBaseIds`. (Pre-check por *base id*, no por id de instancia, porque el id representativo que devuelve `/figuritas` puede no coincidir con el guardado en la sugerencia; el submit sigue usando el `fig.id` que carga la propia página → instancia válida del usuario).
  - Comportamiento sin `state` extra: idéntico al actual.

### 5.3 Dashboard
- Reemplazar la sección mock "Disponibles para intercambio" (`FIGURITAS`) por **sugerencias reales**: aplanar `figuritasARecibir` de todas las sugerencias (cap a unas pocas, p. ej. 6-8), carrusel existente, botón "Ver todas" → `/sugerencias`. Cada card clickeable → mismo prefill que 5.2.
- Detalle conocido: el card del Dashboard (`components/Figurita.tsx`) hoy espera `photo/age/position` (datos del mock). Los datos reales no los tienen → el plan adapta el card (placeholder de imagen / campos disponibles) o usa una variante. Las otras secciones mock del Dashboard (Propuestas/Subastas/Alertas) quedan **fuera de alcance** de este spec.

## 6. Lista de cambios por archivo

**Backend — nuevos**
- `repository/SugerenciaRepository.java` (+ `*Custom`/`*Impl` si hace falta por `@DocumentReference`).
- `service/SugerenciaService.java` (matching + `regenerarTodas` + `obtenerPorUsuario`).
- `controller/SugerenciaController.java` (`POST /regenerar`, admin).
- `dtos/SugerenciaResponseDTO.java`.
- `configs/SchedulingConfig.java` (o `@EnableScheduling` en la app) + método `@Scheduled`.
- `service/SugerenciaServiceTest.java` (tests del matching).

**Backend — modificados**
- `models/Sugerencia.java` → documento real (reemplaza stub).
- `models/GestionadorSugerencias.java` → eliminar (absorbido en el service).
- `controller/UsuarioController.java` → `GET /{userName}/sugerencias`.

**Frontend — nuevos**
- `src/pages/sugerencias/SugerenciasPage.tsx`.

**Frontend — modificados**
- `src/router/router.tsx` → ruta `/sugerencias`.
- `src/layouts/MainLayout.tsx` → entrada de sidebar "Sugerencias".
- `src/pages/propuestas/NuevaPage.tsx` → pre-tildar ofrecidas desde `state`.
- `src/pages/home/DashboardPage.tsx` → sección real de sugerencias.
- (posible) `src/components/Figurita.tsx` → adaptación menor del card si se reutiliza en el Dashboard.

## 7. Testing / verificación

- **Backend (TDD, núcleo):** `SugerenciaServiceTest` con JUnit5 + Mockito (mismo estilo que los 78 tests actuales):
  - Match bidireccional → genera 1 sugerencia con ambas listas no vacías.
  - Sin match si falta un lado (solo aRecibir o solo aOfrecer) → no se genera.
  - Auto-exclusión (U no se sugiere a sí mismo).
  - Múltiples bases / múltiples contrapartes.
  - `regenerarTodas` reemplaza correctamente las sugerencias previas del usuario.
- **Frontend:** `npm run build` + `npm run lint` + smoke manual:
  1. Sidebar muestra "Sugerencias"; `/sugerencias` lista tarjetas por contraparte.
  2. `POST /api/sugerencias/regenerar` (como admin) genera datos; la página los muestra.
  3. Click en "te puede dar" abre `/propuestas/nueva` con la deseada cargada y las ofrecidas pre-tildadas; enviar crea la solicitud.
  4. Dashboard muestra sugerencias reales (no el mock).

## 8. Riesgos

- **Medio** (feature end-to-end).
- Matching: cubierto con tests unitarios.
- `@DocumentReference` lazy en listas: armar el DTO resolviendo las refs (patrón ya usado) para no romper la serialización.
- Prefill por base id (no instancia) para evitar desajustes de id representativo entre `/figuritas` y la sugerencia guardada.
- Costo del job O(usuarios²): aceptable a la escala del TP; el cron diario a las 3 AM acota el impacto.

## 9. Cuestiones abiertas

Ninguna.
