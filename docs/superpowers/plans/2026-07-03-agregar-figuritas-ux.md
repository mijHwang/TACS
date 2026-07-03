# Rediseño UX/UI "Agregar figuritas" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer el modal de "Agregar figurita" en Mis faltantes y Mis repetidas: sin `prompt`/`alert`, con stepper y aviso de cascada, feedback por toast, estado por figurita ("Tenés N" / "En tu wishlist") y el maestro completo (~826).

**Architecture:** Backend expone el maestro-menos-poseídas vía un parámetro opcional `excludeOwnedBy` en `GET /api/figuritas-base/search` (reusa `findFaltantesPaged`). Frontend parte el modal en piezas (`AgregarFiguritaModal` contenedor + `CatalogoGrid` + `CatalogoCard` + `CantidadConfigurator`), suma hooks (`useMaestro`/`useMisCantidades`/`useWishlistBaseIds`) y un sistema de toasts liviano.

**Tech Stack:** Backend Java 21 / Spring Boot / Mongo aggregation / JUnit + Mockito. Frontend React 19 / TS / react-query / Axios / vitest + RTL.

## Global Constraints

- **Sin `window.prompt` / `window.alert`** en el flujo del modal de agregar. (El `askQuantity` de "Publicar Intercambio" queda intacto — es otro flujo.)
- **Colores de acento siempre inline** (`style={}`), nunca utilidades Tailwind: `RED = '#D82D31'`, `BLUE = '#03BAE9'`, `GREEN = '#05B15A'`. Fondos con opacidad: sufijo hex (`${BLUE}30`).
- Copy en español, sentence case.
- Nombre exacto del parámetro backend: **`excludeOwnedBy`** (userId a excluir).
- Tests colocados junto al archivo. Frontend: vitest + RTL (`import '@testing-library/jest-dom'`). Backend: JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`), sin Mongo embebido (las agregaciones se validan en vivo).
- **No commitear sin pedido explícito del usuario** (regla del proyecto). Los pasos "Commit" quedan como referencia; ejecutarlos sólo si el usuario lo pide.

## File Structure

**Backend (modificar):**
- `service/FiguritaService.java` — nuevo método `buscarMaestroPaginado(search, excludeOwnedBy, pageable)`.
- `repository/FiguritaBaseRepositoryCustomImpl.java` — unificar el predicado de búsqueda (jugador/selección/número) y reusarlo en `findFaltantesPaged`.
- `controller/FiguritaBaseController.java` — nuevo `@RequestParam excludeOwnedBy` en `/search`.
- `test/.../service/FiguritaServicePaginadoTest.java` — cobertura del branch nuevo.

**Frontend (crear salvo aclaración):**
- `components/toast/ToastProvider.tsx`, `components/toast/useToast.ts`, `components/toast/toast-types.ts`
- `App.tsx` — envolver con `ToastProvider` (modificar).
- `hooks/useMaestro.ts`, `hooks/useMisCantidades.ts`, `hooks/useWishlistBaseIds.ts`
- `pages/coleccion/components/CatalogoCard.tsx`, `CatalogoGrid.tsx`, `CantidadConfigurator.tsx`
- `pages/coleccion/components/AgregarFiguritaModal.tsx` — reescritura (modificar).
- Tests colocados para cada uno.

---

### Task 1: Backend — método de servicio `buscarMaestroPaginado`

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/FiguritaService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/FiguritaServicePaginadoTest.java`

**Interfaces:**
- Consumes: `FiguritaBaseRepository.searchPaged(String, Pageable)`, `FiguritaBaseRepository.findFaltantesPaged(CatalogoFiltro, Pageable)` (ya existen).
- Produces: `FiguritaService.buscarMaestroPaginado(String search, String excludeOwnedBy, Pageable) : Page<FiguritaBaseDTO>`.

- [ ] **Step 1: Escribir el test que falla** — agregar al final de `FiguritaServicePaginadoTest` (antes del `}` de cierre de la clase):

```java
    @Test
    public void maestroSinExcludeUsaSearchPaged() {
        Pageable pageable = PageRequest.of(0, 10);
        when(figuritaBaseRepository.searchPaged(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleBase()), pageable, 1));

        Page<FiguritaBaseDTO> res = service.buscarMaestroPaginado("messi", null, pageable);

        assertEquals(1, res.getTotalElements());
        ArgumentCaptor<String> sc = ArgumentCaptor.forClass(String.class);
        verify(figuritaBaseRepository).searchPaged(sc.capture(), eq(pageable));
        assertEquals("messi", sc.getValue());
    }

    @Test
    public void maestroConExcludeUsaFaltantesPagedConSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        when(figuritaBaseRepository.findFaltantesPaged(any(CatalogoFiltro.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleBase()), pageable, 1));

        Page<FiguritaBaseDTO> res = service.buscarMaestroPaginado("mes", "owner-1", pageable);

        assertEquals(1, res.getTotalElements());
        ArgumentCaptor<CatalogoFiltro> fc = ArgumentCaptor.forClass(CatalogoFiltro.class);
        verify(figuritaBaseRepository).findFaltantesPaged(fc.capture(), eq(pageable));
        assertEquals("owner-1", fc.getValue().usuarioId());
        assertEquals("mes", fc.getValue().search());
    }
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd backend; ./mvnw test -Dtest=FiguritaServicePaginadoTest`
Expected: FAIL — `buscarMaestroPaginado` no existe (no compila).

- [ ] **Step 3: Implementar el método** — en `FiguritaService.java`, después de `buscarBasesPaginado` (~línea 191):

```java
    /**
     * Maestro paginado para el modal de "agregar figurita".
     * Sin {@code excludeOwnedBy}: maestro completo (todas las bases). Con {@code excludeOwnedBy}:
     * maestro MENOS las bases que ese usuario ya posee (reusa {@code findFaltantesPaged}).
     * En ambos casos la búsqueda matchea jugador/selección/número.
     */
    public Page<FiguritaBaseDTO> buscarMaestroPaginado(String search, String excludeOwnedBy, Pageable pageable) {
        if (excludeOwnedBy == null || excludeOwnedBy.isBlank()) {
            return figuritaBaseRepository.searchPaged(search, pageable);
        }
        CatalogoFiltro filtro = new CatalogoFiltro(excludeOwnedBy, null, null, search, null, null, null);
        return figuritaBaseRepository.findFaltantesPaged(filtro, pageable);
    }
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd backend; ./mvnw test -Dtest=FiguritaServicePaginadoTest`
Expected: PASS (todos los tests de la clase, incluidos los 2 nuevos).

- [ ] **Step 5: Commit** (sólo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/service/FiguritaService.java backend/src/test/java/com/grupo3/tp/service/FiguritaServicePaginadoTest.java
git commit -m "feat(coleccion): FiguritaService.buscarMaestroPaginado (maestro completo o menos-poseídas)"
```

---

### Task 2: Backend — unificar búsqueda + exponer `excludeOwnedBy` en el controller

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/repository/FiguritaBaseRepositoryCustomImpl.java`
- Modify: `backend/src/main/java/com/grupo3/tp/controller/FiguritaBaseController.java`

**Interfaces:**
- Consumes: `FiguritaService.buscarMaestroPaginado(...)` (Task 1).
- Produces: `GET /api/figuritas-base/search?search=&page=&size=&excludeOwnedBy=` → `PagedResponse<FiguritaBaseDTO>`.

> La agregación de Mongo no se testea unitariamente (no hay Mongo embebido); se valida en vivo con la app. El branch de servicio ya quedó cubierto en Task 1.

- [ ] **Step 1: Extraer el predicado OR de búsqueda en el repo** — en `FiguritaBaseRepositoryCustomImpl.java`, reemplazar el cuerpo de `searchPaged` para usar un helper y reusarlo en `findFaltantesPaged`. Nuevo helper (agregar como método privado):

```java
    /** OR de búsqueda por jugador / selección / número (compartido por maestro y maestro-menos-poseídas). */
    private static Criteria searchOrCriteria(String search) {
        if (!StringUtils.hasText(search)) return null;
        List<Criteria> or = new ArrayList<>();
        or.add(Criteria.where("jug.nombre").regex(containsIgnoreCase(search)));
        or.add(Criteria.where("sel.nombre").regex(containsIgnoreCase(search)));
        Integer numero = tryParseInt(search);
        if (numero != null) {
            or.add(Criteria.where("numero").is(numero));
        }
        return new Criteria().orOperator(or.toArray(new Criteria[0]));
    }
```

- [ ] **Step 2: Usar el helper en `searchPaged`** — reemplazar su cuerpo:

```java
    @Override
    public Page<FiguritaBaseDTO> searchPaged(String search, Pageable pageable) {
        List<Criteria> filtros = new ArrayList<>();
        Criteria or = searchOrCriteria(search);
        if (or != null) filtros.add(or);
        return aggregate(filtros, pageable);
    }
```

- [ ] **Step 3: Usar el helper en `findFaltantesPaged`** — reemplazar `addNombreFilters(filtros, filtro);` por el OR unificado, de modo que la búsqueda del modo faltantes matchee jugador/selección/número igual que el maestro:

```java
    @Override
    public Page<FiguritaBaseDTO> findFaltantesPaged(CatalogoFiltro filtro, Pageable pageable) {
        List<ObjectId> owned = mongoTemplate.findDistinct(
                Query.query(Criteria.where("owner").is(new ObjectId(filtro.usuarioId()))),
                "figuritaBase", "figuritas", Figurita.class, ObjectId.class);

        List<Criteria> filtros = new ArrayList<>();
        if (!owned.isEmpty()) {
            filtros.add(Criteria.where("_id").nin(owned));
        }
        Criteria or = searchOrCriteria(filtro.search());
        if (or != null) filtros.add(or);
        return aggregate(filtros, pageable);
    }
```

> `addNombreFilters` queda sin usar. Borrarlo para no dejar código muerto (o dejarlo si algún test lo referencia — verificar con una búsqueda; en este repo no lo referencia nadie más).

- [ ] **Step 4: Exponer `excludeOwnedBy` en el controller** — en `FiguritaBaseController.search`, agregar el param y delegar en el método nuevo:

```java
    @GetMapping("/search")
    public ResponseEntity<PagedResponse<FiguritaBaseDTO>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String excludeOwnedBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(PagedResponse.from(
                figuritaService.buscarMaestroPaginado(search, excludeOwnedBy, pageable)));
    }
```

- [ ] **Step 5: Compilar y correr toda la suite backend**

Run: `cd backend; ./mvnw test`
Expected: BUILD SUCCESS; `FiguritaServicePaginadoTest` verde. (Los ~5 fallos preexistentes de `mongo` local, si aparecen, son los conocidos — no introducidos por este cambio.)

- [ ] **Step 6: Commit** (sólo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/repository/FiguritaBaseRepositoryCustomImpl.java backend/src/main/java/com/grupo3/tp/controller/FiguritaBaseController.java
git commit -m "feat(coleccion): endpoint /figuritas-base/search con excludeOwnedBy + búsqueda unificada"
```

---

### Task 3: Frontend — sistema de toasts

**Files:**
- Create: `frontend/src/components/toast/toast-types.ts`
- Create: `frontend/src/components/toast/ToastProvider.tsx`
- Create: `frontend/src/components/toast/useToast.ts`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/components/toast/ToastProvider.test.tsx`

**Interfaces:**
- Produces:
  - `useToast() : { success(msg: string): void; error(msg: string): void; info(msg: string): void }`
  - `<ToastProvider>{children}</ToastProvider>`

- [ ] **Step 1: Tipos y contexto** — `toast-types.ts`:

```ts
import { createContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
```

- [ ] **Step 2: Escribir el test que falla** — `ToastProvider.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Guardado')}>ok</button>
      <button onClick={() => toast.error('Falló')}>bad</button>
    </>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra un toast de éxito y lo auto-descarta', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('ok'));
    expect(screen.getByText('Guardado')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('Guardado')).toBeNull();
  });

  it('el toast de error usa role="alert"', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('bad'));
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  });
});
```

- [ ] **Step 3: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/components/toast/ToastProvider.test.tsx`
Expected: FAIL — no existe `ToastProvider`/`useToast`.

- [ ] **Step 4: Implementar `useToast.ts`**

```ts
import { useContext } from 'react';
import { ToastContext, type ToastApi } from './toast-types';

/** Acceso al sistema de toasts. Debe usarse dentro de <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
```

- [ ] **Step 5: Implementar `ToastProvider.tsx`**

```tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext, type ToastApi, type ToastKind } from './toast-types';

const GREEN = '#05B15A';
const RED = '#D82D31';
const BLUE = '#03BAE9';
const COLORS: Record<ToastKind, string> = { success: GREEN, error: RED, info: BLUE };
const AUTO_DISMISS_MS = 3500;

interface ToastItem { id: number; kind: ToastKind; message: string; }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => remove(id), AUTO_DISMISS_MS);
  }, [remove]);

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
            className="flex items-start gap-2 rounded-xl bg-surface border px-4 py-3 shadow-lg text-sm text-text animate-in fade-in slide-in-from-bottom-2"
            style={{ borderColor: `${COLORS[t.kind]}40`, borderLeft: `3px solid ${COLORS[t.kind]}` }}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              aria-label="Cerrar aviso"
              className="text-muted hover:text-text leading-none"
            >✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 6: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/components/toast/ToastProvider.test.tsx`
Expected: PASS.

- [ ] **Step 7: Montar el provider en `App.tsx`** — envolver el árbol (dentro de `QueryClientProvider`, alrededor de `ErrorBoundary`):

```tsx
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import router from './router/router';
import queryClient from './lib/queryClient';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/toast/ToastProvider';

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-bg text-primary text-sm tracking-widest">
      Cargando…
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 8: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/components/toast frontend/src/App.tsx
git commit -m "feat(ui): sistema de toasts liviano (ToastProvider/useToast)"
```

---

### Task 4: Frontend — hook `useMaestro`

**Files:**
- Create: `frontend/src/hooks/useMaestro.ts`
- Test: `frontend/src/hooks/useMaestro.test.tsx`

**Interfaces:**
- Produces: `useMaestro({ page, size?, search?, excludeOwnedBy? }) : UseQueryResult<PagedResponse<FiguritaBaseDTO>>`.

- [ ] **Step 1: Escribir el test que falla** — `useMaestro.test.tsx` (basado en `useCatalogoFiguritas.test.tsx`):

```tsx
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PagedResponse } from '../services/api';
import type { FiguritaBaseDTO } from './useFiguritas';
import { useMaestro } from './useMaestro';

const getMock = vi.fn();
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, default: { get: (...a: unknown[]) => getMock(...a) } };
});

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const base = (id: string): FiguritaBaseDTO => ({
  id, numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
});
const page = (content: FiguritaBaseDTO[]): PagedResponse<FiguritaBaseDTO> =>
  ({ content, page: 0, size: 10, totalElements: 1, totalPages: 1, last: true });

describe('useMaestro', () => {
  beforeEach(() => getMock.mockReset());

  it('pega a /api/figuritas-base/search con search+excludeOwnedBy', async () => {
    getMock.mockResolvedValueOnce({ data: page([base('b1')]) });
    const { result } = renderHook(
      () => useMaestro({ page: 0, search: 'mes', excludeOwnedBy: 'u9' }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMock).toHaveBeenCalledWith(
      '/api/figuritas-base/search',
      { params: { size: 10, page: 0, search: 'mes', excludeOwnedBy: 'u9' } },
    );
    expect(result.current.data?.content[0].id).toBe('b1');
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/hooks/useMaestro.test.tsx`
Expected: FAIL — no existe `useMaestro`.

- [ ] **Step 3: Implementar `useMaestro.ts`**

```ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';
import type { FiguritaBaseDTO } from './useFiguritas';

/** Parámetros del maestro paginado para el modal de agregar figurita. */
export interface MaestroParams {
  page: number;
  size?: number;
  search?: string;
  /** Si viene, el backend excluye las bases que ese usuario ya posee (modo faltantes). */
  excludeOwnedBy?: string;
}

/** Maestro de figuritas-base paginado + búsqueda (`GET /api/figuritas-base/search`). */
export function useMaestro(p: MaestroParams) {
  return useQuery({
    queryKey: ['figuritas-base', 'search', p],
    queryFn: async (): Promise<PagedResponse<FiguritaBaseDTO>> =>
      (await api.get('/api/figuritas-base/search', { params: { size: DEFAULT_PAGE_SIZE, ...p } })).data,
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/hooks/useMaestro.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/hooks/useMaestro.ts frontend/src/hooks/useMaestro.test.tsx
git commit -m "feat(coleccion): hook useMaestro (maestro paginado del modal)"
```

---

### Task 5: Frontend — hook `useMisCantidades`

**Files:**
- Create: `frontend/src/hooks/useMisCantidades.ts`
- Test: `frontend/src/hooks/useMisCantidades.test.tsx`

**Interfaces:**
- Produces: `useMisCantidades(username?: string) : UseQueryResult<Map<string, number>>` (baseId → cantidad poseída).

- [ ] **Step 1: Escribir el test que falla** — `useMisCantidades.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMisCantidades } from './useMisCantidades';

const getMock = vi.fn();
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, default: { get: (...a: unknown[]) => getMock(...a) } };
});

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useMisCantidades', () => {
  beforeEach(() => getMock.mockReset());

  it('arma el mapa baseId→count desde la colección', async () => {
    getMock.mockResolvedValueOnce({ data: { content: [
      { figuritaBaseId: 'b1', count: 2 },
      { figuritaBaseId: 'b2', count: 5 },
    ] } });
    const { result } = renderHook(() => useMisCantidades('sofi'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMock).toHaveBeenCalledWith('/api/usuarios/sofi/figuritas', { params: { page: 0, size: 2000 } });
    expect(result.current.data?.get('b1')).toBe(2);
    expect(result.current.data?.get('b2')).toBe(5);
  });

  it('no consulta si no hay username', () => {
    renderHook(() => useMisCantidades(undefined), { wrapper: wrapper() });
    expect(getMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/hooks/useMisCantidades.test.tsx`
Expected: FAIL — no existe `useMisCantidades`.

- [ ] **Step 3: Implementar `useMisCantidades.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { FiguritaResponseDTO } from './useFiguritas';

/** Mapa `figuritaBaseId → cantidad poseída` del usuario (una sola consulta, sin paginar). */
export function useMisCantidades(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', 'cantidades', username],
    enabled: !!username,
    queryFn: async (): Promise<Map<string, number>> => {
      const res = await api.get(`/api/usuarios/${username}/figuritas`, { params: { page: 0, size: 2000 } });
      const content = (res.data.content ?? []) as FiguritaResponseDTO[];
      return new Map(content.map((f) => [f.figuritaBaseId, f.count]));
    },
  });
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/hooks/useMisCantidades.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/hooks/useMisCantidades.ts frontend/src/hooks/useMisCantidades.test.tsx
git commit -m "feat(coleccion): hook useMisCantidades (mapa baseId→cantidad)"
```

---

### Task 6: Frontend — hook `useWishlistBaseIds`

**Files:**
- Create: `frontend/src/hooks/useWishlistBaseIds.ts`
- Test: `frontend/src/hooks/useWishlistBaseIds.test.tsx`

**Interfaces:**
- Produces: `useWishlistBaseIds(username?: string) : UseQueryResult<Set<string>>` (baseIds en la wishlist declarada).

- [ ] **Step 1: Escribir el test que falla** — `useWishlistBaseIds.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWishlistBaseIds } from './useWishlistBaseIds';

const getMock = vi.fn();
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, default: { get: (...a: unknown[]) => getMock(...a) } };
});

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useWishlistBaseIds', () => {
  beforeEach(() => getMock.mockReset());

  it('recorre las páginas y junta los ids en un Set', async () => {
    getMock
      .mockResolvedValueOnce({ data: { content: [{ id: 'b1' }, { id: 'b2' }], last: false } })
      .mockResolvedValueOnce({ data: { content: [{ id: 'b3' }], last: true } });
    const { result } = renderHook(() => useWishlistBaseIds('sofi'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(result.current.data?.has('b1')).toBe(true);
    expect(result.current.data?.has('b3')).toBe(true);
    expect(result.current.data?.size).toBe(3);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/hooks/useWishlistBaseIds.test.tsx`
Expected: FAIL — no existe `useWishlistBaseIds`.

- [ ] **Step 3: Implementar `useWishlistBaseIds.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { FiguritaBaseDTO } from './useFiguritas';

const PAGE = 100;

/** Set de `figuritaBaseId` en la wishlist declarada del usuario (recorre todas las páginas). */
export function useWishlistBaseIds(username: string | undefined) {
  return useQuery({
    queryKey: ['faltantes', 'ids', username],
    enabled: !!username,
    queryFn: async (): Promise<Set<string>> => {
      const ids = new Set<string>();
      let page = 0;
      // El cap del backend es 100 por página → paginamos hasta agotar para no perder ids.
      for (;;) {
        const res = await api.get(`/api/usuarios/${username}/figuritas/faltantes`, { params: { page, size: PAGE } });
        const content = (res.data.content ?? []) as FiguritaBaseDTO[];
        content.forEach((b) => ids.add(b.id));
        if (res.data.last || content.length === 0) break;
        page += 1;
      }
      return ids;
    },
  });
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/hooks/useWishlistBaseIds.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/hooks/useWishlistBaseIds.ts frontend/src/hooks/useWishlistBaseIds.test.tsx
git commit -m "feat(coleccion): hook useWishlistBaseIds (set de la wishlist)"
```

---

### Task 7: Frontend — `CatalogoCard`

**Files:**
- Create: `frontend/src/pages/coleccion/components/CatalogoCard.tsx`
- Test: `frontend/src/pages/coleccion/components/CatalogoCard.test.tsx`

**Interfaces:**
- Consumes: `FiguritaBaseDTO` (de `hooks/useFiguritas`).
- Produces: `<CatalogoCard base mode owned? selected? onSelect? inWishlist? busy? onAdd? onRemove? />`.

- [ ] **Step 1: Escribir el test que falla** — `CatalogoCard.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CatalogoCard from './CatalogoCard';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const base: FiguritaBaseDTO = {
  id: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
};

describe('CatalogoCard', () => {
  it('poseida: muestra "Tenés N" y selecciona al click', () => {
    const onSelect = vi.fn();
    render(<CatalogoCard base={base} mode="poseida" owned={2} onSelect={onSelect} />);
    expect(screen.getByText('Tenés 2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('catalogo-card'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('poseida: muestra "No la tenés" cuando owned=0', () => {
    render(<CatalogoCard base={base} mode="poseida" owned={0} onSelect={() => {}} />);
    expect(screen.getByText('No la tenés')).toBeInTheDocument();
  });

  it('faltante: agregable dispara onAdd', () => {
    const onAdd = vi.fn();
    render(<CatalogoCard base={base} mode="faltante" inWishlist={false} onAdd={onAdd} onRemove={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('faltante: en wishlist dispara onRemove', () => {
    const onRemove = vi.fn();
    render(<CatalogoCard base={base} mode="faltante" inWishlist onAdd={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/CatalogoCard.test.tsx`
Expected: FAIL — no existe `CatalogoCard`.

- [ ] **Step 3: Implementar `CatalogoCard.tsx`**

```tsx
import { useState } from 'react';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const BLUE = '#03BAE9';
const GREEN = '#05B15A';

interface CatalogoCardProps {
  base: FiguritaBaseDTO;
  mode: 'poseida' | 'faltante';
  owned?: number;
  selected?: boolean;
  onSelect?: () => void;
  inWishlist?: boolean;
  busy?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

function Imagen({ base }: { base: FiguritaBaseDTO }) {
  const [err, setErr] = useState(false);
  const show = !!base.imagenUrl && !err;
  return (
    <div className="w-full aspect-square bg-surface rounded mb-2 flex items-center justify-center overflow-hidden">
      {show
        ? <img src={base.imagenUrl!} alt={base.jugadorNombre} className="w-full h-full object-contain" onError={() => setErr(true)} />
        : <span className="text-xs text-muted">#{base.numero}</span>}
    </div>
  );
}

/** Tarjeta del maestro dentro del modal. En `poseida` la tarjeta entera selecciona; en `faltante` trae su acción. */
export default function CatalogoCard({
  base, mode, owned = 0, selected, onSelect, inWishlist, busy, onAdd, onRemove,
}: CatalogoCardProps) {
  const meta = (
    <>
      <p className="text-xs text-muted">{base.seleccionNombre}</p>
      <p className="text-sm font-bold text-primary">{base.jugadorNombre}</p>
      <p className="text-xs text-text">#{base.numero}</p>
    </>
  );

  if (mode === 'poseida') {
    return (
      <button
        type="button"
        data-testid="catalogo-card"
        onClick={onSelect}
        className={'text-left bg-surface2 p-3 rounded-lg border transition-colors hover:border-primary ' + (selected ? 'border-primary' : 'border-border')}
        style={selected ? { boxShadow: `0 0 0 1px ${BLUE}` } : undefined}
      >
        <Imagen base={base} />
        {meta}
        <span
          className="inline-block mt-2 text-xs px-2 py-0.5 rounded"
          style={{ background: owned > 0 ? `${BLUE}18` : 'transparent', color: owned > 0 ? BLUE : 'var(--muted, #888)' }}
        >
          {owned > 0 ? `Tenés ${owned}` : 'No la tenés'}
        </span>
      </button>
    );
  }

  return (
    <div
      data-testid="catalogo-card"
      className="bg-surface2 p-3 rounded-lg border transition-colors"
      style={{ borderColor: inWishlist ? `${GREEN}55` : 'var(--border, #e5e5e5)' }}
    >
      <Imagen base={base} />
      {meta}
      {inWishlist ? (
        <button
          onClick={onRemove}
          disabled={busy}
          className="w-full mt-2 py-1.5 text-xs rounded border border-border text-muted hover:text-red-500 hover:border-red-500 transition-colors disabled:opacity-50"
        >
          En tu wishlist · Quitar
        </button>
      ) : (
        <button
          onClick={onAdd}
          disabled={busy}
          className="w-full mt-2 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-50"
          style={{ background: `${BLUE}18`, color: BLUE }}
        >
          {busy ? 'Agregando…' : '+ Agregar'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/CatalogoCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/pages/coleccion/components/CatalogoCard.tsx frontend/src/pages/coleccion/components/CatalogoCard.test.tsx
git commit -m "feat(coleccion): CatalogoCard con estado por modo (Tenés N / wishlist)"
```

---

### Task 8: Frontend — `CantidadConfigurator`

**Files:**
- Create: `frontend/src/pages/coleccion/components/CantidadConfigurator.tsx`
- Test: `frontend/src/pages/coleccion/components/CantidadConfigurator.test.tsx`

**Interfaces:**
- Produces: `<CantidadConfigurator base current busy? onSave onCancel />` con `onSave(total: number)`.

- [ ] **Step 1: Escribir el test que falla** — `CantidadConfigurator.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CantidadConfigurator from './CantidadConfigurator';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const base: FiguritaBaseDTO = {
  id: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
};

describe('CantidadConfigurator', () => {
  it('subir habilita Guardar y emite el nuevo total', () => {
    const onSave = vi.fn();
    render(<CantidadConfigurator base={base} current={2} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByLabelText('Sumar una copia'));
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    expect(guardar).not.toBeDisabled();
    fireEvent.click(guardar);
    expect(onSave).toHaveBeenCalledWith(3);
  });

  it('sin cambios: Guardar deshabilitado', () => {
    render(<CantidadConfigurator base={base} current={2} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('bajar muestra el aviso y el botón de liberar', () => {
    const onSave = vi.fn();
    render(<CantidadConfigurator base={base} current={3} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByLabelText('Restar una copia'));
    fireEvent.click(screen.getByLabelText('Restar una copia'));
    expect(screen.getByRole('alert')).toHaveTextContent(/se liberan 2 copias/i);
    const liberar = screen.getByRole('button', { name: 'Liberar 2 copias' });
    fireEvent.click(liberar);
    expect(onSave).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/CantidadConfigurator.test.tsx`
Expected: FAIL — no existe `CantidadConfigurator`.

- [ ] **Step 3: Implementar `CantidadConfigurator.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const BLUE = '#03BAE9';
const RED = '#D82D31';

interface Props {
  base: FiguritaBaseDTO;
  current: number;
  busy?: boolean;
  onSave: (total: number) => void;
  onCancel: () => void;
}

/** Barra inferior del modo repetidas: stepper de total + aviso de cascada al bajar. */
export default function CantidadConfigurator({ base, current, busy, onSave, onCancel }: Props) {
  const [total, setTotal] = useState(current);
  useEffect(() => { setTotal(current); }, [current, base.id]);

  const lowering = total < current;
  const unchanged = total === current;
  const liberadas = current - total;
  const accent = lowering ? RED : BLUE;

  const save = () => { if (!unchanged && !busy) onSave(total); };

  return (
    <div
      className="mt-3 rounded-xl border p-3"
      style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
      onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text truncate">{base.jugadorNombre} · #{base.numero}</p>
          <p className="text-xs text-muted">Total de copias que tenés</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button" aria-label="Restar una copia"
            onClick={() => setTotal((t) => Math.max(0, t - 1))}
            className="w-8 h-8 rounded-md border border-border text-text text-lg leading-none flex items-center justify-center hover:bg-surface2"
          >−</button>
          <span data-testid="total" className="min-w-6 text-center text-base font-semibold">{total}</span>
          <button
            type="button" aria-label="Sumar una copia"
            onClick={() => setTotal((t) => t + 1)}
            className="w-8 h-8 rounded-md border border-border text-text text-lg leading-none flex items-center justify-center hover:bg-surface2"
          >+</button>
        </div>
      </div>

      {lowering && (
        <p role="alert" className="mt-2 text-xs" style={{ color: RED }}>
          Bajás de {current} a {total}: se liberan {liberadas} {liberadas === 1 ? 'copia' : 'copias'}.
          Puede cancelar publicaciones, subastas o propuestas que las usen.
        </p>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <button
          type="button" onClick={onCancel}
          className="h-8 px-3 text-sm rounded-md border border-border text-muted hover:text-text"
        >Cancelar</button>
        <button
          type="button" onClick={save} disabled={unchanged || busy}
          className="h-8 px-4 text-sm font-semibold rounded-md text-white disabled:opacity-40"
          style={{ background: accent }}
        >
          {busy ? 'Guardando…' : lowering ? `Liberar ${liberadas} ${liberadas === 1 ? 'copia' : 'copias'}` : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/CantidadConfigurator.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/pages/coleccion/components/CantidadConfigurator.tsx frontend/src/pages/coleccion/components/CantidadConfigurator.test.tsx
git commit -m "feat(coleccion): CantidadConfigurator (stepper + aviso de cascada)"
```

---

### Task 9: Frontend — `CatalogoGrid`

**Files:**
- Create: `frontend/src/pages/coleccion/components/CatalogoGrid.tsx`
- Test: `frontend/src/pages/coleccion/components/CatalogoGrid.test.tsx`

**Interfaces:**
- Consumes: `EmptyState` (de `components/EmptyState`).
- Produces: `<CatalogoGrid loading isEmpty emptyMessage>{children}</CatalogoGrid>`.

- [ ] **Step 1: Escribir el test que falla** — `CatalogoGrid.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CatalogoGrid from './CatalogoGrid';

describe('CatalogoGrid', () => {
  it('loading: muestra skeletons', () => {
    render(<CatalogoGrid loading isEmpty={false} emptyMessage="x"><div>hijo</div></CatalogoGrid>);
    expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
    expect(screen.queryByText('hijo')).toBeNull();
  });

  it('empty: muestra el mensaje', () => {
    render(<CatalogoGrid loading={false} isEmpty emptyMessage="Sin resultados"><div>hijo</div></CatalogoGrid>);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('con datos: renderiza los hijos', () => {
    render(<CatalogoGrid loading={false} isEmpty={false} emptyMessage="x"><div>hijo</div></CatalogoGrid>);
    expect(screen.getByText('hijo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/CatalogoGrid.test.tsx`
Expected: FAIL — no existe `CatalogoGrid`.

- [ ] **Step 3: Implementar `CatalogoGrid.tsx`**

```tsx
import type { ReactNode } from 'react';
import EmptyState from '../../../components/EmptyState';

interface Props {
  loading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

const GRID = 'grid grid-cols-2 sm:grid-cols-3 gap-3';

/** Grilla del maestro: skeletons mientras carga, EmptyState si no hay resultados, o los hijos. */
export default function CatalogoGrid({ loading, isEmpty, emptyMessage, children }: Props) {
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} data-testid="skeleton-card" className="bg-surface2 rounded-lg border border-border p-3 animate-pulse">
            <div className="w-full aspect-square bg-surface rounded mb-2" />
            <div className="h-3 bg-surface rounded w-1/2 mb-1" />
            <div className="h-3 bg-surface rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }
  if (isEmpty) return <EmptyState title={emptyMessage} />;
  return <div className={GRID}>{children}</div>;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/CatalogoGrid.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/pages/coleccion/components/CatalogoGrid.tsx frontend/src/pages/coleccion/components/CatalogoGrid.test.tsx
git commit -m "feat(coleccion): CatalogoGrid con skeletons y empty state"
```

---

### Task 10: Frontend — reescritura de `AgregarFiguritaModal`

**Files:**
- Modify (reescribir): `frontend/src/pages/coleccion/components/AgregarFiguritaModal.tsx`
- Test: `frontend/src/pages/coleccion/components/AgregarFiguritaModal.test.tsx`

**Interfaces:**
- Consumes: `useMaestro`, `useMisCantidades`, `useWishlistBaseIds`, `useToast`, `CatalogoGrid`, `CatalogoCard`, `CantidadConfigurator`, `Paginador`, `useAuth`, `useDebouncedValue`, `api`, `useQueryClient`.
- Produces: `<AgregarFiguritaModal mode onClose onDone />` (misma API pública que hoy).

- [ ] **Step 1: Escribir el test que falla** — `AgregarFiguritaModal.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../components/toast/ToastProvider';
import AgregarFiguritaModal from './AgregarFiguritaModal';

vi.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u9', username: 'sofi' } }),
}));

const getMock = vi.fn();
const putMock = vi.fn();
const postMock = vi.fn();
const delMock = vi.fn();
vi.mock('../../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api')>('../../../services/api');
  return {
    ...actual,
    default: {
      get: (...a: unknown[]) => getMock(...a),
      put: (...a: unknown[]) => putMock(...a),
      post: (...a: unknown[]) => postMock(...a),
      delete: (...a: unknown[]) => delMock(...a),
    },
  };
});

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><ToastProvider>{node}</ToastProvider></QueryClientProvider>);
}

const basePage = (over = {}) => ({ data: { content: [{
  id: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG', equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
}], page: 0, size: 10, totalElements: 1, totalPages: 1, last: true, ...over } });

// Rutea el get según la URL pedida.
function routeGet(url: string) {
  if (url === '/api/figuritas-base/search') return Promise.resolve(basePage());
  if (url === '/api/usuarios/sofi/figuritas') return Promise.resolve({ data: { content: [{ figuritaBaseId: 'b1', count: 2 }] } });
  if (url === '/api/usuarios/sofi/figuritas/faltantes') return Promise.resolve({ data: { content: [], last: true } });
  return Promise.resolve({ data: { content: [], last: true } });
}

describe('AgregarFiguritaModal', () => {
  beforeEach(() => { getMock.mockReset(); putMock.mockReset(); postMock.mockReset(); delMock.mockReset();
    getMock.mockImplementation((url: string) => routeGet(url)); });

  it('poseida: muestra "Tenés 2", abre el configurador y guarda el total', async () => {
    putMock.mockResolvedValueOnce({ data: {} });
    ui(<AgregarFiguritaModal mode="poseida" onClose={() => {}} onDone={() => {}} />);

    await waitFor(() => expect(screen.getByText('Tenés 2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('catalogo-card'));
    fireEvent.click(screen.getByLabelText('Sumar una copia'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(putMock).toHaveBeenCalledWith('/api/usuarios/sofi/figuritas/b1', { cantidad: 3 }));
    expect(await screen.findByText(/ahora tenés 3/i)).toBeInTheDocument();
  });

  it('faltante: un error de POST muestra toast de error', async () => {
    postMock.mockRejectedValueOnce({ response: { status: 409 } });
    ui(<AgregarFiguritaModal mode="faltante" onClose={() => {}} onDone={() => {}} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tenés esta figurita.');
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/AgregarFiguritaModal.test.tsx`
Expected: FAIL — el modal actual usa `window.prompt`/`useCatalogoFiguritas`, no coincide.

- [ ] **Step 3: Reescribir `AgregarFiguritaModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/useAuth';
import api from '../../../services/api';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useMaestro } from '../../../hooks/useMaestro';
import { useMisCantidades } from '../../../hooks/useMisCantidades';
import { useWishlistBaseIds } from '../../../hooks/useWishlistBaseIds';
import { useToast } from '../../../components/toast/useToast';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';
import Paginador from '../../../components/Paginador';
import CatalogoGrid from './CatalogoGrid';
import CatalogoCard from './CatalogoCard';
import CantidadConfigurator from './CantidadConfigurator';

const BLUE = '#03BAE9';

interface Props {
  mode: 'poseida' | 'faltante';
  onClose: () => void;
  onDone: () => void;
}

function mapError(status: number | undefined, mode: 'poseida' | 'faltante'): string {
  if (status === 409) return mode === 'faltante' ? 'Ya tenés esta figurita.' : 'No se pudo actualizar la cantidad.';
  if (status === 404) return 'Figurita no encontrada.';
  if (status === 403) return 'No tenés permiso para esta acción.';
  return 'No se pudo completar la acción.';
}

/**
 * Modal para construir la colección desde el maestro completo.
 * - `poseida`: elegís una base → configurador de total (PUT), con aviso al bajar.
 * - `faltante`: agregás/quitás bases de la wishlist (POST/DELETE); el maestro excluye lo que ya tenés.
 */
export default function AgregarFiguritaModal({ mode, onClose, onDone }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const debounced = useDebouncedValue(search, 300);

  const maestro = useMaestro({
    page,
    search: debounced.trim() || undefined,
    excludeOwnedBy: mode === 'faltante' ? user?.id : undefined,
  });
  const cantidades = useMisCantidades(mode === 'poseida' ? user?.username : undefined);
  const wishlist = useWishlistBaseIds(mode === 'faltante' ? user?.username : undefined);

  const items = maestro.data?.content ?? [];
  const selected = items.find((b) => b.id === selectedId) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const afterMutate = () => {
    qc.invalidateQueries({ queryKey: ['figuritas'] });
    qc.invalidateQueries({ queryKey: ['faltantes'] });
    onDone();
  };

  const handleSaveCantidad = async (total: number) => {
    if (!user || !selected) return;
    setBusyId(selected.id);
    try {
      await api.put(`/api/usuarios/${user.username}/figuritas/${selected.id}`, { cantidad: total });
      toast.success(`${selected.jugadorNombre}: ahora tenés ${total}`);
      setSelectedId(null);
      afterMutate();
    } catch (e: unknown) {
      toast.error(mapError((e as { response?: { status?: number } }).response?.status, mode));
    } finally { setBusyId(null); }
  };

  const handleAdd = async (base: FiguritaBaseDTO) => {
    if (!user) return;
    setBusyId(base.id);
    try {
      await api.post(`/api/usuarios/${user.username}/faltantes`, { figuritaBaseId: base.id });
      toast.success(`${base.jugadorNombre} agregada a faltantes`);
      afterMutate();
    } catch (e: unknown) {
      toast.error(mapError((e as { response?: { status?: number } }).response?.status, mode));
    } finally { setBusyId(null); }
  };

  const handleRemove = async (base: FiguritaBaseDTO) => {
    if (!user) return;
    setBusyId(base.id);
    try {
      await api.delete(`/api/usuarios/${user.username}/faltantes/${base.id}`);
      toast.info(`${base.jugadorNombre} quitada de faltantes`);
      afterMutate();
    } catch (e: unknown) {
      toast.error(mapError((e as { response?: { status?: number } }).response?.status, mode));
    } finally { setBusyId(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col p-6"
        style={{ borderColor: `${BLUE}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">
            {mode === 'poseida' ? 'Agregar a mis repetidas' : 'Agregar a mis faltantes'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-text text-xl leading-none">✕</button>
        </div>

        <div className="flex items-center gap-2 mb-3 px-3 bg-surface2 border border-border rounded-lg focus-within:border-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-muted shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            aria-label="Buscar en el maestro"
            placeholder="Buscar por jugador, selección o número…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 py-3 bg-transparent text-text placeholder-muted focus:outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(0); }} aria-label="Limpiar búsqueda" className="text-muted hover:text-text">✕</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <CatalogoGrid loading={maestro.isLoading} isEmpty={items.length === 0} emptyMessage="Sin resultados">
            {items.map((base) => (
              <CatalogoCard
                key={base.id}
                base={base}
                mode={mode}
                owned={cantidades.data?.get(base.id) ?? 0}
                selected={selectedId === base.id}
                onSelect={() => setSelectedId(base.id)}
                inWishlist={wishlist.data?.has(base.id) ?? false}
                busy={busyId === base.id}
                onAdd={() => handleAdd(base)}
                onRemove={() => handleRemove(base)}
              />
            ))}
          </CatalogoGrid>
        </div>

        {mode === 'poseida' && selected && (
          <CantidadConfigurator
            base={selected}
            current={cantidades.data?.get(selected.id) ?? 0}
            busy={busyId === selected.id}
            onSave={handleSaveCantidad}
            onCancel={() => setSelectedId(null)}
          />
        )}

        <div className="mt-3">
          <Paginador page={page} totalPages={maestro.data?.totalPages ?? 1} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd frontend; npx vitest run src/pages/coleccion/components/AgregarFiguritaModal.test.tsx`
Expected: PASS (ambos casos).

- [ ] **Step 5: Verificar que no quedó `window.prompt`/`alert` en el modal**

Run: `cd frontend; npx grep -n "window.prompt\|alert(" src/pages/coleccion/components/AgregarFiguritaModal.tsx` (o usar la herramienta de búsqueda)
Expected: sin resultados en el archivo del modal.

- [ ] **Step 6: Commit** (sólo si el usuario lo pide)

```bash
git add frontend/src/pages/coleccion/components/AgregarFiguritaModal.tsx frontend/src/pages/coleccion/components/AgregarFiguritaModal.test.tsx
git commit -m "feat(coleccion): reescritura del modal Agregar figurita (stepper, toast, maestro completo)"
```

---

### Task 11: Verificación integral (build + lint + suites)

**Files:** ninguno nuevo. `RepetidasPage`/`FaltantesPage` no necesitan cambios: siguen montando `<AgregarFiguritaModal mode … onClose onDone />` con la misma API pública; el modal lee `useAuth` internamente.

- [ ] **Step 1: Type-check + build frontend**

Run: `cd frontend; npm run build`
Expected: `tsc` sin errores + build OK.

- [ ] **Step 2: Lint frontend**

Run: `cd frontend; npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Suite completa frontend**

Run: `cd frontend; npx vitest run`
Expected: todos verdes (nuevos + existentes).

- [ ] **Step 4: Suite backend**

Run: `cd backend; ./mvnw test`
Expected: `FiguritaServicePaginadoTest` verde; sin regresiones nuevas (los fallos preexistentes de mongo local, si aparecen, son los conocidos).

- [ ] **Step 5: Verificación manual (levantar la app)**
  - En Mis repetidas → "Agregar Figurita": buscar, ver "Tenés N", seleccionar, subir/guardar (toast), bajar → aviso rojo + "Liberar K copias".
  - En Mis faltantes → "Agregar Figurita": ver maestro sin lo que ya tengo, agregar (toast), tarjeta pasa a "En tu wishlist", quitar (toast).
  - Confirmar que no aparece ningún `prompt`/`alert` nativo.

- [ ] **Step 6: Commit** (sólo si el usuario lo pide)

```bash
git add -A
git commit -m "chore(coleccion): verificación integral del rediseño de agregar figuritas"
```

---

## Self-Review

- **Cobertura del spec:** §5 backend → Tasks 1-2. §6.1 componentes → Tasks 7-10. §6.2 hooks → Tasks 4-6. §6.4 toasts → Task 3. §6.3 estados → Tasks 7-8-10. §6.5 errores → Task 10 (mapError + toast). §6.6 pulido/a11y → Tasks 8-9-10 (skeletons, empty, Esc, aria-labels, limpiar búsqueda). §8 testing → tests por task + Task 11. §9 riesgos (wishlist>100) → Task 6 pagina hasta agotar.
- **Placeholders:** ninguno; todo el código está completo.
- **Consistencia de tipos:** `useMaestro`→`PagedResponse<FiguritaBaseDTO>`; `FiguritaBaseDTO.id` = baseId usado en `owned`/`inWishlist`/PUT/POST/DELETE; `useMisCantidades`→`Map<string,number>`; `useWishlistBaseIds`→`Set<string>`; `CantidadConfigurator.onSave(total)`; backend `buscarMaestroPaginado(search, excludeOwnedBy, pageable)` ↔ controller param `excludeOwnedBy`. Todo alineado.
