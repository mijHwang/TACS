# Selector de cantidad por página + Paginador siempre visible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al usuario un selector global de cuántos resultados ver por página (10/20/50/100) en todas las listas paginadas server-side, con contador de resultados, y que el `Paginador` muestre siempre la fila de números.

**Architecture:** Tres piezas compartidas nuevas — `usePageSize` (preferencia global en localStorage), `PageSizeSelector` (select presentacional) y `ListToolbar` (barra arriba de la lista con contador + selector) — más un cambio al `Paginador` para que nunca se auto-oculte. Cada página cablea el `pageSize` en su fetch + `queryKey` y resetea a página 0 al cambiarlo. El default sigue siendo 10 para no romper tests existentes.

**Tech Stack:** React 19, TypeScript, @tanstack/react-query, Vitest + Testing Library, TailwindCSS v4.

## Global Constraints

- **Opciones de tamaño:** `[10, 20, 50, 100]`. **Default: 10** (no cambiar — varios tests asertan `size: 10`).
- **Persistencia:** global en `localStorage`, clave exacta `tacs.pageSize`. Validar contra las opciones; valor inválido/ausente → 10.
- **Paginador:** SIEMPRE renderiza la fila de números; con `totalPages` 0 o 1 muestra el botón `1` (con ‹ › deshabilitados).
- **Contador:** `{n} resultados` (singular `1 resultado`), tomado de `data.totalElements`. Caso 0 resultados muestra `0 resultados` + el `1` del Paginador.
- **Color de acento:** azul `#03BAE9` SIEMPRE inline (`style={}`), nunca como utilidad Tailwind (convención del repo). Clases de texto/superficie del repo: `text-text`, `text-muted`, `bg-surface`, `border-border`.
- **Copy:** sentence case en español ("Mostrar", "Cantidad por página").
- **Convención de exports nuevos:** `usePageSize` = named export; `PageSizeSelector` y `ListToolbar` = default export.
- **Alcance:** 12 páginas server-side. **Admin/Gift queda EXCLUIDA** (es un autocomplete/typeahead, no una lista de navegación — selector + contador + paginador siempre-visible serían mala UX). Propuestas/Nueva y Perfil/Historial también quedan fuera del selector (ya estaban excluidas en el spec).
- **Comandos** (desde la raíz del repo): type-check `cd frontend && npx tsc -b`; lint `cd frontend && npm run lint`; tests `cd frontend && npx vitest run <archivo>`.

---

### Task 1: Constante de opciones en `api.ts`

**Files:**
- Modify: `frontend/src/services/api.ts:177`

**Interfaces:**
- Produces: `export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;` (junto al ya existente `export const DEFAULT_PAGE_SIZE = 10;`).

- [ ] **Step 1: Agregar la constante**

En `frontend/src/services/api.ts`, después de la línea 177 (`export const DEFAULT_PAGE_SIZE = 10;`):

```ts
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat(paginado): exponer PAGE_SIZE_OPTIONS en api.ts"
```

---

### Task 2: Hook `usePageSize`

**Files:**
- Create: `frontend/src/hooks/usePageSize.ts`
- Test: `frontend/src/hooks/usePageSize.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_PAGE_SIZE`, `PAGE_SIZE_OPTIONS` de `../services/api`.
- Produces: `export function usePageSize(): { pageSize: number; setPageSize: (n: number) => void; options: number[] }`. `setPageSize` persiste en localStorage (`tacs.pageSize`) y NO toca el estado de página (cada consumidor resetea su propia página).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/usePageSize.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePageSize } from './usePageSize';

describe('usePageSize', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to 10 when nothing is stored', () => {
    const { result } = renderHook(() => usePageSize());
    expect(result.current.pageSize).toBe(10);
    expect(result.current.options).toEqual([10, 20, 50, 100]);
  });

  it('persists the chosen size to localStorage', () => {
    const { result } = renderHook(() => usePageSize());
    act(() => result.current.setPageSize(50));
    expect(result.current.pageSize).toBe(50);
    expect(localStorage.getItem('tacs.pageSize')).toBe('50');
  });

  it('re-reads the persisted size on a fresh mount', () => {
    localStorage.setItem('tacs.pageSize', '20');
    const { result } = renderHook(() => usePageSize());
    expect(result.current.pageSize).toBe(20);
  });

  it('ignores an invalid stored value and falls back to 10', () => {
    localStorage.setItem('tacs.pageSize', '7');
    const { result } = renderHook(() => usePageSize());
    expect(result.current.pageSize).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/usePageSize.test.ts`
Expected: FAIL — `Failed to resolve import './usePageSize'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/hooks/usePageSize.ts`:

```ts
import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../services/api';

const STORAGE_KEY = 'tacs.pageSize';
const OPTIONS: number[] = [...PAGE_SIZE_OPTIONS];

function readStoredPageSize(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw == null ? NaN : Number(raw);
    return OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/**
 * Preferencia GLOBAL de cantidad por página, persistida en localStorage ('tacs.pageSize').
 * Default 10. Valida contra PAGE_SIZE_OPTIONS; un valor inválido cae al default.
 * Como las rutas montan de a una, cada página relee la preferencia al montar.
 */
export function usePageSize() {
  const [pageSize, setPageSizeState] = useState<number>(readStoredPageSize);

  const setPageSize = useCallback((n: number) => {
    const next = OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
    setPageSizeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* localStorage no disponible: la preferencia vale sólo para esta sesión */
    }
  }, []);

  return { pageSize, setPageSize, options: OPTIONS };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/usePageSize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/usePageSize.ts frontend/src/hooks/usePageSize.test.ts
git commit -m "feat(paginado): hook usePageSize con preferencia global en localStorage"
```

---

### Task 3: Componente `PageSizeSelector`

**Files:**
- Create: `frontend/src/components/PageSizeSelector.tsx`
- Test: `frontend/src/components/PageSizeSelector.test.tsx`

**Interfaces:**
- Produces: `export default function PageSizeSelector(props: { value: number; options: number[]; onChange: (n: number) => void })`. Presentacional puro: emite el número elegido; el `<select>` tiene `aria-label="Cantidad por página"`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/PageSizeSelector.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PageSizeSelector from './PageSizeSelector';

describe('PageSizeSelector', () => {
  it('renders every option and reflects the current value', () => {
    render(<PageSizeSelector value={20} options={[10, 20, 50, 100]} onChange={() => {}} />);
    const select = screen.getByLabelText('Cantidad por página') as HTMLSelectElement;
    expect(select.value).toBe('20');
    [10, 20, 50, 100].forEach((n) =>
      expect(screen.getByRole('option', { name: String(n) })).toBeInTheDocument(),
    );
  });

  it('emits the chosen size as a number', () => {
    const onChange = vi.fn();
    render(<PageSizeSelector value={10} options={[10, 20, 50, 100]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Cantidad por página'), { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/PageSizeSelector.test.tsx`
Expected: FAIL — no se resuelve `./PageSizeSelector`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/PageSizeSelector.tsx`:

```tsx
const BLUE = '#03BAE9';

interface PageSizeSelectorProps {
  value: number;
  options: number[];
  onChange: (n: number) => void;
}

/** Selector de cantidad por página ("Mostrar 10/20/50/100"). Presentacional. */
export default function PageSizeSelector({ value, options, onChange }: PageSizeSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Mostrar
      <select
        aria-label="Cantidad por página"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-lg bg-surface text-text text-sm px-2 focus:outline-none"
        style={{ border: `1.5px solid ${BLUE}` }}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/PageSizeSelector.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PageSizeSelector.tsx frontend/src/components/PageSizeSelector.test.tsx
git commit -m "feat(paginado): componente PageSizeSelector"
```

---

### Task 4: Componente `ListToolbar`

**Files:**
- Create: `frontend/src/components/ListToolbar.tsx`
- Test: `frontend/src/components/ListToolbar.test.tsx`

**Interfaces:**
- Produces: `export default function ListToolbar(props: { total?: number; children: ReactNode })`. Fila `justify-between`: izquierda contador `{n} resultados` (singular `1 resultado`; omitido si `total` es `undefined`), derecha `children`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/ListToolbar.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ListToolbar from './ListToolbar';

describe('ListToolbar', () => {
  it('shows the pluralized result count and renders children', () => {
    render(
      <ListToolbar total={25}>
        <span>child</span>
      </ListToolbar>,
    );
    expect(screen.getByText('25 resultados')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('uses the singular for exactly one result', () => {
    render(
      <ListToolbar total={1}>
        <span />
      </ListToolbar>,
    );
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
  });

  it('omits the counter when total is undefined', () => {
    render(
      <ListToolbar>
        <span>only child</span>
      </ListToolbar>,
    );
    expect(screen.queryByText(/resultado/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ListToolbar.test.tsx`
Expected: FAIL — no se resuelve `./ListToolbar`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/ListToolbar.tsx`:

```tsx
import type { ReactNode } from 'react';

interface ListToolbarProps {
  total?: number;
  children: ReactNode;
}

/** Barra sobre una lista paginada: contador "{n} resultados" a la izquierda + controles a la derecha. */
export default function ListToolbar({ total, children }: ListToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <span className="text-sm text-muted">
        {total != null ? `${total} ${total === 1 ? 'resultado' : 'resultados'}` : ''}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ListToolbar.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ListToolbar.tsx frontend/src/components/ListToolbar.test.tsx
git commit -m "feat(paginado): componente ListToolbar (contador + slot de controles)"
```

---

### Task 5: `Paginador` siempre visible

**Files:**
- Modify: `frontend/src/components/Paginador.tsx:11`
- Test: `frontend/src/components/Paginador.test.tsx:7-10`

**Interfaces:**
- Consumes/Produces: la firma del componente NO cambia (`{ page, totalPages, onChange }`). Cambia sólo el comportamiento interno: con `totalPages` 0 o 1 renderiza el botón `1`.

- [ ] **Step 1: Update the test to the new behavior (failing first)**

En `frontend/src/components/Paginador.test.tsx`, reemplazar el test de las líneas 7-10:

BEFORE:
```tsx
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Paginador page={0} totalPages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
```
AFTER:
```tsx
  it('always renders the number row, showing "1" for a single page', () => {
    render(<Paginador page={0} totalPages={1} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    expect(screen.getByLabelText('Página siguiente')).toBeDisabled();
  });

  it('renders "1" even with zero total pages', () => {
    render(<Paginador page={0} totalPages={0} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Página siguiente')).toBeDisabled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/Paginador.test.tsx`
Expected: FAIL — con `totalPages={1}` hoy el componente devuelve `null`, así que no encuentra el botón `1`.

- [ ] **Step 3: Implement the change**

En `frontend/src/components/Paginador.tsx`, reemplazar las líneas 10-17:

BEFORE:
```tsx
export default function Paginador({ page, totalPages, onChange }: PaginadorProps) {
  if (totalPages <= 1) return null;

  const WINDOW = 7;
  let start = Math.max(0, page - Math.floor(WINDOW / 2));
  const end = Math.min(totalPages, start + WINDOW);
  start = Math.max(0, end - WINDOW);
  const pages = Array.from({ length: end - start }, (_, i) => start + i);
```
AFTER:
```tsx
export default function Paginador({ page, totalPages, onChange }: PaginadorProps) {
  const WINDOW = 7;
  const pageCount = Math.max(1, totalPages);
  let start = Math.max(0, page - Math.floor(WINDOW / 2));
  const end = Math.min(pageCount, start + WINDOW);
  start = Math.max(0, end - WINDOW);
  const pages = Array.from({ length: end - start }, (_, i) => start + i);
```

Luego, en el JSX del mismo archivo, reemplazar las dos referencias restantes a `totalPages`:
- Línea 50: `{end < totalPages && <span className="px-1 text-gray-400">…</span>}` → `{end < pageCount && <span className="px-1 text-gray-400">…</span>}`
- Línea 55: `disabled={page >= totalPages - 1}` → `disabled={page >= pageCount - 1}`

- [ ] **Step 4: Run the full Paginador test to verify it passes**

Run: `cd frontend && npx vitest run src/components/Paginador.test.tsx`
Expected: PASS (los 6 tests, incluidos los 2 nuevos). Verificar que "windows the number buttons for large totalPages" sigue verde (la lógica de ventana no cambió).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Paginador.tsx frontend/src/components/Paginador.test.tsx
git commit -m "feat(paginado): Paginador siempre muestra la fila de números (1 con 0/1 páginas)"
```

---

### Task 6: Dedup de `DEFAULT_PAGE_SIZE` en `auctionService`

**Files:**
- Modify: `frontend/src/services/auctionService.ts:2,5`
- Test (verificar, no editar): `frontend/src/services/auctionService.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_PAGE_SIZE` ahora importado de `./api` (sigue valiendo 10). Las firmas de `getAll/getByUsuario/getParticipando` no cambian.

- [ ] **Step 1: Reemplazar la constante local por el import**

En `frontend/src/services/auctionService.ts`:

Línea 2 BEFORE:
```ts
import { apiFetch, mapSubasta, mapPage, type BackendSubasta, type PagedResponse } from './api';
```
Línea 2 AFTER:
```ts
import { apiFetch, mapSubasta, mapPage, DEFAULT_PAGE_SIZE, type BackendSubasta, type PagedResponse } from './api';
```

Línea 5 BEFORE:
```ts
const DEFAULT_PAGE_SIZE = 10;
```
Línea 5 AFTER: (eliminar la línea por completo — ahora viene de `./api`).

- [ ] **Step 2: Type-check + test del servicio**

Run: `cd frontend && npx tsc -b && npx vitest run src/services/auctionService.test.ts`
Expected: type-check sin errores (sin redeclaración / import sin usar) y el test verde (`size=10` sigue por el default).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/auctionService.ts
git commit -m "refactor(paginado): unificar DEFAULT_PAGE_SIZE en api.ts (quitar duplicado de auctionService)"
```

---

### Task 7: Threading de `size` en los hooks de subastas

**Files:**
- Modify: `frontend/src/hooks/useSubastas.ts:25-32,34-42,44-52`

**Interfaces:**
- Produces (firmas nuevas, default 10):
  - `useSubastasActivas(page = 0, size = DEFAULT_PAGE_SIZE, estado = 'EN_CURSO')`
  - `useMisSubastas(userId, page = 0, size = DEFAULT_PAGE_SIZE)`
  - `useSubastasParticipando(userId, page = 0, size = DEFAULT_PAGE_SIZE)`
  - Cada `queryKey` incluye `size`; cada request manda `size`.

- [ ] **Step 1: Editar los tres hooks**

`useSubastasActivas` (líneas 25-32) BEFORE:
```ts
export function useSubastasActivas(page = 0, estado = 'EN_CURSO') {
  return useQuery({
    queryKey: ['subastas', 'activas', estado, page],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get('/api/subastas', { params: { estado, page, size: DEFAULT_PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  });
}
```
AFTER:
```ts
export function useSubastasActivas(page = 0, size = DEFAULT_PAGE_SIZE, estado = 'EN_CURSO') {
  return useQuery({
    queryKey: ['subastas', 'activas', estado, page, size],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get('/api/subastas', { params: { estado, page, size } })).data,
    placeholderData: keepPreviousData,
  });
}
```

`useMisSubastas` (líneas 34-42) BEFORE:
```ts
export function useMisSubastas(userId: string | undefined, page = 0) {
  return useQuery({
    queryKey: ['subastas', 'mias', userId, page],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get(`/api/subastas/usuario/${userId}`, { params: { page, size: DEFAULT_PAGE_SIZE } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}
```
AFTER:
```ts
export function useMisSubastas(userId: string | undefined, page = 0, size = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: ['subastas', 'mias', userId, page, size],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get(`/api/subastas/usuario/${userId}`, { params: { page, size } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}
```

`useSubastasParticipando` (líneas 44-52) BEFORE:
```ts
export function useSubastasParticipando(userId: string | undefined, page = 0) {
  return useQuery({
    queryKey: ['subastas', 'participando', userId, page],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get(`/api/subastas/participando/${userId}`, { params: { page, size: DEFAULT_PAGE_SIZE } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}
```
AFTER:
```ts
export function useSubastasParticipando(userId: string | undefined, page = 0, size = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: ['subastas', 'participando', userId, page, size],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get(`/api/subastas/participando/${userId}`, { params: { page, size } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc -b`
Expected: sin errores (los consumidores actuales pasan sólo `page`, así `size` cae al default 10).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSubastas.ts
git commit -m "feat(paginado): aceptar size en los hooks de subastas (key + params)"
```

---

### Task 8: Integrar `usePageSize` en `useFiltrosServidor` (Colección)

**Files:**
- Modify: `frontend/src/pages/coleccion/components/useFiltrosServidor.ts`

**Interfaces:**
- Consumes: `usePageSize` de `../../../hooks/usePageSize`.
- Produces: el hook devuelve además `pageSize: number; setPageSize: (n: number) => void; options: number[]`, y `params` incluye `size: pageSize`. `setPageSize` resetea la página a 0 (igual que los setters de filtros). Lo consumen Todas/Repetidas/Faltantes.

- [ ] **Step 1: Editar la interface y el hook**

En `frontend/src/pages/coleccion/components/useFiltrosServidor.ts`:

(a) Import — agregar después de los imports existentes (línea 4):
```ts
import { usePageSize } from '../../../hooks/usePageSize';
```

(b) Interface `FiltrosServidor` (líneas 6-13) — agregar tres campos:
```ts
export interface FiltrosServidor {
  /** Estado compatible con `<FiltrosFigurita>` (setters envueltos para resetear la página). */
  filtros: FiltrosFiguritaState;
  page: number;
  setPage: (p: number) => void;
  /** Filtros listos para los hooks paginados (search debounced, vacíos → undefined). */
  params: FiltrosColeccion;
  pageSize: number;
  setPageSize: (n: number) => void;
  options: number[];
}
```

(c) Cuerpo del hook — después de `const [page, setPage] = useState(0);` (línea 22), agregar:
```ts
  const { pageSize, setPageSize: setPageSizeRaw, options } = usePageSize();
  const setPageSize = (n: number) => { setPageSizeRaw(n); setPage(0); };
```

(d) Objeto `params` (líneas 37-43) — agregar `size: pageSize`:
```ts
  const params: FiltrosColeccion = {
    page,
    size: pageSize,
    search: debouncedSearch.trim() || undefined,
    seleccion: base.filterSeleccion.trim() || undefined,
    equipo: base.filterEquipo.trim() || undefined,
    categoria: base.filterCategoria.trim() || undefined,
  };
```

(e) Return (línea 45):
```ts
  return { filtros, page, setPage, params, pageSize, setPageSize, options };
```

Nota: NO hace falta tocar `useFiguritas.ts`. Sus `queryFn` ya hacen `{ size: DEFAULT_PAGE_SIZE, ...p }`, así que `p.size` (ahora presente) sobreescribe el default; y el `queryKey` ya incluye el objeto `p` completo, por lo que varía con `size` automáticamente. `FiltrosColeccion` ya declara `size?: number`.

- [ ] **Step 2: Type-check + test de Colección existente**

Run: `cd frontend && npx tsc -b && npx vitest run src/pages/coleccion/TodasPage.test.tsx`
Expected: type-check OK; TodasPage.test verde (sólo asierta `page`, no `size`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/coleccion/components/useFiltrosServidor.ts
git commit -m "feat(paginado): useFiltrosServidor expone pageSize/options e inyecta size en params"
```

---

### Task 9: Colección / Todas

**Files:**
- Modify: `frontend/src/pages/coleccion/TodasPage.tsx`

**Interfaces:**
- Consumes: `pageSize/setPageSize/options` de `useFiltrosServidor` (Task 8); `ListToolbar`, `PageSizeSelector`.

- [ ] **Step 1: Imports**

En `frontend/src/pages/coleccion/TodasPage.tsx`, después de la línea 11 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
```

- [ ] **Step 2: Destructurar los nuevos campos del hook**

Línea 20 BEFORE:
```tsx
  const { filtros, page, setPage, params } = useFiltrosServidor();
```
AFTER:
```tsx
  const { filtros, page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
```

- [ ] **Step 3: Insertar la toolbar arriba de la grilla**

Líneas 56-58 BEFORE:
```tsx
      ) : (
        <>
          <GrillaFiguritas isEmpty={figuritas.length === 0} emptyMessage="No tienes figuritas aún">
```
AFTER:
```tsx
      ) : (
        <>
          <ListToolbar total={data?.totalElements ?? 0}>
            <PageSizeSelector value={pageSize} options={options} onChange={(n) => setPageSize(n)} />
          </ListToolbar>
          <GrillaFiguritas isEmpty={figuritas.length === 0} emptyMessage="No tienes figuritas aún">
```
(El `<Paginador>` de la línea 79 no cambia — ya renderiza siempre tras la grilla, y muestra el `1` por el cambio de Task 5. `setPageSize` ya resetea la página.)

- [ ] **Step 4: Type-check, lint y test**

Run: `cd frontend && npx tsc -b && npm run lint && npx vitest run src/pages/coleccion/TodasPage.test.tsx`
Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/coleccion/TodasPage.tsx
git commit -m "feat(paginado): selector + contador en Colección/Todas"
```

---

### Task 10: Colección / Repetidas

**Files:**
- Modify: `frontend/src/pages/coleccion/RepetidasPage.tsx`

- [ ] **Step 1: Imports**

Después de la línea 13 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
```

- [ ] **Step 2: Destructurar los nuevos campos**

Línea 23 BEFORE:
```tsx
  const { filtros, page, setPage, params } = useFiltrosServidor();
```
AFTER:
```tsx
  const { filtros, page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
```

- [ ] **Step 3: Insertar la toolbar arriba de la grilla**

Líneas 61-63 BEFORE:
```tsx
      ) : (
        <>
          <GrillaFiguritas isEmpty={repetidas.length === 0} emptyMessage="No tenés figuritas repetidas">
```
AFTER:
```tsx
      ) : (
        <>
          <ListToolbar total={data?.totalElements ?? 0}>
            <PageSizeSelector value={pageSize} options={options} onChange={(n) => setPageSize(n)} />
          </ListToolbar>
          <GrillaFiguritas isEmpty={repetidas.length === 0} emptyMessage="No tenés figuritas repetidas">
```

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/coleccion/RepetidasPage.tsx
git commit -m "feat(paginado): selector + contador en Colección/Repetidas"
```

---

### Task 11: Colección / Faltantes

**Files:**
- Modify: `frontend/src/pages/coleccion/FaltantesPage.tsx`

- [ ] **Step 1: Imports**

Después de la línea 10 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
```

- [ ] **Step 2: Destructurar los nuevos campos**

Línea 16 BEFORE:
```tsx
  const { filtros, page, setPage, params } = useFiltrosServidor();
```
AFTER:
```tsx
  const { filtros, page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
```

- [ ] **Step 3: Insertar la toolbar arriba de la grilla**

Líneas 27-29 BEFORE:
```tsx
      ) : (
        <>
          <GrillaFiguritas isEmpty={faltantes.length === 0} emptyMessage="¡Tienes todas las figuritas!">
```
AFTER:
```tsx
      ) : (
        <>
          <ListToolbar total={data?.totalElements ?? 0}>
            <PageSizeSelector value={pageSize} options={options} onChange={(n) => setPageSize(n)} />
          </ListToolbar>
          <GrillaFiguritas isEmpty={faltantes.length === 0} emptyMessage="¡Tienes todas las figuritas!">
```

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/coleccion/FaltantesPage.tsx
git commit -m "feat(paginado): selector + contador en Colección/Faltantes"
```

---

### Task 12: Buscar

**Files:**
- Modify: `frontend/src/pages/buscar/BuscarPage.tsx`
- Test (verificar, no editar): `frontend/src/pages/buscar/BuscarPage.test.tsx`

- [ ] **Step 1: Imports**

Línea 4 BEFORE:
```tsx
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../../services/api';
```
AFTER (quitar `DEFAULT_PAGE_SIZE` — quedará sin uso):
```tsx
import api, { type PagedResponse } from '../../services/api';
```

Después de la línea 6 (`import Paginador ...`), agregar:
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: Estado de page-size y threading en el query**

Líneas 40-46 BEFORE:
```tsx
  const { data, isLoading } = useQuery({
    queryKey: ['publicaciones', 'disponibles', user?.id, page],
    queryFn: async (): Promise<PagedResponse<PublicacionResponseDTO>> =>
      (await api.get(`/api/publicaciones/disponibles/${user!.id}`, { params: { page, size: DEFAULT_PAGE_SIZE } })).data,
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
  });
```
AFTER:
```tsx
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading } = useQuery({
    queryKey: ['publicaciones', 'disponibles', user?.id, page, pageSize],
    queryFn: async (): Promise<PagedResponse<PublicacionResponseDTO>> =>
      (await api.get(`/api/publicaciones/disponibles/${user!.id}`, { params: { page, size: pageSize } })).data,
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
  });
```

- [ ] **Step 3: Toolbar arriba del bloque de resultados + Paginador siempre visible**

Reemplazar el bloque de resultados (líneas 128-157). BEFORE:
```tsx
      {isLoading ? (
        <p className="text-text">Cargando figuritas publicadas...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">No se encontraron figuritas disponibles.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((pub) => (
              ...
            ))}
          </div>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
```
AFTER (insertar `<ListToolbar>` antes del ternario y sacar `<Paginador>` afuera para que se vea también en vacío; **no tocar el contenido del `.map`**):
```tsx
      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
      {isLoading ? (
        <p className="text-text">Cargando figuritas publicadas...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">No se encontraron figuritas disponibles.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((pub) => (
            ...
          ))}
        </div>
      )}
      {!isLoading && (
        <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      )}
```

- [ ] **Step 4: Type-check, lint y test (debe seguir verde)**

Run: `cd frontend && npx tsc -b && npm run lint && npx vitest run src/pages/buscar/BuscarPage.test.tsx`
Expected: verde. El test asierta `{ params: { page, size: 10 } }`; `pageSize` default 10 lo mantiene. Sigue encontrando "Página siguiente" (Paginador presente cuando `totalPages=3`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/buscar/BuscarPage.tsx
git commit -m "feat(paginado): selector + contador en Buscar"
```

---

### Task 13: Subastas / Activas

**Files:**
- Modify: `frontend/src/pages/subastas/ActivasPage.tsx`

**Interfaces:**
- Consumes: `useSubastasActivas(page, size)` (Task 7).

- [ ] **Step 1: Imports**

Después de la línea 13 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: page-size state + threading**

Líneas 20-22 BEFORE:
```tsx
  const [page, setPage] = useState(0);
  // El servidor ya filtra por estado=EN_CURSO; no se filtra en JS.
  const { data, isLoading, isError, refetch } = useSubastasActivas(page);
```
AFTER:
```tsx
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  // El servidor ya filtra por estado=EN_CURSO; no se filtra en JS.
  const { data, isLoading, isError, refetch } = useSubastasActivas(page, pageSize);
```

- [ ] **Step 3: Insertar la toolbar bajo el encabezado**

Insertar entre la línea 75 (cierre `</div>` del encabezado) y la línea 77 (ternario `{auctions.length === 0 ...}`):
```tsx
      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
```
(El `<Paginador>` de la línea 100 ya está fuera del ternario y se ve en vacío; con Task 5 muestra el `1`. No se toca.)

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/subastas/ActivasPage.tsx
git commit -m "feat(paginado): selector + contador en Subastas/Activas"
```

---

### Task 14: Subastas / Mías

**Files:**
- Modify: `frontend/src/pages/subastas/MiasPage.tsx`

**Interfaces:**
- Consumes: `useMisSubastas(userId, page, size)` (Task 7).

- [ ] **Step 1: Imports**

Después de la línea 8 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: page-size state + threading**

Líneas 18-19 BEFORE:
```tsx
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useMisSubastas(user?.id, page);
```
AFTER:
```tsx
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading, isError, refetch } = useMisSubastas(user?.id, page, pageSize);
```

- [ ] **Step 3: Quitar el early-return de vacío para que toolbar + paginador se vean siempre**

Reemplazar el bloque de las líneas 30-45 (early-return) — eliminarlo por completo:
BEFORE:
```tsx
  if (auctions.length === 0) {
    return (
      <div className="page-enter">
        <EmptyState
          title="Todavía no creaste subastas"
          subtitle='Publicá una subasta desde la pestaña "+ Nueva".'
          accentColor={RED}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="1.8" className="w-6 h-6">
              <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
            </svg>
          }
        />
      </div>
    );
  }
```
AFTER: (bloque eliminado — el vacío se maneja dentro del return principal en el Step 4).

- [ ] **Step 4: Toolbar bajo el encabezado + EmptyState/grilla condicional + Paginador siempre**

(a) Insertar la toolbar entre la línea 86 (cierre `</div>` de los pills de estado) y la línea 88 (`<div className="grid ...">`):
```tsx
      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
```

(b) Reemplazar la grilla (líneas 88-96) por un ternario que muestre el `EmptyState` cuando no hay subastas:
BEFORE:
```tsx
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {auctions.map(auction => (
          <AuctionCard
            key={auction.id}
            auction={auction}
            onViewDetail={setSelected}
          />
        ))}
      </div>
```
AFTER:
```tsx
      {auctions.length === 0 ? (
        <EmptyState
          title="Todavía no creaste subastas"
          subtitle='Publicá una subasta desde la pestaña "+ Nueva".'
          accentColor={RED}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="1.8" className="w-6 h-6">
              <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {auctions.map(auction => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              onViewDetail={setSelected}
            />
          ))}
        </div>
      )}
```

(c) Paginador (línea 98) — quitar el guard `{data && ...}` para que muestre el `1` en vacío:
BEFORE:
```tsx
      {data && <Paginador page={page} totalPages={data.totalPages} onChange={setPage} />}
```
AFTER:
```tsx
      <Paginador page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
```

Nota: `EmptyState` ya está importado (línea 7) y ahora se usa dentro del return, así que sigue referenciado.

- [ ] **Step 5: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores (sin import sin usar).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/subastas/MiasPage.tsx
git commit -m "feat(paginado): selector + contador en Subastas/Mías (toolbar y paginador en vacío)"
```

---

### Task 15: Subastas / Participando

**Files:**
- Modify: `frontend/src/pages/subastas/ParticipandoPage.tsx`

**Interfaces:**
- Consumes: `useSubastasParticipando(userId, page, size)` (Task 7).

- [ ] **Step 1: Imports**

Después de la línea 13 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: page-size state + threading**

Líneas 20-21 BEFORE:
```tsx
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useSubastasParticipando(user?.id, page);
```
AFTER:
```tsx
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading, isError, refetch } = useSubastasParticipando(user?.id, page, pageSize);
```

- [ ] **Step 3: Quitar el early-return de vacío**

Eliminar el bloque de las líneas 66-79:
BEFORE:
```tsx
  if (auctions.length === 0) {
    return (
      <EmptyState
        title="No estás participando en ninguna subasta"
        subtitle="Hacé una oferta en una subasta activa para verla acá."
        accentColor={BLUE}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
            <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
          </svg>
        }
      />
    );
  }
```
AFTER: (bloque eliminado — el vacío se maneja en el return principal).

- [ ] **Step 4: Toolbar como primer hijo + EmptyState en el cuerpo + Paginador siempre**

(a) Insertar la toolbar como primer hijo del root (justo después de `<div className="page-enter flex flex-col gap-8">`, línea 82):
```tsx
    <div className="page-enter flex flex-col gap-8">
      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
      {auctions.length === 0 && (
        <EmptyState
          title="No estás participando en ninguna subasta"
          subtitle="Hacé una oferta en una subasta activa para verla acá."
          accentColor={BLUE}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
              <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
            </svg>
          }
        />
      )}
```
(Las secciones `{active.length > 0 && ...}` y `{finished.length > 0 && ...}` quedan igual; con 0 resultados ninguna renderiza y se ve el `EmptyState`.)

(b) Paginador (línea 128) — quitar el guard `{data && ...}`:
BEFORE:
```tsx
      {data && <Paginador page={page} totalPages={data.totalPages} onChange={setPage} />}
```
AFTER:
```tsx
      <Paginador page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
```

Nota: `EmptyState` (import línea 12) sigue usándose.

- [ ] **Step 5: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/subastas/ParticipandoPage.tsx
git commit -m "feat(paginado): selector + contador en Subastas/Participando (toolbar y paginador en vacío)"
```

---

### Task 16: Propuestas / Recibidas

**Files:**
- Modify: `frontend/src/pages/propuestas/RecibidasPage.tsx`

**Interfaces:**
- Consumes: `usePropuestasRecibidas(userId, page, size)` — la firma YA acepta `size` (no se toca el hook).

- [ ] **Step 1: Imports**

Después de la línea 4 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: page-size state + threading**

Líneas 8-9 BEFORE:
```tsx
  const [page, setPage] = useState(0);
  const { data, isLoading } = usePropuestasRecibidas(user?.id, page);
```
AFTER:
```tsx
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading } = usePropuestasRecibidas(user?.id, page, pageSize);
```

- [ ] **Step 3: Insertar la toolbar arriba del ternario lista/vacío**

Insertar entre el bloque de error (cierra en línea 58) y el ternario (línea 60). BEFORE:
```tsx
      {responder.isError && (
        <p className="mb-4 text-sm font-semibold" style={{ color: '#D82D31' }}>
          No se pudo procesar la propuesta. Intentá de nuevo.
        </p>
      )}

      {propuestasRecibidas.length === 0 ? (
```
AFTER:
```tsx
      {responder.isError && (
        <p className="mb-4 text-sm font-semibold" style={{ color: '#D82D31' }}>
          No se pudo procesar la propuesta. Intentá de nuevo.
        </p>
      )}

      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>

      {propuestasRecibidas.length === 0 ? (
```
(El `<Paginador>` de la línea 123 ya está fuera del ternario; con Task 5 muestra el `1` en vacío. No se toca.)

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/propuestas/RecibidasPage.tsx
git commit -m "feat(paginado): selector + contador en Propuestas/Recibidas"
```

---

### Task 17: Propuestas / Enviadas

**Files:**
- Modify: `frontend/src/pages/propuestas/EnviadasPage.tsx`

**Interfaces:**
- Consumes: `usePropuestasEnviadas(userId, page, size)` — la firma YA acepta `size` (no se toca el hook).

- [ ] **Step 1: Imports**

Después de la línea 4 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: page-size state + threading**

Líneas 8-9 BEFORE:
```tsx
  const [page, setPage] = useState(0);
  const { data, isLoading } = usePropuestasEnviadas(user?.id, page);
```
AFTER:
```tsx
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading } = usePropuestasEnviadas(user?.id, page, pageSize);
```

- [ ] **Step 3: Insertar la toolbar entre el `<h2>` y el ternario**

Líneas 48-50 BEFORE:
```tsx
      <h2 className="text-xl font-semibold text-text mb-6">Propuestas · Enviadas</h2>

      {propuestasEnviadas.length === 0 ? (
```
AFTER:
```tsx
      <h2 className="text-xl font-semibold text-text mb-6">Propuestas · Enviadas</h2>

      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>

      {propuestasEnviadas.length === 0 ? (
```
(El `<Paginador>` de la línea 95 ya está fuera del ternario; muestra el `1` en vacío con Task 5.)

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/propuestas/EnviadasPage.tsx
git commit -m "feat(paginado): selector + contador en Propuestas/Enviadas"
```

---

### Task 18: Intercambios

**Files:**
- Modify: `frontend/src/pages/intercambios/IntercambiosPage.tsx`
- Test (verificar, no editar): `frontend/src/pages/intercambios/IntercambiosPage.test.tsx`

- [ ] **Step 1: Imports**

Línea 3 BEFORE:
```tsx
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../../services/api';
```
AFTER (quitar `DEFAULT_PAGE_SIZE` — quedará sin uso):
```tsx
import api, { type PagedResponse } from '../../services/api';
```

Después de la línea 4 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: page-size state + threading en el fetch (useEffect)**

Después de la línea 26 (`const [page, setPage] = useState(0);`), agregar:
```tsx
  const { pageSize, setPageSize, options } = usePageSize();
```

Línea 41 BEFORE:
```tsx
      params: { page, size: DEFAULT_PAGE_SIZE },
```
AFTER:
```tsx
      params: { page, size: pageSize },
```

Línea 50 (deps del useEffect) BEFORE:
```tsx
  }, [user?.id, user?.username, page]);
```
AFTER:
```tsx
  }, [user?.id, user?.username, page, pageSize]);
```

- [ ] **Step 3: Toolbar arriba del ternario + Paginador siempre visible**

(a) Insertar la toolbar entre el encabezado (cierra en línea 98 `</div>`) y el ternario (línea 100):
```tsx
      <ListToolbar total={totalElements}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
```

(b) Sacar el `<Paginador>` del else-branch (línea 206) y colocarlo tras el ternario. Quitar la línea 206 dentro del `else`:
BEFORE (final del else, líneas ~205-208):
```tsx
          })}
          <Paginador page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
```
AFTER:
```tsx
          })}
        </div>
      )}
      <Paginador page={page} totalPages={totalPages} onChange={setPage} />
    </div>
```

- [ ] **Step 4: Type-check, lint y test (debe seguir verde)**

Run: `cd frontend && npx tsc -b && npm run lint && npx vitest run src/pages/intercambios/IntercambiosPage.test.tsx`
Expected: verde. El test asierta `params: { page, size: 10 }` (default 10) y `getByText('25')` (el badge del encabezado, exacto "25", distinto de "25 resultados" de la toolbar).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/intercambios/IntercambiosPage.tsx
git commit -m "feat(paginado): selector + contador en Intercambios (paginador en vacío)"
```

---

### Task 19: Notificaciones

**Files:**
- Modify: `frontend/src/pages/notificaciones/NotificacionesPage.tsx`

**Interfaces:**
- Consumes: `useNotificaciones(userId, page, size)` — la firma YA acepta `size` (no se toca el hook).

- [ ] **Step 1: Imports**

Después de la línea 5 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

- [ ] **Step 2: page-size state + threading**

Líneas 10-11 BEFORE:
```tsx
  const [page, setPage] = useState(0);
  const { data, isLoading } = useNotificaciones(user?.id, page);
```
AFTER:
```tsx
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading } = useNotificaciones(user?.id, page, pageSize);
```

- [ ] **Step 3: Insertar la toolbar entre el encabezado y el ternario**

Insertar entre la línea 80 (cierre `</div>` del encabezado) y la línea 82 (`{totalElements === 0 ? ...}`):
```tsx
      <ListToolbar total={totalElements}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
```
(El `<Paginador>` de la línea 127 ya está fuera del ternario; con Task 5 muestra el `1` en vacío.)

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/notificaciones/NotificacionesPage.tsx
git commit -m "feat(paginado): selector + contador en Notificaciones"
```

---

### Task 20: Sugerencias (+ test)

**Files:**
- Modify: `frontend/src/pages/sugerencias/SugerenciasPage.tsx`
- Modify: `frontend/src/pages/sugerencias/SugerenciasPage.test.tsx:51,53`

**Interfaces:**
- Consumes: `useSugerencias(username, page, size)` — la firma YA acepta `size` (no se toca el hook). El test asierta la aridad de la llamada, así que se actualiza.

- [ ] **Step 1: Actualizar el test a la nueva aridad (falla primero)**

En `frontend/src/pages/sugerencias/SugerenciasPage.test.tsx`:

Línea 51 BEFORE: `expect(useSugerencias).toHaveBeenLastCalledWith('lio', 0);`
Línea 51 AFTER: `expect(useSugerencias).toHaveBeenLastCalledWith('lio', 0, 10);`

Línea 53 BEFORE: `expect(useSugerencias).toHaveBeenLastCalledWith('lio', 1);`
Línea 53 AFTER: `expect(useSugerencias).toHaveBeenLastCalledWith('lio', 1, 10);`

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/sugerencias/SugerenciasPage.test.tsx`
Expected: FAIL — la página todavía llama `useSugerencias('lio', page)` con 2 args.

- [ ] **Step 3: Editar la página**

(a) Imports — después de la línea 8 (`import Paginador ...`):
```tsx
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';
```

(b) page-size state + threading. Líneas 18-19 BEFORE:
```tsx
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useSugerencias(user?.username, page);
```
AFTER:
```tsx
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading, isError, refetch } = useSugerencias(user?.username, page, pageSize);
```

(c) Toolbar arriba del ternario + Paginador fuera del else. Reemplazar las líneas 46-93. BEFORE:
```tsx
      <h1 className="text-2xl font-bold text-text mb-1">Sugerencias de Intercambio</h1>
      <p className="text-sm text-muted mb-6">Intercambios posibles con otros usuarios. Se actualizan a diario.</p>

      {sugerencias.length === 0 ? (
        <p className="text-muted">No tenés sugerencias por ahora.</p>
      ) : (
        <>
        <div className="flex flex-col gap-6">
          {sugerencias.map((s) => (
            ...
          ))}
        </div>
        <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
```
AFTER (insertar `<ListToolbar>` antes del ternario, quitar el fragmento `<>...</>` y sacar el `<Paginador>` afuera; **no tocar el contenido del `.map`**):
```tsx
      <h1 className="text-2xl font-bold text-text mb-1">Sugerencias de Intercambio</h1>
      <p className="text-sm text-muted mb-6">Intercambios posibles con otros usuarios. Se actualizan a diario.</p>

      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>

      {sugerencias.length === 0 ? (
        <p className="text-muted">No tenés sugerencias por ahora.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {sugerencias.map((s) => (
            ...
          ))}
        </div>
      )}
      <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/sugerencias/SugerenciasPage.test.tsx`
Expected: PASS. El click en el botón "2" sigue funcionando (Paginador presente con `totalPages>1`).

- [ ] **Step 5: Type-check + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/sugerencias/SugerenciasPage.tsx frontend/src/pages/sugerencias/SugerenciasPage.test.tsx
git commit -m "feat(paginado): selector + contador en Sugerencias (+ ajuste de aridad en el test)"
```

---

### Task 21: Verificación integral

**Files:** ninguno (sólo verificación).

- [ ] **Step 1: Build de tipos + lint completo**

Run: `cd frontend && npm run build && npm run lint`
Expected: build sin errores de TS; lint limpio (sin imports sin usar — sobre todo `DEFAULT_PAGE_SIZE` en Buscar/Intercambios).

- [ ] **Step 2: Suite de tests completa**

Run: `cd frontend && npx vitest run`
Expected: TODO verde. En particular: `usePageSize`, `PageSizeSelector`, `ListToolbar`, `Paginador` (6), `BuscarPage`, `TodasPage`, `IntercambiosPage`, `SugerenciasPage`, `usePropuestas`, `useNotificaciones`, `auctionService`.

- [ ] **Step 3: Smoke manual (opcional pero recomendado)**

Run: `cd frontend && npm run dev` y verificar en el navegador, en al menos una página de cada grupo (Colección, Subastas, Propuestas, Intercambios, Notificaciones, Sugerencias, Buscar):
- El selector "Mostrar" aparece arriba a la derecha con 10/20/50/100.
- Cambiarlo recarga la lista, vuelve a página 1, y la elección persiste al navegar a otra página (mismo valor).
- Recargar el navegador mantiene la elección (localStorage).
- El contador "{n} resultados" coincide con `totalElements`.
- Con 1 sola página o 0 resultados, abajo se ve el `1`.

- [ ] **Step 4: Commit (si hubo ajustes del smoke)**

```bash
git add -A
git commit -m "test(paginado): verificación integral del selector de cantidad por página"
```

---

## Notas de revisión (para confirmar antes/durante la ejecución)

1. **Admin/Gift excluida** del selector (typeahead, no lista). Si igual lo querés ahí, es otra tarea aparte (pasar `pageSize` a `useBaseSearch`, sin `ListToolbar` ni paginador-en-vacío).
2. **Contador duplicado en 3 páginas:** Activas, Mías e Intercambios ya tienen un badge de total en su encabezado de sección. El plan agrega además el contador de `ListToolbar` ("{n} resultados") para que sea consistente con las otras 9. Si preferís evitar el número repetido, se pueden quitar esos 3 badges (en Intercambios habría que actualizar `getByText('25')` → `getByText('25 resultados')` en su test).
