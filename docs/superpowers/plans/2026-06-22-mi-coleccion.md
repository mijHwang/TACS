# Mi Colección — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar "Mis repetidas", mantener/renombrar "Mis faltantes" y limpiar "Mi Colección" extrayendo componentes reutilizables, sin tocar el backend.

**Architecture:** `ColeccionPage` pasa a ser layout puro (título + tabs + `<Outlet/>`). La vista "Todas" se extrae a `TodasPage`. Se crean `RepetidasPage` y componentes compartidos (`useFiltrosFigurita`, `FiltrosFigurita`, `TarjetaColeccion`, `GrillaFiguritas`) usados por las tres vistas. `FaltantesPage` se refactoriza para usarlos.

**Tech Stack:** React 19, TypeScript, React Router 6, TailwindCSS 4, axios (instancia `api`).

## Global Constraints

- No tocar el backend. Los endpoints `/api/usuarios/{username}/figuritas`, `.../figuritas/repetidas`, `.../figuritas/faltantes` ya existen.
- Usar la instancia `api` de `src/services/api.ts` (`api.get(...)`), igual que las páginas actuales.
- No hay runner de tests en frontend: el ciclo de verificación por tarea es `npm run build` (tsc + vite) y `npm run lint`. No se introduce Vitest.
- No commitear (instrucción permanente del usuario). El paso de commit queda diferido al final, sujeto a pedido explícito.
- Estética: reusar las clases Tailwind ya presentes en `ColeccionPage`/`FaltantesPage`.
- Comandos desde `frontend/`.

---

## File Structure

**Crear:**
- `frontend/src/pages/coleccion/components/useFiltrosFigurita.ts` — hook de estado de filtros + `filtrar()`.
- `frontend/src/pages/coleccion/components/FiltrosFigurita.tsx` — UI de filtros (búsqueda + 3 inputs).
- `frontend/src/pages/coleccion/components/TarjetaColeccion.tsx` — card con slot `footer` y `onClick?`.
- `frontend/src/pages/coleccion/components/GrillaFiguritas.tsx` — grilla + estado vacío.
- `frontend/src/pages/coleccion/TodasPage.tsx` — vista "Todas" (extraída del índice actual).
- `frontend/src/pages/coleccion/RepetidasPage.tsx` — vista "Mis repetidas".

**Modificar:**
- `frontend/src/pages/coleccion/ColeccionPage.tsx` — layout puro (título "Mi Colección" + 3 tabs + `<Outlet/>`).
- `frontend/src/pages/coleccion/FaltantesPage.tsx` — refactor a componentes compartidos.
- `frontend/src/router/router.tsx` — rutas `index` (TodasPage) y `repetidas` (RepetidasPage).
- `frontend/src/layouts/MainLayout.tsx` — label "Mi Colección".

---

### Task 1: Componentes de filtro compartidos

**Files:**
- Create: `frontend/src/pages/coleccion/components/useFiltrosFigurita.ts`
- Create: `frontend/src/pages/coleccion/components/FiltrosFigurita.tsx`

**Interfaces:**
- Produces:
  - `interface FiguritaFiltrable { jugadorNombre: string; seleccionNombre: string; equipoNombre: string; categoriaNombre: string }`
  - `useFiltrosFigurita(): FiltrosState` donde `FiltrosState` expone `searchTerm/filterSeleccion/filterEquipo/filterCategoria`, sus setters, y `filtrar<T extends FiguritaFiltrable>(items: T[]): T[]`.
  - `<FiltrosFigurita filtros={FiltrosState} />`

- [ ] **Step 1: Crear el hook `useFiltrosFigurita.ts`**

```ts
import { useState } from 'react';

export interface FiguritaFiltrable {
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
}

export function useFiltrosFigurita() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  function filtrar<T extends FiguritaFiltrable>(items: T[]): T[] {
    const s = searchTerm.toLowerCase();
    const sel = filterSeleccion.toLowerCase();
    const eq = filterEquipo.toLowerCase();
    const cat = filterCategoria.toLowerCase();
    return items.filter((it) => {
      const matchesSearch = (it.jugadorNombre || '').toLowerCase().includes(s);
      const matchesSeleccion = sel === '' || (it.seleccionNombre || '').toLowerCase().includes(sel);
      const matchesEquipo = eq === '' || (it.equipoNombre || '').toLowerCase().includes(eq);
      const matchesCategoria = cat === '' || (it.categoriaNombre || '').toLowerCase().includes(cat);
      return matchesSearch && matchesSeleccion && matchesEquipo && matchesCategoria;
    });
  }

  return {
    searchTerm, setSearchTerm,
    filterSeleccion, setFilterSeleccion,
    filterEquipo, setFilterEquipo,
    filterCategoria, setFilterCategoria,
    filtrar,
  };
}

export type FiltrosFiguritaState = ReturnType<typeof useFiltrosFigurita>;
```

- [ ] **Step 2: Crear `FiltrosFigurita.tsx`**

```tsx
import type { FiltrosFiguritaState } from './useFiltrosFigurita';

export default function FiltrosFigurita({ filtros }: { filtros: FiltrosFiguritaState }) {
  return (
    <>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar figurita..."
          value={filtros.searchTerm}
          onChange={(e) => filtros.setSearchTerm(e.target.value)}
          className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Selección"
          value={filtros.filterSeleccion}
          onChange={(e) => filtros.setFilterSeleccion(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Equipo"
          value={filtros.filterEquipo}
          onChange={(e) => filtros.setFilterEquipo(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Categoria"
          value={filtros.filterCategoria}
          onChange={(e) => filtros.setFilterCategoria(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verificar** — `cd frontend && npm run build && npm run lint`. Esperado: compila sin errores (los componentes aún no se usan; no debe haber errores de tipo).

---

### Task 2: `TarjetaColeccion` + `GrillaFiguritas`

**Files:**
- Create: `frontend/src/pages/coleccion/components/TarjetaColeccion.tsx`
- Create: `frontend/src/pages/coleccion/components/GrillaFiguritas.tsx`

**Interfaces:**
- Produces:
  - `<TarjetaColeccion seleccionNombre jugadorNombre equipoNombre categoriaNombre footer? onClick? />`
  - `<GrillaFiguritas isEmpty emptyMessage>{children}</GrillaFiguritas>`

- [ ] **Step 1: Crear `TarjetaColeccion.tsx`**

```tsx
import type { ReactNode } from 'react';

interface TarjetaColeccionProps {
  seleccionNombre: string;
  jugadorNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  footer?: ReactNode;
  onClick?: () => void;
}

export default function TarjetaColeccion({
  seleccionNombre, jugadorNombre, equipoNombre, categoriaNombre, footer, onClick,
}: TarjetaColeccionProps) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={
        'bg-surface p-4 rounded-lg border border-border flex flex-col ' +
        (clickable ? 'cursor-pointer hover:bg-surface/80 transition-colors' : '')
      }
    >
      <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center">
        <p className="text-xs text-muted">Imagen</p>
      </div>
      <p className="text-xs text-muted mb-2">{seleccionNombre}</p>
      <p className="text-sm font-bold text-primary mb-2">{jugadorNombre}</p>
      <p className="text-xs text-text mb-2">{equipoNombre}</p>
      <p className="text-xs text-muted mb-3">{categoriaNombre}</p>
      {footer && <div className="mt-auto">{footer}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Crear `GrillaFiguritas.tsx`**

```tsx
import type { ReactNode } from 'react';

interface GrillaFiguritasProps {
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

export default function GrillaFiguritas({ isEmpty, emptyMessage, children }: GrillaFiguritasProps) {
  if (isEmpty) {
    return <p className="text-muted">{emptyMessage}</p>;
  }
  return <div className="grid grid-cols-4 gap-4">{children}</div>;
}
```

- [ ] **Step 3: Verificar** — `cd frontend && npm run build && npm run lint`. Esperado: compila sin errores.

---

### Task 3: `TodasPage` (extraer la vista índice)

**Files:**
- Create: `frontend/src/pages/coleccion/TodasPage.tsx`

**Interfaces:**
- Consumes: `useFiltrosFigurita`, `FiltrosFigurita`, `TarjetaColeccion`, `GrillaFiguritas`, `api`, `useAuth`.
- Produces: default export `TodasPage` (componente de ruta índice).

- [ ] **Step 1: Crear `TodasPage.tsx`** (mueve el fetch `/figuritas` y la grilla con badge `x{count}` que hoy vive embebida en `ColeccionPage`)

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

interface FiguritaResponseDTO {
  id: string;
  figuritaBaseId: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  count: number;
  ownerId: string;
  ownerName: string;
}

export default function TodasPage() {
  const { user } = useAuth();
  const [figuritas, setFiguritas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const filtros = useFiltrosFigurita();

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/figuritas`)
      .then((res) => { setFiguritas(res.data); setLoading(false); })
      .catch((error) => { console.error('Error fetching figuritas:', error); setLoading(false); });
  }, [user?.username]);

  if (loading) return <p className="text-text">Cargando figuritas...</p>;

  const visibles = filtros.filtrar(figuritas);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="No tienes figuritas aún">
        {visibles.map((f) => (
          <TarjetaColeccion
            key={f.figuritaBaseId}
            seleccionNombre={f.seleccionNombre}
            jugadorNombre={f.jugadorNombre}
            equipoNombre={f.equipoNombre}
            categoriaNombre={f.categoriaNombre}
            footer={
              <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                x{f.count}
              </span>
            }
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}
```

- [ ] **Step 2: Verificar** — `cd frontend && npm run build && npm run lint`. Esperado: compila (aún no enrutado; se enruta en Task 6).

---

### Task 4: `RepetidasPage`

**Files:**
- Create: `frontend/src/pages/coleccion/RepetidasPage.tsx`

**Interfaces:**
- Consumes: igual que Task 3, más el endpoint `.../figuritas/repetidas`.
- Produces: default export `RepetidasPage`.

- [ ] **Step 1: Crear `RepetidasPage.tsx`** (footer = total + excedente `x{count} ({count-1} repetidas)`, solo lectura)

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

interface FiguritaResponseDTO {
  id: string;
  figuritaBaseId: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  count: number;
  ownerId: string;
  ownerName: string;
}

export default function RepetidasPage() {
  const { user } = useAuth();
  const [repetidas, setRepetidas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const filtros = useFiltrosFigurita();

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/figuritas/repetidas`)
      .then((res) => { setRepetidas(res.data); setLoading(false); })
      .catch((error) => { console.error('Error fetching repetidas:', error); setLoading(false); });
  }, [user?.username]);

  if (loading) return <p className="text-text">Cargando repetidas...</p>;

  const visibles = filtros.filtrar(repetidas);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="No tenés figuritas repetidas">
        {visibles.map((f) => (
          <TarjetaColeccion
            key={f.figuritaBaseId}
            seleccionNombre={f.seleccionNombre}
            jugadorNombre={f.jugadorNombre}
            equipoNombre={f.equipoNombre}
            categoriaNombre={f.categoriaNombre}
            footer={
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                  x{f.count}
                </span>
                <span className="text-xs text-muted">({f.count - 1} repetidas)</span>
              </span>
            }
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}
```

- [ ] **Step 2: Verificar** — `cd frontend && npm run build && npm run lint`. Esperado: compila.

---

### Task 5: Refactor `FaltantesPage`

**Files:**
- Modify: `frontend/src/pages/coleccion/FaltantesPage.tsx`

**Interfaces:**
- Consumes: componentes compartidos. Mantiene el comportamiento actual (click → `/buscar` con `state`).

- [ ] **Step 1: Reescribir `FaltantesPage.tsx`** usando los componentes compartidos (footer = `#numero`, onClick → navega a `/buscar`)

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

interface FiguritaBaseDTO {
  id: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
}

export default function ColeccionFaltantesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [faltantes, setFaltantes] = useState<FiguritaBaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const filtros = useFiltrosFigurita();

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/figuritas/faltantes`)
      .then((res) => { setFaltantes(res.data); setLoading(false); })
      .catch((error) => { console.error('Error fetching faltantes:', error); setLoading(false); });
  }, [user?.username]);

  if (loading) return <p className="text-text">Cargando faltantes...</p>;

  const visibles = filtros.filtrar(faltantes);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="¡Tienes todas las figuritas!">
        {visibles.map((f) => (
          <TarjetaColeccion
            key={f.id}
            seleccionNombre={f.seleccionNombre}
            jugadorNombre={f.jugadorNombre}
            equipoNombre={f.equipoNombre}
            categoriaNombre={f.categoriaNombre}
            onClick={() => navigate('/buscar', { state: { filterByBaseId: f.id, figuritaInfo: f } })}
            footer={<p className="text-xs text-muted">#{f.numero}</p>}
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}
```

- [ ] **Step 2: Verificar** — `cd frontend && npm run build && npm run lint`. Esperado: compila; comportamiento de click idéntico al actual.

---

### Task 6: `ColeccionPage` layout puro + router + sidebar

**Files:**
- Modify: `frontend/src/pages/coleccion/ColeccionPage.tsx`
- Modify: `frontend/src/router/router.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`

**Interfaces:**
- Consumes: `TodasPage`, `RepetidasPage`, `FaltantesPage` como rutas hijas.

- [ ] **Step 1: Reescribir `ColeccionPage.tsx` como layout puro** (título "Mi Colección" + 3 tabs con `NavLink` + `<Outlet/>`). El `NavLink` del índice usa `end` para no quedar activo en subrutas.

```tsx
import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '', label: 'Todas', end: true },
  { to: 'repetidas', label: 'Mis repetidas', end: false },
  { to: 'faltantes', label: 'Mis faltantes', end: false },
];

export default function ColeccionPage() {
  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text mb-1">Mi Colección</h1>
      <p className="text-sm text-muted mb-6">Administrá tus figuritas</p>

      <nav className="flex gap-2 mb-8 flex-wrap">
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
      </nav>

      <Outlet />
    </div>
  );
}
```

- [ ] **Step 2: Actualizar `router.tsx`** — agregar imports lazy de `TodasPage` y `RepetidasPage`, y declarar las rutas hijas (índice = TodasPage, `repetidas`, `faltantes`).

En la sección de imports lazy de Colección:
```tsx
const ColeccionPage = lazy(() => import('../pages/coleccion/ColeccionPage'));
const TodasPage = lazy(() => import('../pages/coleccion/TodasPage'));
const RepetidasPage = lazy(() => import('../pages/coleccion/RepetidasPage'));
const FaltantesPage = lazy(() => import('../pages/coleccion/FaltantesPage'));
```

Y reemplazar el bloque de ruta `coleccion`:
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

- [ ] **Step 3: Actualizar `MainLayout.tsx`** — en `navLinks`, cambiar el label de Colección:
```tsx
{ to: '/coleccion', label: 'Mi Colección', icon: 'coleccion' },
```

- [ ] **Step 4: Verificar** — `cd frontend && npm run build && npm run lint`. Esperado: compila sin errores ni warnings nuevos de lint.

---

## Verificación final (manual / Puppeteer, al cierre del proyecto)

- [ ] Sidebar muestra "Mi Colección".
- [ ] `/coleccion` muestra 3 tabs: Todas · Mis repetidas · Mis faltantes; "Todas" activa solo en el índice.
- [ ] "Todas" lista la colección con badge `x{count}`.
- [ ] "Mis repetidas" lista solo `count>1` con `x{count} ({count-1} repetidas)`.
- [ ] "Mis faltantes" lista faltantes; click → `/buscar` con la figurita filtrada.
- [ ] Filtros (búsqueda + selección/equipo/categoría) funcionan en las 3 tabs.

## Self-Review (cobertura del spec)

- "Todas + Mis repetidas + Mis faltantes" → Tasks 3/4/5/6. ✓
- Conteo `x{count} ({count-1} repetidas)` → Task 4. ✓
- Solo lectura en repetidas → Task 4 (sin `onClick`). ✓
- Extraer componentes reutilizables → Tasks 1/2, consumidos por 3/4/5. ✓
- Renombres ("Mi Colección", tabs, sidebar) → Tasks 6. ✓
- Backend sin cambios → ninguna tarea toca backend. ✓
- Testing build+lint → cada task; manual/Puppeteer al final. ✓
