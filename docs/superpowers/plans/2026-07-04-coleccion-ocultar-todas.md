# Ocultar "Todas" en Mi Colección — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sacar la tab "Todas" de Mi Colección, dejar Mis Repetidas como landing y conservar el inventario completo accesible solo por URL (`/coleccion/todas`) en modo solo-lectura.

**Architecture:** Cambio 100% frontend. Se recorta `TodasPage` a solo-lectura, se quita su tab de `ColeccionPage` y se reconfigura el routing de `/coleccion` (índice → redirect a `repetidas`, nueva ruta `todas`). Las acciones (Publicar/Subastar/+Agregar) ya viven en `RepetidasPage`, así que no se migra nada.

**Tech Stack:** React 19 + TypeScript, React Router 6, Vitest + React Testing Library, TailwindCSS v4.

## Global Constraints

- **Frontend only.** El backend NO se toca. Ningún endpoint nuevo.
- **No romper** `RepetidasPage` ni `FaltantesPage` (quedan sin cambios).
- **Regla de git del proyecto:** no commitear sin pedido explícito del usuario. Los pasos "Commit" quedan **pendientes de su OK**; durante la ejecución se implementa y verifica, y se pregunta antes de commitear.
- Colores de acento siempre inline (`style={}`), nunca utilidades Tailwind. No aplica en este plan (no se agregan acentos nuevos).
- Verificación de cada tarea con `cd frontend && npm run test -- <archivo>` (Vitest) donde haya test; `npm run build` + `npm run lint` al final.

---

### Task 1: `TodasPage` → inventario de solo-lectura

**Files:**
- Modify: `frontend/src/pages/coleccion/TodasPage.tsx` (reescritura completa, sin acciones)
- Test: `frontend/src/pages/coleccion/TodasPage.test.tsx` (agregar aserción de ausencia de acciones)

**Interfaces:**
- Consumes: `useFiguritasPaginadas(username, params)` de `../../hooks/useFiguritas` (sin cambios), `useFiltrosServidor()` de `./components/useFiltrosServidor`.
- Produces: componente `TodasPage` (default export) que renderiza una grilla de `TarjetaColeccion` **sin** `onPublishExchange`/`onAuction`/`onClick` y **sin** botón "+ Agregar Figurita".

- [ ] **Step 1: Escribir la aserción que falla** (agregar al final del primer `it` de `TodasPage.test.tsx`, después de `expect(lastParams?.page).toBe(0);`)

```tsx
    // Solo-lectura: no hay acciones de mutación en Todas
    expect(screen.queryByRole('button', { name: /agregar figurita/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd frontend && npm run test -- src/pages/coleccion/TodasPage.test.tsx`
Expected: FAIL — el `TodasPage` actual sí renderiza el botón "+ Agregar Figurita", así que `queryByRole` lo encuentra y la aserción `.not.toBeInTheDocument()` falla.

- [ ] **Step 3: Reescribir `TodasPage.tsx` en modo solo-lectura**

Reemplazar TODO el contenido de `frontend/src/pages/coleccion/TodasPage.tsx` por:

```tsx
import { useAuth } from '../../auth/useAuth';
import { useFiguritasPaginadas } from '../../hooks/useFiguritas';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';

/**
 * Vista "Todas": inventario completo del usuario, agrupado, paginado y filtrado server-side.
 * Es de **solo-lectura** y NO aparece en las tabs de Mi Colección; queda accesible por URL
 * directa (`/coleccion/todas`). Muestra todo lo que el usuario posee con badge `x{count}`,
 * incluidas las figuritas en cantidad 1 (que no salen en Repetidas ni Faltantes).
 * Las acciones (publicar/subastar/agregar) viven en `RepetidasPage`.
 */
export default function TodasPage() {
  const { user } = useAuth();
  const { filtros, page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
  const { data, isLoading } = useFiguritasPaginadas(user?.username, params);
  const figuritas = data?.content ?? [];

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      {isLoading ? (
        <p className="text-text">Cargando figuritas...</p>
      ) : (
        <>
          <ListToolbar total={data?.totalElements ?? 0}>
            <PageSizeSelector value={pageSize} options={options} onChange={(n) => setPageSize(n)} />
          </ListToolbar>
          <GrillaFiguritas isEmpty={figuritas.length === 0} emptyMessage="No tenés figuritas aún">
            {figuritas.map((f) => (
              <TarjetaColeccion
                key={f.figuritaBaseId}
                seleccionNombre={f.seleccionNombre}
                jugadorNombre={f.jugadorNombre}
                equipoNombre={f.equipoNombre}
                categoriaNombre={f.categoriaNombre}
                imagenUrl={f.imagenUrl}
                footer={
                  <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                    x{f.count}
                  </span>
                }
              />
            ))}
          </GrillaFiguritas>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
    </>
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `cd frontend && npm run test -- src/pages/coleccion/TodasPage.test.tsx`
Expected: PASS — render de Messi/Dibu + `<Paginador>` + cambio de página + ausencia del botón "+ Agregar Figurita".

- [ ] **Step 5: Commit** (pendiente del OK del usuario por la regla de git)

```bash
git add frontend/src/pages/coleccion/TodasPage.tsx frontend/src/pages/coleccion/TodasPage.test.tsx
git commit -m "refactor(coleccion): TodasPage a inventario de solo-lectura (sin acciones)"
```

---

### Task 2: Quitar la tab "Todas" de `ColeccionPage`

**Files:**
- Modify: `frontend/src/pages/coleccion/ColeccionPage.tsx` (array `tabs` + map de `NavLink`)
- Test: `frontend/src/pages/coleccion/ColeccionPage.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `NavLink`, `Outlet` de `react-router-dom` (ya usados).
- Produces: `ColeccionPage` (default export) que renderiza exactamente dos tabs: "Mis repetidas" (`to="repetidas"`) y "Mis faltantes" (`to="faltantes"`). Sin tab "Todas".

- [ ] **Step 1: Escribir el test que falla** (crear `frontend/src/pages/coleccion/ColeccionPage.test.tsx`)

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ColeccionPage from './ColeccionPage';

describe('ColeccionPage tabs', () => {
  it('muestra solo Mis repetidas y Mis faltantes (Todas oculta)', () => {
    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Mis repetidas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis faltantes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Todas' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd frontend && npm run test -- src/pages/coleccion/ColeccionPage.test.tsx`
Expected: FAIL — el `ColeccionPage` actual incluye la tab "Todas", así que `queryByRole('link', { name: 'Todas' })` la encuentra y `.not.toBeInTheDocument()` falla.

- [ ] **Step 3: Quitar "Todas" del array `tabs` y simplificar el map**

En `frontend/src/pages/coleccion/ColeccionPage.tsx`, reemplazar el array `tabs`:

```tsx
const tabs = [
  { to: '', label: 'Todas', end: true },
  { to: 'repetidas', label: 'Mis repetidas', end: false },
  { to: 'faltantes', label: 'Mis faltantes', end: false },
];
```

por:

```tsx
const tabs = [
  { to: 'repetidas', label: 'Mis repetidas' },
  { to: 'faltantes', label: 'Mis faltantes' },
];
```

Y reemplazar el `.map(...)` de los `NavLink` (que hoy desestructura `end` y usa `key={to || 'todas'}` + `end={end}`):

```tsx
        {tabs.map(({ to, label, end }) => (
          <NavLink
            key={to || 'todas'}
            to={to}
            end={end}
            className={({ isActive }) =>
              'px-4 py-1.5 rounded-md text-sm font-medium border transition-all duration-150 no-underline ' +
              (isActive
                ? 'bg-primary/15 text-primary border-primary/50 font-semibold'
                : 'text-muted border-border hover:bg-surface2 hover:text-text')
            }
          >
            {label}
          </NavLink>
        ))}
```

por (sin `end`, `key={to}`):

```tsx
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              'px-4 py-1.5 rounded-md text-sm font-medium border transition-all duration-150 no-underline ' +
              (isActive
                ? 'bg-primary/15 text-primary border-primary/50 font-semibold'
                : 'text-muted border-border hover:bg-surface2 hover:text-text')
            }
          >
            {label}
          </NavLink>
        ))}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `cd frontend && npm run test -- src/pages/coleccion/ColeccionPage.test.tsx`
Expected: PASS — se ven "Mis repetidas" y "Mis faltantes", y NO se ve "Todas".

- [ ] **Step 5: Commit** (pendiente del OK del usuario)

```bash
git add frontend/src/pages/coleccion/ColeccionPage.tsx frontend/src/pages/coleccion/ColeccionPage.test.tsx
git commit -m "feat(coleccion): quitar la tab Todas (tabs primarias: Repetidas + Faltantes)"
```

---

### Task 3: Reconfigurar el routing de `/coleccion`

**Files:**
- Modify: `frontend/src/router/router.tsx:72-80` (children de la ruta `coleccion`)

**Interfaces:**
- Consumes: `Navigate` de `react-router-dom` (ya importado en `router.tsx`, línea 2), `TodasPage`/`RepetidasPage`/`FaltantesPage` (lazy imports ya presentes, líneas 23-25).
- Produces: routing donde `/coleccion` redirige a `/coleccion/repetidas`, y `/coleccion/todas` renderiza `TodasPage`.

> **Nota de testing:** el proyecto no tiene tests unitarios del router (el `router.tsx` real depende de auth, lazy y `MainLayout`). Esta tarea se verifica con `npm run build` + `npm run lint` + smoke manual, consistente con el resto del codebase.

- [ ] **Step 1: Editar los children de `coleccion`**

En `frontend/src/router/router.tsx`, reemplazar:

```tsx
          {
            path: 'coleccion',
            element: <ColeccionPage />,
            children: [
              { index: true, element: <TodasPage /> },
              { path: 'repetidas', element: <RepetidasPage /> },
              { path: 'faltantes', element: <FaltantesPage /> },
            ],
          },
```

por:

```tsx
          {
            path: 'coleccion',
            element: <ColeccionPage />,
            children: [
              { index: true, element: <Navigate to="repetidas" replace /> },
              { path: 'repetidas', element: <RepetidasPage /> },
              { path: 'faltantes', element: <FaltantesPage /> },
              { path: 'todas', element: <TodasPage /> },
            ],
          },
```

- [ ] **Step 2: Verificar build y lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build OK (tsc no reporta imports sin usar — `TodasPage`, `Navigate`, `RepetidasPage`, `FaltantesPage` siguen usados), lint sin errores.

- [ ] **Step 3: Correr toda la suite de tests del frontend**

Run: `cd frontend && npm run test`
Expected: PASS — la suite completa verde (incluye los tests nuevos/modificados de Tasks 1-2 y los existentes de Repetidas/Faltantes intactos).

- [ ] **Step 4: Smoke manual** (con la app levantada y un usuario con figuritas)

1. Sidebar "Mi Colección" → `/coleccion` → aterriza en **Mis Repetidas** (URL `/coleccion/repetidas`, tab resaltada).
2. Solo se ven dos tabs: **Mis repetidas** y **Mis faltantes**.
3. En **Mis repetidas** funcionan Publicar / Subastar / "+ Agregar Figurita".
4. En **Mis faltantes**, todo igual que antes (wishlist + Quitar + ir a Buscar).
5. Navegar a `/coleccion/todas` por URL → muestra el inventario completo de solo-lectura (badge `x{count}`, filtros, paginado), sin botones de acción y sin figurar en las tabs.

- [ ] **Step 5: Commit** (pendiente del OK del usuario)

```bash
git add frontend/src/router/router.tsx
git commit -m "feat(coleccion): landing en Repetidas + Todas accesible solo por URL (/coleccion/todas)"
```

---

## Self-Review

**Spec coverage:**
- Objetivo 1 (sacar Todas del nav) → Task 2. ✅
- Objetivo 2 (landing en Repetidas) → Task 3 (índice redirige a `repetidas`). ✅
- Objetivo 3 (Todas viva por URL) → Task 3 (`path: 'todas'`). ✅
- Objetivo 4 (Todas read-only) → Task 1. ✅
- Faltantes sin cambios → no hay tarea que lo toque. ✅
- Sin backend → ninguna tarea toca backend. ✅

**Placeholder scan:** sin TBD/TODO; todo el código está completo e inline. ✅

**Type consistency:** `TodasPage` sigue siendo default export usado por el lazy import de `router.tsx`; `useFiguritasPaginadas`/`useFiltrosServidor` con las mismas firmas; `TarjetaColeccion` usado sin props de acción (soportado por su interfaz actual — todas opcionales). `Navigate` ya importado. ✅

**Verificación final global:** `cd frontend && npm run build && npm run lint && npm run test`.
