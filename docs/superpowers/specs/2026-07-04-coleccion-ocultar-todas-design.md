# Spec — Ocultar "Todas" en Mi Colección (tabs primarias: Repetidas + Faltantes)

- **Fecha:** 2026-07-04
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **User Stories relacionadas:** reorganización de UX de US1 (publicar repetida) y US2 (faltantes). No agrega ni quita funcionalidad de negocio.
- **Alcance:** Frontend únicamente. El backend **no se modifica** (sin endpoints nuevos).

## 1. Contexto y problema

Hoy `Mi Colección` (`/coleccion`) tiene tres tabs: **Todas** (landing/índice), **Mis repetidas** y **Mis faltantes**. La tab **Todas** ([`TodasPage`](../../../frontend/src/pages/coleccion/TodasPage.tsx)) lista todo el inventario del usuario con badge `x{count}` y acciones por tarjeta (Publicar Intercambio / Subastar) + botón "+ Agregar Figurita".

El problema: **Todas** y **Mis repetidas** están casi duplicadas. Al revisar el código, [`RepetidasPage`](../../../frontend/src/pages/coleccion/RepetidasPage.tsx) **ya implementa exactamente las mismas acciones** que Todas (Publicar Intercambio, Subastar, "+ Agregar Figurita" en modo `poseida`); la única diferencia real es el origen de datos (`useRepetidasPaginadas`, `count>1`) y el footer (`x{count} ({count-1} repetidas)`). Es decir, "Todas" aporta poco por encima de "Mis repetidas".

Decisión del equipo: **ocultar "Todas"** del nav y dejar como tabs primarias **Mis Repetidas** (hub de acción) y **Mis Faltantes** (wishlist).

## 2. Objetivos / No-objetivos

**Objetivos**
1. Sacar **Todas** de la barra de tabs de `Mi Colección`.
2. Dejar **Mis Repetidas** como landing por defecto de `/coleccion`.
3. Conservar la vista de inventario completo **accesible por URL** (`/coleccion/todas`), sin link visible en el nav.
4. Dejar `TodasPage` como **inventario de solo-lectura** (coherente con su nuevo rol de fallback).

**No-objetivos (fuera de alcance)**
- Tocar el backend (ningún endpoint cambia).
- Cambiar el comportamiento de `RepetidasPage` o `FaltantesPage` (ya funcionan y ya tienen sus acciones).
- Agregar una vista de "progreso del álbum" / completitud (se descartó en brainstorming).
- Agregar un link discreto a Todas (queda huérfana por diseño; reintroducirlo es trivial a futuro).
- Migrar los `window.prompt/alert` nativos restantes (es otra tarea, en curso en otra sesión).

## 3. Decisiones (cerradas en brainstorming)

| Tema | Decisión |
|---|---|
| Rol de "Todas" | **Oculta**: fuera del nav, pero **viva por URL** (`/coleccion/todas`), como inventario de solo-lectura. Se descartó convertirla en tablero de progreso. |
| Acciones (Publicar/Subastar/+Agregar) | **Todo a Mis Repetidas** — que ya las tiene hoy. No hay nada que migrar. |
| Tab por defecto (landing de `/coleccion`) | **Mis Repetidas**. |
| Mis Faltantes | Sin cambios (wishlist declarada). |
| Figuritas en cantidad 1 | No aparecen en Repetidas (`count>1`) ni en Faltantes (wishlist). Siguen visibles en `/coleccion/todas`. Trade-off aceptado. |

## 4. Diseño detallado

### 4.1 Tabs ([`ColeccionPage.tsx`](../../../frontend/src/pages/coleccion/ColeccionPage.tsx))

`ColeccionPage` sigue siendo layout puro (título + tabs + `<Outlet/>`). Se quita la entrada **Todas** del array `tabs`; quedan dos:

```
Mi Colección
├── Mis repetidas   → to="repetidas"
└── Mis faltantes   → to="faltantes"
```

Ninguna de las dos es índice, así que se resaltan correctamente vía `NavLink` en sus paths (`/coleccion/repetidas`, `/coleccion/faltantes`). El sidebar ([`MainLayout.tsx`](../../../frontend/src/layouts/MainLayout.tsx)) mantiene `to: '/coleccion'` sin cambios.

### 4.2 Routing ([`router.tsx`](../../../frontend/src/router/router.tsx))

Hoy el índice de `coleccion` renderiza `<TodasPage/>`. Se cambia a:

```
/coleccion              → ColeccionPage (layout)
   index                → <Navigate to="repetidas" replace/>   (landing = Repetidas)
   /coleccion/repetidas → RepetidasPage
   /coleccion/faltantes → FaltantesPage
   /coleccion/todas     → TodasPage      (accesible por URL, sin link en el nav)
```

Cambios concretos en `router.tsx`:
- Reemplazar `{ index: true, element: <TodasPage /> }` por `{ index: true, element: <Navigate to="repetidas" replace /> }`.
- Agregar `{ path: 'todas', element: <TodasPage /> }`.
- `repetidas` y `faltantes` quedan igual. El `import` lazy de `TodasPage` se mantiene.

Beneficio colateral: cualquier link o navegación existente a `/coleccion` (p. ej. desde el Dashboard o el sidebar) cae de forma elegante en Repetidas vía el redirect.

### 4.3 `TodasPage` → solo-lectura ([`TodasPage.tsx`](../../../frontend/src/pages/coleccion/TodasPage.tsx))

Al quedar como fallback por URL, se le quitan las acciones para dejarla como inventario de consulta:
- Quitar `onPublishExchange` / `onAuction` / `canAuction` / `isPublishing` de cada `<TarjetaColeccion>`.
- Quitar el botón "+ Agregar Figurita" y el `<AgregarFiguritaModal>` (con su estado `showAdd`).
- Quitar los handlers e imports que quedan sin uso (`handlePublishExchange`, `handleSubastaClick`, `askQuantity`, `useNavigate`, `api`, `AgregarFiguritaModal`, `useState` si no queda otro uso, `publishingId`).
- Se conserva: filtros (`FiltrosFigurita`), grilla, `PageSizeSelector`, `Paginador`, badge `x{count}` en el footer, `refetch` no es necesario (queda solo lectura sin mutaciones). La toolbar puede quedar solo con el `PageSizeSelector` (sin el botón de agregar).

Resultado: grilla de todo el inventario, filtrable y paginada, sin botones de acción.

### 4.4 Componentes compartidos

`TarjetaColeccion`, `FiltrosFigurita`, `GrillaFiguritas`, `ListToolbar`, `PageSizeSelector`, `Paginador` no se modifican. `TarjetaColeccion` ya soporta el modo "sin acciones" (cuando no se pasan `onPublishExchange`/`onAuction`/`onClick` es una tarjeta estática), así que la versión read-only de Todas encaja sin tocar el componente.

## 5. Lista de cambios por archivo

**Modificados**
- `frontend/src/pages/coleccion/ColeccionPage.tsx` → sacar la tab "Todas" del array `tabs`.
- `frontend/src/router/router.tsx` → índice redirige a `repetidas`; nueva ruta `todas`.
- `frontend/src/pages/coleccion/TodasPage.tsx` → versión de solo-lectura (sin acciones ni modal).
- `frontend/src/pages/coleccion/TodasPage.test.tsx` → ajustar/confirmar (el test actual solo verifica render + paginado; debería seguir verde, se revisa que no referencie acciones).

**Sin cambios**
- Todo el backend.
- `RepetidasPage.tsx`, `FaltantesPage.tsx` (ya tienen su comportamiento y acciones).
- `TarjetaColeccion.tsx`, `FiltrosFigurita.tsx`, `GrillaFiguritas.tsx`, `MainLayout.tsx`.

## 6. Testing / verificación

- `RepetidasPage`/`FaltantesPage`: sin cambios → sus tests actuales siguen aplicando.
- `TodasPage.test.tsx`: verifica render de la grilla + paginado; se confirma verde con la versión read-only (no testea acciones).
- `cd frontend && npm run build` (tsc + Vite; valida que no queden imports/símbolos sin usar tras el recorte de Todas).
- `cd frontend && npm run lint`.
- **Smoke manual** (app levantada, usuario con figuritas):
  1. El sidebar "Mi Colección" lleva a `/coleccion` y aterriza en **Mis Repetidas**.
  2. Solo se ven dos tabs: **Mis repetidas** y **Mis faltantes**.
  3. `Mis repetidas` permite Publicar / Subastar / + Agregar (como hoy).
  4. `Mis faltantes` funciona igual que antes.
  5. `/coleccion/todas` (URL directa) muestra el inventario completo, de solo-lectura, sin aparecer en las tabs.

## 7. Riesgos

- **Muy bajo.** Cambio acotado a routing + recorte de una página. No toca backend ni lógica de negocio.
- Símbolos sin usar tras recortar `TodasPage`: mitigado por `tsc`/ESLint en la verificación.
- Links externos a `/coleccion` que asumían "Todas": mitigado — el redirect los lleva a Repetidas sin romperse.

## 8. Cuestiones abiertas

Ninguna.
