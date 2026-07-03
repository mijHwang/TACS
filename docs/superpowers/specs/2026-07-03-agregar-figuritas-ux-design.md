# Rediseño UX/UI — Agregar figuritas en "Mis faltantes" y "Mis repetidas"

**Fecha:** 2026-07-03
**Estado:** Diseño aprobado (pendiente review del spec)
**Alcance:** Frontend (React) + un cambio chico de backend (Spring)

## 1. Contexto

En "Mi Colección" hay dos vistas con un botón `+ Agregar Figurita` que abre
[`AgregarFiguritaModal`](../../../frontend/src/pages/coleccion/components/AgregarFiguritaModal.tsx):

- **Mis faltantes** (`mode: faltante`): al clickear una tarjeta hace `POST` y muestra un
  renglón verde chico que se pisa. El modal queda abierto.
- **Mis repetidas** (`mode: poseida`): dispara un **`window.prompt`** nativo ("¿Cuántas copias
  tenés en total?") y ante error un **`alert`** nativo.

Problemas detectados:
1. `window.prompt` / `alert` nativos: feos, bloqueantes, sin validación visual.
2. Feedback pobre (un solo renglón que se pisa); no se ve qué se agregó ni si algo ya estaba.
3. No se ve el estado por figurita (cuántas tenés / si ya está en la wishlist).
4. **Riesgo escondido:** `PUT /figuritas/{baseId}` con `cantidad` **setea el total** (no suma) y si
   mandás menos de lo actual, el backend **libera copias con cascada** (cancela
   publicaciones/subastas/propuestas). Hoy eso pasa desde un `prompt` sin aviso claro
   ([`ColeccionService.setCantidad`](../../../backend/src/main/java/com/grupo3/tp/service/ColeccionService.java)).
5. El maestro del modal hoy sale de `/api/figuritas` (agregación sobre figuritas **poseídas**),
   así que sólo muestra bases que **alguien** posee — no las ~826 reales.

## 2. Objetivo

Rehacer el flujo de agregar figuritas para que sea claro, seguro y pulido, cubriendo los cuatro
objetivos elegidos por el usuario: sacar prompt/alert, mejor feedback, ver estado por figurita, y
pulido visual general.

## 3. Decisiones tomadas (con el usuario)

| # | Decisión | Elección |
|---|----------|----------|
| Cantidad en repetidas | Cómo se comporta al agregar copias de algo que ya tenés | **Setear total, con aviso claro al bajar** (antes de confirmar) |
| Layout del control | Dónde vive el control de cantidad | **B — seleccionar tarjeta + barra configuradora abajo** |
| Feedback | Cómo se avisa el resultado | **Toast** (sistema liviano, reusable) |
| Quitar de wishlist | Permitir quitar desde el modal | **Sí** |
| Maestro completo (c) | Mostrar las ~826 bases reales, no sólo las poseídas | **Sí, incluido** |

## 4. Alcance

**Incluye:**
- Rediseño completo de `AgregarFiguritaModal` (partido en piezas chicas).
- Sistema de toasts liviano y reusable (sin librería externa).
- Backend: exponer el maestro-menos-poseídas agregando un parámetro opcional a `/api/figuritas-base/search`.
- Tests (frontend + backend).

**No incluye:**
- Rediseñar las tarjetas de las listas ya existentes (`TarjetaColeccion` en Todas/Repetidas/Faltantes),
  salvo lo mínimo para consistencia visual.
- Enumerar exactamente qué publicaciones/subastas se cancelan al bajar (el aviso es genérico pero
  claro; enumerar requeriría un endpoint de "preview" — fuera de alcance).
- Cambiar la semántica del backend de `setCantidad` (se mantiene set-total con cascada).
- El `window.prompt` del flujo **"Publicar Intercambio"** (`askQuantity`, en `TodasPage`/`RepetidasPage`)
  queda **fuera de alcance**: es otra acción (publicar repetidas para trueque), no el agregar-figurita.
  Se puede migrar al mismo patrón en otra tanda.

## 5. Backend

### 5.1 Cambio único: exponer maestro-menos-poseídas

El maestro completo ya está expuesto en `GET /api/figuritas-base/search?search=&page=&size=`
([`FiguritaBaseController.search`](../../../backend/src/main/java/com/grupo3/tp/controller/FiguritaBaseController.java)),
que hoy usa el typeahead de "regalar" del admin. La lógica de "maestro menos lo que el usuario
posee" ya existe y está testeada en
[`FiguritaBaseRepositoryCustomImpl.findFaltantesPaged`](../../../backend/src/main/java/com/grupo3/tp/repository/FiguritaBaseRepositoryCustomImpl.java)
(vía `FiguritaService.obtenerFaltantesPaginado`), **pero no está expuesta por HTTP**.

**Diseño:** agregar un parámetro **opcional** `excludeOwnedBy` (userId) a `GET /api/figuritas-base/search`:
- **Ausente** → maestro completo (~826). Fuente del modo **repetidas**.
- **Presente** → maestro **menos** las bases que ese usuario ya posee (reusa `findFaltantesPaged`).
  Fuente del modo **faltantes**.

Cambios concretos:
1. `FiguritaBaseController.search(...)`: nuevo `@RequestParam(required = false) String excludeOwnedBy`.
   Si viene, delega en `figuritaService.obtenerFaltantesPaginado(new CatalogoFiltro(excludeOwnedBy, null, null, search, null, null, null), pageable)`;
   si no, mantiene `buscarBasesPaginado(search, pageable)`.
2. **Unificar el predicado de búsqueda** para que ambas ramas busquen por jugador **o** selección **o**
   número. Hoy `searchPaged` ya hace ese OR; `findFaltantesPaged` (vía `addNombreFilters`) sólo filtra
   por jugador. Ajustar `addNombreFilters` (o el armado de criterios de `findFaltantesPaged`) para usar
   el mismo OR jugador/selección/número que `searchPaged`, de modo que la búsqueda se comporte igual en
   los dos modos.

No se crean entidades nuevas; se reusa `FiguritaBaseDTO` (ya tiene `id`, `numero`, nombres e `imagenUrl`).

### 5.2 Endpoints usados por el frontend (sin cambios, sólo referencia)

- `GET /api/figuritas-base/search?search=&page=&size=&excludeOwnedBy=` → grilla del maestro (nuevo param).
- `GET /api/usuarios/{username}/figuritas?size=2000` → mi colección agrupada por base con `count`
  (para el mapa "Tenés N"; ya lo usa `useFiguritas`).
- `GET /api/usuarios/{username}/figuritas/faltantes?size=…` → mi wishlist declarada (para marcar
  "En tu wishlist"; ya lo usa `useFaltantesPaginadas`).
- `PUT /api/usuarios/{username}/figuritas/{baseId}` body `{cantidad}` → setear total (repetidas).
- `POST /api/usuarios/{username}/faltantes` body `{figuritaBaseId}` → agregar a wishlist.
- `DELETE /api/usuarios/{username}/faltantes/{baseId}` → quitar de wishlist.

## 6. Frontend

### 6.1 Arquitectura de componentes

`AgregarFiguritaModal` se parte en piezas chicas y enfocadas
(en `frontend/src/pages/coleccion/components/`):

- **`AgregarFiguritaModal`** — contenedor: chrome del modal, búsqueda debounced, orquesta los hooks
  de datos, mantiene el estado de sesión y elige el modo. Cierra con Esc / click en backdrop.
- **`CatalogoGrid`** — grilla responsiva; muestra **skeletons** durante la carga y `EmptyState` si no hay
  resultados.
- **`CatalogoCard`** — tarjeta del maestro; recibe el estado calculado y renderiza el badge/acción según
  el modo (ver §6.3). Placeholder cuando `imagenUrl` es null o falla.
- **`CantidadConfigurator`** — barra inferior del modo repetidas: mini-thumb + nombre, stepper, aviso de
  cascada, y botón Guardar / confirmar liberación. Sólo se monta cuando hay una tarjeta seleccionada.

### 6.2 Hooks nuevos (en `frontend/src/hooks/`)

- **`useMaestro({ search, page, size, excludeOwnedBy })`** → `PagedResponse<FiguritaBaseDTO>` desde
  `/api/figuritas-base/search`. `keepPreviousData` para paginar/buscar sin parpadeo.
- **`useMisCantidades(username)`** → `Map<baseId, number>`. Reusa el patrón de `useFiguritas`
  (`?size=2000`) y deriva el mapa `figuritaBaseId → count`. Se invalida tras cada guardado.
- **`useWishlistBaseIds(username)`** → `Set<baseId>`. Recorre `/api/usuarios/{username}/figuritas/faltantes`
  (páginas de a 100 hasta agotar) y arma el set. Se invalida tras agregar/quitar. (Sólo se activa en modo
  faltante.)

### 6.3 Estados por modo (ver mockups aprobados)

**Repetidas (`poseida`)** — fuente: maestro completo.
- Cada `CatalogoCard` muestra badge **"Tenés N"** (o "No la tenés" si N=0), tomado del mapa de cantidades.
- Al seleccionar una tarjeta se abre `CantidadConfigurator` con el **total precargado en N**:
  - subir (nuevo > N): camino feliz, botón **Guardar** en accent.
  - igual (nuevo == N): Guardar neutro/deshabilitado (no hay cambios).
  - bajar (nuevo < N): la barra pasa a estado **danger** con el aviso
    "Bajás de N a M: se liberan (N−M) copias. Puede cancelar publicaciones, subastas o propuestas que
    las usen." y el botón se convierte en **"Liberar K copias"** (rojo) + un "Cancelar". Requiere ese
    click explícito para confirmar.
- Batch de a uno; el modal queda abierto. Tras guardar: toast + la tarjeta refleja el nuevo "Tenés N".

**Faltantes (`faltante`)** — fuente: maestro menos lo que poseo (`excludeOwnedBy`).
- Estados de tarjeta: **agregable** (`+ Agregar`), **ya en wishlist** (✓ + "Quitar"),
  **recién agregada** (✓ "Agregada", estado de sesión). Sin stepper.
- Agregar → `POST`; Quitar → `DELETE`. Modal abierto para batch. Cada acción dispara un toast.

### 6.4 Feedback: sistema de toasts

Sistema liviano y reusable, sin librería externa (en `frontend/src/components/toast/`):
- `ToastProvider` (context) + `useToast()` → `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`.
- `ToastViewport` montado una vez en `MainLayout` (esquina; auto-dismiss ~3–4s; apilable; dismiss manual).
- Colores semánticos con los tokens de la app (`GREEN`/`RED`/`BLUE` inline, según CLAUDE.md del frontend).
- Accesible: `role="status"` / `aria-live="polite"` (éxito/info) y `role="alert"` (error).

### 6.5 Manejo de errores (sin nativos)

- Se elimina el **`window.prompt` de cantidad interno del modal**
  ([`AgregarFiguritaModal` línea ~43](../../../frontend/src/pages/coleccion/components/AgregarFiguritaModal.tsx)),
  reemplazado por el stepper del `CantidadConfigurator`. **`askQuantity` NO se toca**: lo usa el flujo
  "Publicar Intercambio" de `TodasPage`/`RepetidasPage`, que es otro camino (ver §4 "No incluye").
- Cero `alert()`. Los errores de mutación se muestran como **toast de error** con el mapeo actual de
  status → mensaje (409 → "Ya tenés esta figurita." / "No se pudo actualizar la cantidad."; 404 →
  "Figurita no encontrada."; 403 → "No tenés permiso para esta acción."). Errores de validación del
  stepper (p. ej. total inválido) se muestran inline en el configurador, no como toast.

### 6.6 Pulido visual y accesibilidad

- Skeletons en la grilla (reemplaza el texto "Cargando…").
- Buscador con icono de lupa + botón "limpiar".
- Tarjetas `12px` radius / borde `0.5px` / hover suave; estados con color semántico.
- `EmptyState` real para "sin resultados".
- `aria-label` en stepper (± ) y botón cerrar; focus visible; **Esc** cierra; **Enter** confirma en el
  configurador.

## 7. Flujo de datos (resumen)

1. Abrir modal (repetidas): `useMaestro({})` (grilla) **+** `useMisCantidades(username)` (mapa). Merge por
   `base.id` → cada tarjeta sabe "Tenés N".
2. Abrir modal (faltantes): `useMaestro({ excludeOwnedBy: user.id })` (grilla) **+**
   `useWishlistBaseIds(username)` (set) → marca "En tu wishlist".
3. Mutar: `PUT`/`POST`/`DELETE` según el caso → en éxito: toast + actualizar estado de sesión local +
   invalidar las queries de React Query (`['figuritas', …]`, wishlist, cantidades) + `onDone()` para que
   la página madre refresque su lista.

## 8. Testing

**Frontend (vitest + RTL):**
- `CantidadConfigurator`: subir/bajar/igual; el estado de confirmación de liberación aparece **sólo** al
  bajar; Guardar deshabilitado sin cambios; Enter confirma; aria-labels presentes.
- `CatalogoCard`: badge "Tenés N" desde el mapa; estados faltantes (agregable / en wishlist / agregada).
- `AgregarFiguritaModal`: merge de cantidades sobre la grilla; `POST`/`PUT`/`DELETE` llamados con el
  payload correcto; error → toast de error (api mockeada); **assert de que no se usa `window.prompt`**.
- `ToastProvider`/`useToast`: se muestra y auto-descarta; error usa `role="alert"`.

**Backend (JUnit):**
- Test del endpoint `/api/figuritas-base/search` con `excludeOwnedBy`: excluye las bases poseídas por ese
  usuario y respeta la paginación; sin el param, devuelve el maestro completo.
- Test de que la búsqueda unificada matchea por jugador/selección/número en ambas ramas.
- Mantener verdes los tests existentes (incl. `FiguritaServicePaginadoTest`).

## 9. Riesgos y notas

- **Tamaño de wishlist > 100:** `useWishlistBaseIds` pagina hasta agotar (el cap del backend es 100 por
  página) para no perder ids. Verificar el corte de páginas.
- **Consistencia tras liberar copias:** al bajar el total, invalidar además las queries de
  publicaciones/subastas/propuestas si estuvieran cacheadas, para reflejar cancelaciones en cascada.
- **`imagenUrl` nullable:** ~7% de las bases no tienen foto → placeholder consistente (ya contemplado).

## 10. Lista de archivos a tocar (orientativa)

**Backend:**
- `controller/FiguritaBaseController.java` — nuevo `excludeOwnedBy` en `/search`.
- `repository/FiguritaBaseRepositoryCustomImpl.java` — unificar predicado de búsqueda (jugador/selección/número).
- `test/.../FiguritaBaseControllerTest` o `FiguritaServicePaginadoTest` — cobertura del nuevo param.

**Frontend:**
- `pages/coleccion/components/AgregarFiguritaModal.tsx` — reescritura (contenedor).
- `pages/coleccion/components/CatalogoGrid.tsx` — nuevo.
- `pages/coleccion/components/CatalogoCard.tsx` — nuevo.
- `pages/coleccion/components/CantidadConfigurator.tsx` — nuevo.
- `hooks/useMaestro.ts`, `hooks/useMisCantidades.ts`, `hooks/useWishlistBaseIds.ts` — nuevos.
- `components/toast/ToastProvider.tsx`, `ToastViewport.tsx`, `useToast.ts` — nuevos.
- `layouts/MainLayout.tsx` — montar `ToastViewport` / envolver con `ToastProvider` (o en `App.tsx`).
- `pages/coleccion/RepetidasPage.tsx`, `FaltantesPage.tsx` — pasan a usar el modal nuevo (sin cambiar su
  flujo de "Publicar Intercambio"). **`askQuantity.ts` NO se toca** (lo usa ese flujo).
- Tests nuevos junto a cada componente/hook.
