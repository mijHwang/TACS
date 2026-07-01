# Fase 3 — Robustez, errores y accesibilidad (pulido) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan task por task. Los pasos usan checkbox (`- [ ]`) para tracking.

**Goal:** Que un error no tumbe la app (Error Boundary global), que el usuario vea feedback claro en vez de `alert()` y `console.error` mudos, y subir la base de tipos (`strict`) y accesibilidad del frontend de TACS, sin cambiar la UI.

**Architecture:** React 19 + Vite 8 + React Router 6 (`createBrowserRouter`) + TanStack React Query v5 (caché de server-state, montada en `App.tsx`). Capas: `pages/` (feature-based) → `hooks/` (React Query) → `services/` (Axios `api` + helpers). Fase 3 agrega un `ErrorBoundary` de clase envolviendo `RouterProvider`, componentes de estado reutilizables (`Spinner`/`ErrorState`/`EmptyState`), migra las últimas pantallas de fetch manual a hooks de React Query para obtener `isError`/`refetch`, y reemplaza mutación directa de DOM por clases Tailwind.

**Tech Stack:** TypeScript ~6.0, React 19.2, @tanstack/react-query 5.101, React Router 6.30, ESLint 9 (flat config) + typescript-eslint 8 + (nuevo) eslint-plugin-jsx-a11y, Vitest 4 + @testing-library/react 16 (`jsdom`, `globals: true`).

## Global Constraints

- **NO COMMITS / NO PUSH automáticos.** Por instrucción explícita del usuario, ninguna task ejecuta `git commit` ni `git push`. Cada task termina en un **checkpoint de review por diff**; el usuario decide cuándo commitear.
- **No tocar backend.** Toda la Fase 3 es frontend. No se cambian endpoints ni contratos.
- **No rediseñar UI.** Mismos colores/markup/clases. Los componentes nuevos (`Spinner`/`ErrorState`/`EmptyState`) replican exactamente el markup inline que reemplazan.
- **Colores (siempre inline `style={}`, nunca utilidades Tailwind para acentos):** `RED = '#D82D31'`, `BLUE = '#03BAE9'`, `GREEN = '#05B15A'`, `PURPLE = '#7F77DD'`. Fondos con opacidad: sufijo hex `${COLOR}12` ≈ 7%, `${COLOR}30` ≈ 19%.
- **Data fetching:** para datos nuevos, hooks de React Query (`useQuery`/`useMutation` + `invalidateQueries`) siguiendo `src/hooks/`. **Prohibido** `useEffect + fetch` nuevo. Query keys jerárquicas: `['recurso', 'accion', id]`. `queryClient` (en `src/lib/queryClient.ts`): `staleTime: 30_000`, `gcTime: 5*60_000`, `retry: 1`, `refetchOnWindowFocus: false`.
- **Comandos** (desde `frontend/`): build `npm run build` (= `tsc -b && vite build`); lint `npm run lint` (= `eslint .`); tests `npm test` (= `vitest run`). El JAVA_HOME/puerto 80 no aplican al frontend.
- **Tests:** Vitest con `environment: 'jsdom'`, `globals: true`. **NO hay `@testing-library/jest-dom` configurado en setupFiles** → no usar matchers tipo `toBeInTheDocument()`. Usar `expect(screen.getByText(...)).toBeDefined()`, `expect(screen.queryByText(...)).toBeNull()`, `screen.getByRole(...)`, `screen.getByLabelText(...)`. Imports: `import { describe, it, expect, vi } from 'vitest'` y `import { render, screen, fireEvent } from '@testing-library/react'`.
- **Decisiones de alcance (acordadas con el usuario):**
  1. Las pantallas con fetch manual + `console.error` mudo (Repetidas, Faltantes, Sugerencias, reputación de Perfil) **se migran a hooks de React Query** (no estado local).
  2. El botón de campana de `MainLayout` **se conecta a `/notificaciones`** (la ruta/página existen), con `aria-label`.
  3. `UserProfileModal` usa `MOCK_USERS` como fuente de datos (no hay endpoint real); **se mantiene** (load-bearing, documentado en `frontend/CLAUDE.md`). Solo se borra el mock **realmente muerto** `src/data/mockAuctions.ts` (0 imports).

## File Structure

**Componentes nuevos (`src/components/`):**
- `ErrorBoundary.tsx` — class component (`getDerivedStateFromError` + `componentDidCatch`), fallback + reintentar. Envuelve `RouterProvider` en `App.tsx`.
- `ErrorState.tsx` — `{ message?, onRetry?, color? }`. Estado de error inline con botón opcional de reintento.
- `EmptyState.tsx` — `{ title, subtitle?, accentColor?, icon? }`. Estado vacío con ícono opcional (ReactNode).
- `Spinner.tsx` — `{ label? }`. Spinner de carga (reemplaza el `PageLoading` exportado desde `ActivasPage`).
- `StarRating.tsx` — `{ score, size?, emptyColor? }`. Estrellas con gradiente (consolida las copias inline de `UserProfileModal` y `PerfilPage`).

**Hooks nuevos / extendidos (`src/hooks/`):**
- `useFiguritas.ts` (extender) — agregar `useRepetidas(username)`, `useFaltantes(username)`, e interfaz `FiguritaBaseDTO`.
- `useSugerencias.ts` (nuevo) — `useSugerencias(username)` + `SugerenciaResponseDTO`.
- `useReputacion.ts` (nuevo) — `useReputacion(userId, username)` + `Reputacion`.
- `usePropuestas.ts` (extender) — agregar `useCrearPropuesta()`.

**Config:**
- `tsconfig.app.json` — `"strict": true`.
- `eslint.config.js` — agregar `eslint-plugin-jsx-a11y` (flat `recommended`), con 2 reglas de interacción a `warn`.
- `package.json` / `package-lock.json` — devDep `eslint-plugin-jsx-a11y`.

**Borrado:** `src/data/mockAuctions.ts`.

**Páginas/componentes modificados:** `App.tsx`; subastas `ActivasPage`, `ParticipandoPage`, `MiasPage`, `components/AuctionDetailModal`; `admin/AdminPage`, `admin/AdminGiftPage`; colección `RepetidasPage`, `FaltantesPage`, `components/FiltrosFigurita`; `sugerencias/SugerenciasPage`; `perfil/PerfilPage`; propuestas `NuevaPage`, `RecibidasPage`; `intercambios/IntercambiosPage`; `home/DashboardPage`, `home/components/Carousel`; subastas `components/ConditionsBuilder`; `buscar/BuscarPage`; `layouts/MainLayout`; `perfil/HistorialPage`; `login/LoginPage`; `registro/RegisterPage`; `components/UserProfileModal`.

---

### Task 1: Activar TypeScript `strict`

Zero-risk y endurece todas las tasks siguientes (verificado: con `strict: true` el `tsc` actual da **0 errores**). Va primero para que cada `npm run build` posterior lo enforce.

**Files:**
- Modify: `frontend/tsconfig.app.json`
- Modify: `frontend/tsconfig.node.json`

- [ ] **Step 1: Activar strict en `tsconfig.app.json`**

En `compilerOptions`, dentro del bloque `/* Linting */`, agregar `"strict": true` como primera línea del bloque:

```jsonc
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
```

- [ ] **Step 2: Activar strict en `tsconfig.node.json`** (mismo cambio, para `vite.config.ts`)

```jsonc
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
```

- [ ] **Step 3: Verificar build (debe pasar con 0 errores)**

Run (desde `frontend/`): `npm run build`
Expected: `tsc -b` sin errores y `vite build` OK. (Si apareciera algún error de `strictNullChecks` inesperado, arreglarlo en el sitio con guard/`?.`/`??`; no relajar `strict`.)

- [ ] **Step 4: Checkpoint de review por diff** (sin commit).

---

### Task 2: `ErrorBoundary` global

**Files:**
- Create: `frontend/src/components/ErrorBoundary.tsx`
- Test: `frontend/src/components/ErrorBoundary.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `export default class ErrorBoundary` — componente que envuelve children y, ante un throw en render, muestra fallback con botón "Reintentar" (resetea estado).

- [ ] **Step 1: Escribir el test que falla** — `frontend/src/components/ErrorBoundary.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('muestra el fallback cuando un hijo lanza', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Algo salió mal.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined();
  });

  it('renderiza los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenido ok')).toBeDefined();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- ErrorBoundary`
Expected: FAIL (`Cannot find module './ErrorBoundary'`).

- [ ] **Step 3: Implementar `frontend/src/components/ErrorBoundary.tsx`**

```tsx
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

const RED = '#D82D31';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnóstico en consola; el usuario ya ve el fallback con reintento.
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  private handleRetry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-4 h-screen w-screen bg-white text-center px-6"
        >
          <p className="text-lg font-bold" style={{ color: RED }}>
            Algo salió mal.
          </p>
          <p className="text-sm text-gray-500 max-w-md">
            Ocurrió un error inesperado. Podés reintentar; si persiste, recargá la página.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: RED }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: Envolver `RouterProvider` en `frontend/src/App.tsx`**

Agregar el import y envolver `Suspense + RouterProvider` con `ErrorBoundary` (queda **dentro** de `QueryClientProvider` y **fuera** de `Suspense`):

```tsx
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import router from './router/router';
import queryClient from './lib/queryClient';
import ErrorBoundary from './components/ErrorBoundary';

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
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Correr el test y el build**

Run: `npm test -- ErrorBoundary` → Expected: PASS (2 tests).
Run: `npm run build` → Expected: OK.

- [ ] **Step 6: Checkpoint de review por diff** (sin commit).

---

### Task 3: Componentes de estado compartidos (`Spinner`, `ErrorState`, `EmptyState`)

Crea los componentes reutilizables. La adopción ocurre en tasks posteriores. El markup replica exactamente el de los componentes inline existentes (mismos estilos).

**Files:**
- Create: `frontend/src/components/Spinner.tsx`
- Create: `frontend/src/components/ErrorState.tsx`
- Create: `frontend/src/components/EmptyState.tsx`
- Test: `frontend/src/components/ErrorState.test.tsx`
- Test: `frontend/src/components/EmptyState.test.tsx`

**Interfaces (Produces):**
- `Spinner({ label?: string })`
- `ErrorState({ message?: string; onRetry?: () => void; color?: string })` — `message` default `'No se pudo cargar la información.'`, `color` default `RED`. Si `onRetry` está, muestra botón "Reintentar".
- `EmptyState({ title: string; subtitle?: string; accentColor?: string; icon?: ReactNode })` — `accentColor` default `BLUE`.

- [ ] **Step 1: Escribir los tests que fallan** — `frontend/src/components/ErrorState.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from './ErrorState';

describe('ErrorState', () => {
  it('muestra el mensaje y dispara onRetry', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Falló la carga." onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Falló la carga.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sin botón si no se pasa onRetry', () => {
    render(<ErrorState message="Solo mensaje." />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

`frontend/src/components/EmptyState.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('muestra título y subtítulo', () => {
    render(<EmptyState title="Nada acá" subtitle="Volvé más tarde." />);
    expect(screen.getByText('Nada acá')).toBeDefined();
    expect(screen.getByText('Volvé más tarde.')).toBeDefined();
  });
});
```

- [ ] **Step 2: Correr y verificar fallo**

Run: `npm test -- ErrorState EmptyState`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar `frontend/src/components/Spinner.tsx`** (replica `PageLoading` de ActivasPage)

```tsx
export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted text-sm">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      {label}
    </div>
  );
}
```

- [ ] **Step 4: Implementar `frontend/src/components/ErrorState.tsx`** (replica el bloque de error con reintento de DashboardPage)

```tsx
const RED = '#D82D31';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  color?: string;
}

export default function ErrorState({
  message = 'No se pudo cargar la información.',
  onRetry,
  color = RED,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p className="text-base font-semibold" style={{ color }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: color }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implementar `frontend/src/components/EmptyState.tsx`** (replica el estado vacío con ícono de ActivasPage/IntercambiosPage; `icon` opcional para conservar el ícono propio de cada pantalla)

```tsx
import type { ReactNode } from 'react';

const BLUE = '#03BAE9';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, subtitle, accentColor = BLUE, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: `${accentColor}12`, border: `1.5px solid ${accentColor}30` }}
      >
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12h6" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-text">{title}</p>
      {subtitle && <p className="text-xs text-muted max-w-xs">{subtitle}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Correr tests y build**

Run: `npm test -- ErrorState EmptyState` → Expected: PASS.
Run: `npm run build` → Expected: OK.

- [ ] **Step 7: Checkpoint de review por diff** (sin commit).

---

### Task 4: `StarRating` compartido + adopción en `UserProfileModal`

**Files:**
- Create: `frontend/src/components/StarRating.tsx`
- Test: `frontend/src/components/StarRating.test.tsx`
- Modify: `frontend/src/components/UserProfileModal.tsx` (reemplazar StarRating inline, líneas 24–50; invocación en línea 115)

**Interfaces (Produces):**
- `StarRating({ score: number; size?: number; emptyColor?: string })` — 5 estrellas con relleno gradiente; `size` default `24` (px), `emptyColor` default `'#E5E7EB'`. IDs de gradiente únicos por instancia vía `useId()`. `role="img"` + `aria-label` con el score.

- [ ] **Step 1: Escribir el test que falla** — `frontend/src/components/StarRating.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('renderiza 5 estrellas y expone el score por aria-label', () => {
    const { container } = render(<StarRating score={3.5} />);
    expect(container.querySelectorAll('svg').length).toBe(5);
    expect(screen.getByRole('img', { name: /3\.5/ })).toBeDefined();
  });
});
```

- [ ] **Step 2: Correr y verificar fallo**

Run: `npm test -- StarRating`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `frontend/src/components/StarRating.tsx`**

```tsx
import { useId } from 'react';

const GREEN = '#05B15A';

interface StarRatingProps {
  score: number;
  size?: number;
  emptyColor?: string;
}

export default function StarRating({ score, size = 24, emptyColor = '#E5E7EB' }: StarRatingProps) {
  const uid = useId();
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${score.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(Math.max(score - (star - 1), 0), 1);
        const id = `star-${uid}-${star}`;
        return (
          <svg key={star} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={id}>
                <stop offset={`${fill * 100}%`} stopColor={GREEN} />
                <stop offset={`${fill * 100}%`} stopColor={emptyColor} />
              </linearGradient>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={`url(#${id})`}
              stroke={GREEN}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Adoptar en `UserProfileModal.tsx`**

- Borrar la función `StarRating` inline (líneas ~24–50).
- Agregar `import StarRating from './StarRating';` al tope.
- La invocación (línea ~115) era `<StarRating score={userData.score} />`. El modal usaba `w-5 h-5` (20px) y color vacío `#E5E7EB` (= default). Reemplazar por: `<StarRating score={userData.score} size={20} />`.
- **No** tocar `MOCK_USERS` (load-bearing, fuera de alcance).

- [ ] **Step 5: Correr tests y build**

Run: `npm test -- StarRating` → Expected: PASS.
Run: `npm run build` → Expected: OK (visual idéntico: 20px, vacío gris).

- [ ] **Step 6: Checkpoint de review por diff** (sin commit).

---

### Task 5: Cluster Subastas + Admin — adoptar estados compartidos y quitar `alert()` de oferta

Elimina los componentes inline (`PageLoading`, `PageError`, `EmptyState`) de `ActivasPage`, los reemplaza por los compartidos, actualiza importadores (`ParticipandoPage`, `MiasPage`, `AdminPage`) y reemplaza el `alert()` de oferta por el error de la mutación de React Query renderizado dentro del modal.

**Files:**
- Modify: `frontend/src/pages/subastas/ActivasPage.tsx`
- Modify: `frontend/src/pages/subastas/ParticipandoPage.tsx`
- Modify: `frontend/src/pages/subastas/MiasPage.tsx` (import en línea 5)
- Modify: `frontend/src/pages/admin/AdminPage.tsx` (import en línea 4)
- Modify: `frontend/src/pages/subastas/components/AuctionDetailModal.tsx` (agregar prop de error)

**Interfaces (Consumes):** `Spinner`, `ErrorState`, `EmptyState` (Task 3); `getApiErrorMessage(err, fallback)` de `src/services/errors`.

- [ ] **Step 1: `AuctionDetailModal` acepta y muestra error de oferta**

Leer `components/AuctionDetailModal.tsx`. Agregar a sus props `errorMessage?: string | null`. Renderizar, **arriba del botón "Confirmar oferta"** (footer del modal), cuando `errorMessage` sea truthy:

```tsx
{errorMessage && (
  <p className="text-xs font-semibold text-center" style={{ color: '#D82D31' }}>
    {errorMessage}
  </p>
)}
```

- [ ] **Step 2: `ActivasPage.tsx` — adoptar compartidos + error de oferta vía mutación**

- Imports nuevos al tope:
  ```tsx
  import Spinner from '../../components/Spinner';
  import ErrorState from '../../components/ErrorState';
  import EmptyState from '../../components/EmptyState';
  ```
- Borrar las funciones inline `EmptyState` (líneas ~104–116), `PageLoading` (~118–127) y `PageError` (~129–136) del final del archivo.
- Reemplazar:
  - `if (isLoading) return <PageLoading label="Cargando subastas…" />;` → `if (isLoading) return <Spinner label="Cargando subastas…" />;`
  - `if (isError) return <PageError message="No se pudieron cargar las subastas." />;` → `if (isError) return <ErrorState message="No se pudieron cargar las subastas." onRetry={() => refetch()} />;` (agregar `refetch` al destructuring de `useSubastasActivas()`: `const { data: auctions = [], isLoading, isError, refetch } = useSubastasActivas();`).
- El `<EmptyState title="No hay subastas activas" subtitle="…" accentColor={BLUE} />` ya existente: ahora resuelve al componente compartido, que acepta `accentColor`. Pasarle el ícono original para mantener el visual:
  ```tsx
  <EmptyState
    title="No hay subastas activas"
    subtitle="Volvé más tarde o creá una nueva subasta."
    accentColor={BLUE}
    icon={
      <svg viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      </svg>
    }
  />
  ```
- Reemplazar `handleBid` para usar el error de la mutación en vez de `alert()` (eliminar el `try/catch` con `alert` y el `console.error`):
  ```tsx
  const handleBid = (auctionId: string, stickerIds: string[]) => {
    if (!user) return;
    ofertar.mutate(
      { auctionId, usuarioId: user.id, figuritaIds: stickerIds },
      {
        onSuccess: () => {
          setSelected(null);
          setBidFormStickers([]);
        },
      },
    );
  };
  ```
- Pasar el error al modal (la mutación `ofertar` ya está en scope):
  ```tsx
  <AuctionDetailModal
    auction={selected}
    myStickers={bidFormStickers}
    onClose={() => { setSelected(null); setBidFormStickers([]); ofertar.reset(); }}
    onBid={handleBid}
    isSubmitting={ofertar.isPending}
    isFetchingStickers={fetchingStickers}
    errorMessage={ofertar.isError ? getApiErrorMessage(ofertar.error, 'Error al enviar la oferta.') : null}
  />
  ```
- El `console.error('Error fetching stickers:', err)` de `handleSelectAuction` (carga de stickers del bid form): dejarlo como diagnóstico **pero** además, ante fallo, ya setea `setBidFormStickers([])` y el modal muestra su estado de "sin figuritas"; no agregar UI extra (el modal ya cubre el caso vacío). Mantener el `console.error`.

- [ ] **Step 3: `ParticipandoPage.tsx` — mismos cambios que ActivasPage**

- Cambiar el import `import { PageLoading, PageError } from './ActivasPage';` por:
  ```tsx
  import Spinner from '../../components/Spinner';
  import ErrorState from '../../components/ErrorState';
  import EmptyState from '../../components/EmptyState';
  ```
- Borrar la función inline `EmptyState` (líneas ~134–146).
- `useSubastasParticipando(user?.id)` → agregar `refetch`: `const { data: auctions = [], isLoading, isError, refetch } = useSubastasParticipando(user?.id);`
- `PageLoading`→`Spinner`, `PageError`→`ErrorState onRetry={() => refetch()}`.
- El `<EmptyState ...accentColor={BLUE} />` (líneas ~62–66): pasarle el ícono original de flechas para mantener visual:
  ```tsx
  icon={
    <svg viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
    </svg>
  }
  ```
- `handleBid`: igual que ActivasPage (mutación con `onSuccess`, sin `alert`/`console.error`).
- Pasar `errorMessage={ofertar.isError ? getApiErrorMessage(ofertar.error, 'Error al enviar la oferta.') : null}` y `ofertar.reset()` en `onClose` del `AuctionDetailModal`.

- [ ] **Step 4: `MiasPage.tsx` — actualizar import**

Cambiar `import { PageLoading, PageError } from './ActivasPage';` (línea 5) por:
```tsx
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
```
Y en el cuerpo: `<PageLoading label="Cargando tus subastas…" />` → `<Spinner label="Cargando tus subastas…" />`; `<PageError message="No se pudieron cargar tus subastas." />` → `<ErrorState message="No se pudieron cargar tus subastas." onRetry={() => refetch()} />` (agregar `refetch` al hook que use, p.ej. `useMisSubastas`). Si `MiasPage` no expone `refetch` fácilmente, usar `<ErrorState message="…" />` sin `onRetry`.

- [ ] **Step 5: `AdminPage.tsx` — actualizar import**

Cambiar `import { PageLoading, PageError } from '../subastas/ActivasPage';` (línea 4) por:
```tsx
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
```
`<PageLoading label="Cargando estadísticas…" />` → `<Spinner label="Cargando estadísticas…" />`; `<PageError message={error ?? 'Error inesperado.'} />` → `<ErrorState message={error ?? 'Error inesperado.'} />`.

- [ ] **Step 6: Build + lint**

Run: `npm run build` → Expected: OK (ningún import roto a `PageLoading`/`PageError`).
Run: `npm run lint` → Expected: sin errores nuevos.
Verificación manual (si hay backend/mock): forzar fallo de oferta → el modal muestra el mensaje de error en vez de `alert()`.

- [ ] **Step 7: Checkpoint de review por diff** (sin commit).

---

### Task 6: Colección + Sugerencias — migrar a hooks de React Query + estados

Mata 3 `console.error` mudos y borra `useEffect + fetch`. Migra `RepetidasPage`, `FaltantesPage`, `SugerenciasPage` a hooks.

**Files:**
- Modify: `frontend/src/hooks/useFiguritas.ts` (agregar `FiguritaBaseDTO`, `useRepetidas`, `useFaltantes`)
- Create: `frontend/src/hooks/useSugerencias.ts`
- Modify: `frontend/src/pages/coleccion/RepetidasPage.tsx`
- Modify: `frontend/src/pages/coleccion/FaltantesPage.tsx`
- Modify: `frontend/src/pages/sugerencias/SugerenciasPage.tsx`

**Interfaces (Produces):**
- `useRepetidas(username?: string)` → `useQuery<FiguritaResponseDTO[]>` key `['figuritas','repetidas',username]`.
- `useFaltantes(username?: string)` → `useQuery<FiguritaBaseDTO[]>` key `['figuritas','faltantes',username]`.
- `useSugerencias(username?: string)` → `useQuery<SugerenciaResponseDTO[]>` key `['sugerencias',username]`.

- [ ] **Step 1: Extender `useFiguritas.ts`** (al final, reusando `FiguritaResponseDTO` ya exportada en ese archivo)

```tsx
export interface FiguritaBaseDTO {
  id: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
}

/** Repetidas del usuario (count > 1). Solo lectura. */
export function useRepetidas(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', 'repetidas', username],
    queryFn: async (): Promise<FiguritaResponseDTO[]> =>
      (await api.get(`/api/usuarios/${username}/figuritas/repetidas`)).data,
    enabled: !!username,
  });
}

/** Figuritas que el usuario no tiene. */
export function useFaltantes(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', 'faltantes', username],
    queryFn: async (): Promise<FiguritaBaseDTO[]> =>
      (await api.get(`/api/usuarios/${username}/figuritas/faltantes`)).data,
    enabled: !!username,
  });
}
```

- [ ] **Step 2: Crear `frontend/src/hooks/useSugerencias.ts`**

```tsx
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { FiguritaResponseDTO } from './useFiguritas';

export interface SugerenciaResponseDTO {
  contraparteId: string;
  contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[];
  figuritasAOfrecer: FiguritaResponseDTO[];
}

/** Sugerencias bidireccionales (US4), agrupadas por contraparte. */
export function useSugerencias(username: string | undefined) {
  return useQuery({
    queryKey: ['sugerencias', username],
    queryFn: async (): Promise<SugerenciaResponseDTO[]> =>
      (await api.get(`/api/usuarios/${username}/sugerencias`)).data ?? [],
    enabled: !!username,
  });
}
```

- [ ] **Step 3: Migrar `RepetidasPage.tsx`**

- Quitar `useState`/`useEffect`/`api` y el bloque `console.error`. Imports nuevos:
  ```tsx
  import { useAuth } from '../../auth/useAuth';
  import { useRepetidas } from '../../hooks/useFiguritas';
  import Spinner from '../../components/Spinner';
  import ErrorState from '../../components/ErrorState';
  import { useFiltrosFigurita } from './components/useFiltrosFigurita';
  import FiltrosFigurita from './components/FiltrosFigurita';
  import TarjetaColeccion from './components/TarjetaColeccion';
  import GrillaFiguritas from './components/GrillaFiguritas';
  ```
- Cuerpo:
  ```tsx
  const { user } = useAuth();
  const { data: repetidas = [], isLoading, isError, refetch } = useRepetidas(user?.username);
  const filtros = useFiltrosFigurita();

  if (isLoading) return <Spinner label="Cargando repetidas…" />;
  if (isError) return <ErrorState message="No se pudieron cargar tus repetidas." onRetry={() => refetch()} />;

  const visibles = filtros.filtrar(repetidas);
  ```
- El resto del JSX (FiltrosFigurita + GrillaFiguritas con `emptyMessage="No tenés figuritas repetidas"`) queda igual. (Se mantiene la interfaz `FiguritaResponseDTO` local o se importa del hook; reusar la del hook y borrar la local.)

- [ ] **Step 4: Migrar `FaltantesPage.tsx`**

Análogo, con `useFaltantes` y `FiguritaBaseDTO` del hook:
```tsx
const { user } = useAuth();
const navigate = useNavigate();
const { data: faltantes = [], isLoading, isError, refetch } = useFaltantes(user?.username);
const filtros = useFiltrosFigurita();

if (isLoading) return <Spinner label="Cargando faltantes…" />;
if (isError) return <ErrorState message="No se pudieron cargar tus faltantes." onRetry={() => refetch()} />;

const visibles = filtros.filtrar(faltantes);
```
Borrar la interfaz `FiguritaBaseDTO` local (usar la importada de `useFiguritas`), el `useState`/`useEffect`/`console.error` y el import de `api`. Conservar el `onClick` que navega a `/buscar`.

- [ ] **Step 5: Migrar `SugerenciasPage.tsx`**

- Quitar `useState`/`useEffect`/`api`/`console.error`. Imports: `useNavigate`, `useAuth`, `useSugerencias` (+ tipos), `Spinner`, `ErrorState`, `EmptyState`.
- Cuerpo:
  ```tsx
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: sugerencias = [], isLoading, isError, refetch } = useSugerencias(user?.username);

  const proponer = (s: SugerenciaResponseDTO, f: FiguritaResponseDTO) => {
    navigate('/propuestas/nueva', {
      state: {
        figuritaSeleccionada: f,
        figuritasOfrecidasBaseIds: s.figuritasAOfrecer.map((x) => x.figuritaBaseId),
      },
    });
  };

  if (isLoading) {
    return <div className="page-enter"><Spinner label="Cargando sugerencias…" /></div>;
  }
  if (isError) {
    return (
      <div className="page-enter">
        <ErrorState message="No se pudieron cargar las sugerencias." onRetry={() => refetch()} />
      </div>
    );
  }
  ```
- El bloque `{sugerencias.length === 0 ? (<p className="text-muted">No tenés sugerencias por ahora.</p>) : (...)}` se conserva tal cual (estado vacío legítimo, ya no se confunde con error).

- [ ] **Step 6: Build + lint**

Run: `npm run build` → Expected: OK.
Run: `npm run lint` → Expected: sin `console.error` mudos en estas páginas; sin warnings de `setState`/deps.

- [ ] **Step 7: Checkpoint de review por diff** (sin commit).

---

### Task 7: `PerfilPage` — `useReputacion` + `StarRating` compartido + estados

**Files:**
- Create: `frontend/src/hooks/useReputacion.ts`
- Modify: `frontend/src/pages/perfil/PerfilPage.tsx`

**Interfaces (Produces):** `useReputacion(userId?: string, username?: string)` → `useQuery<Reputacion>` key `['reputacion', userId]`, `enabled: !!userId && userId !== username` (la reputación solo aplica con id real hidratado).

- [ ] **Step 1: Crear `frontend/src/hooks/useReputacion.ts`**

```tsx
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface Reputacion {
  score: number;
  total: number;
  cincoEstrellas: number;
  cuatroEstrellas: number;
  tresEstrellas: number;
  dosEstrellas: number;
  unaEstrella: number;
}

/** Reputación del usuario (promedio + histograma). Solo con id real hidratado. */
export function useReputacion(userId: string | undefined, username: string | undefined) {
  return useQuery({
    queryKey: ['reputacion', userId],
    queryFn: async (): Promise<Reputacion> =>
      (await api.get(`/api/intercambios/usuario/${userId}/reputacion`)).data,
    enabled: !!userId && userId !== username,
  });
}
```

- [ ] **Step 2: Migrar `PerfilPage.tsx`**

- Borrar la función `StarRating` inline (líneas ~27–50) y la interfaz `Reputacion` local (líneas ~17–25). Borrar el `useState<Reputacion | null>` y el `useEffect` de reputación (líneas ~61, ~67–72) y el import de `api` si queda sin uso.
- Imports nuevos:
  ```tsx
  import StarRating from '../../components/StarRating';
  import ErrorState from '../../components/ErrorState';
  import { useReputacion } from '../../hooks/useReputacion';
  ```
- En el cuerpo, reemplazar el estado de reputación por el hook:
  ```tsx
  const { data: reputacion, isError: reputacionError, refetch: refetchReputacion } = useReputacion(user?.id, user?.username);
  ```
- La invocación de estrellas (línea ~233) era `<StarRating score={reputacion?.score ?? 0} />` con `w-6 h-6` (24px = default) y vacío `#D1FAE5`. Reemplazar por: `<StarRating score={reputacion?.score ?? 0} emptyColor="#D1FAE5" />`.
- En la card "Reputación", si `reputacionError`, mostrar `<ErrorState>` chico con reintento **dentro** de la card (debajo del header verde), por ejemplo envolviendo el contenido:
  ```tsx
  {reputacionError ? (
    <div className="px-5 py-6">
      <ErrorState message="No se pudo cargar la reputación." onRetry={() => refetchReputacion()} color={GREEN} />
    </div>
  ) : (
    /* … el bloque actual de score + histograma … */
  )}
  ```
- **Transacciones:** `useTransactions(user?.id, user?.username)` hoy traga el error (`console.error` en `useTransactions.ts:45`) y muestra "Sin transacciones aún." indistinguible de vacío. Mínimo cambio: exponer un flag de error desde `useTransactions` (agregar `error: boolean` al return, seteado en el `catch`) y en `PerfilPage`, en la columna de historial, si `transactionsError` mostrar un texto de error en vez del vacío:
  ```tsx
  const { transactions, loading, error: transactionsError } = useTransactions(user?.id, user?.username);
  // … en el render del historial:
  ) : transactionsError ? (
    <p className="text-xs text-center py-8" style={{ color: RED }}>No se pudieron cargar las transacciones.</p>
  ) : transactions.length === 0 ? (
    <p className="text-xs text-gray-400 text-center py-8">Sin transacciones aún.</p>
  ) : (
  ```
  (En `useTransactions.ts`: agregar `const [error, setError] = useState(false);`, `setError(true)` en el `catch` junto al `console.error`, y devolver `error` en el objeto.)

- [ ] **Step 3: Build + lint**

Run: `npm run build` → Expected: OK (visual idéntico de estrellas: 24px, vacío `#D1FAE5`).
Run: `npm run lint` → Expected: sin errores.

- [ ] **Step 4: Checkpoint de review por diff** (sin commit).

---

### Task 8: Propuestas — `NuevaPage` y `RecibidasPage` (quitar `alert()`)

**Files:**
- Modify: `frontend/src/hooks/usePropuestas.ts` (agregar `useCrearPropuesta`)
- Modify: `frontend/src/pages/propuestas/NuevaPage.tsx`
- Modify: `frontend/src/pages/propuestas/RecibidasPage.tsx`

**Interfaces (Produces):** `useCrearPropuesta()` → `useMutation` que hace `POST /api/solicitudes-intercambio` e invalida `['propuestas']` + `['dashboard']` en `onSuccess`.

- [ ] **Step 1: Agregar `useCrearPropuesta` a `usePropuestas.ts`**

```tsx
export function useCrearPropuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      usuarioId: string;
      usuarioDestino: string;
      figuritaId: string;
      figuritasOfrecidas: string[];
      estado: string;
    }) => api.post('/api/solicitudes-intercambio', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['propuestas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

- [ ] **Step 2: Migrar `NuevaPage.tsx`** (offer list vía `useFiguritas`, submit vía `useCrearPropuesta`, validación/errores inline; eliminar 4 `alert()` + 3 `console.log`/`console.error`)

- Imports: agregar `useFiguritas` (`../../hooks/useFiguritas`) y `useCrearPropuesta` (`../../hooks/usePropuestas`); quitar `api`.
- Reemplazar el `useEffect`+fetch de `misFiguritas` por el hook + derivar prefill:
  ```tsx
  const { data: misFiguritas = [] } = useFiguritas(user?.username);
  const crearPropuesta = useCrearPropuesta();
  const [formError, setFormError] = useState<string | null>(null);

  // Prefill desde sugerencia: pre-tildar figuritas a ofrecer por base id.
  useEffect(() => {
    if (!offeredBaseIds || offeredBaseIds.length === 0 || misFiguritas.length === 0) return;
    const ids = misFiguritas.filter((f) => offeredBaseIds.includes(f.figuritaBaseId)).map((f) => f.id);
    if (ids.length > 0) {
      setFiguritasOfrecidas(ids);
      setExpandedMias(true);
    }
  }, [misFiguritas, offeredBaseIds]);
  ```
- Reescribir `handleSubmit` sin `alert()`/`console.*`:
  ```tsx
  const handleSubmit = () => {
    setFormError(null);
    if (figuritaDelLink?.ownerId === user?.id) {
      setFormError('No podés pedir tu propia figurita.');
      return;
    }
    if (!figuritaSeleccionada || figuritasOfrecidas.length === 0) {
      setFormError('Elegí una figurita que querés y al menos una que ofrecés.');
      return;
    }
    crearPropuesta.mutate(
      {
        usuarioId: user!.id,
        usuarioDestino: figuritaDelLink!.ownerId,
        figuritaId: figuritaSeleccionada,
        figuritasOfrecidas,
        estado: 'pendiente',
      },
      {
        onSuccess: () => navigate('/propuestas/enviadas'),
        onError: () => setFormError('No se pudo enviar la propuesta. Intentá de nuevo.'),
      },
    );
  };
  ```
- Renderizar el error inline encima del botón "Enviar Propuesta":
  ```tsx
  {formError && (
    <p className="mb-3 text-sm font-semibold text-center" style={{ color: '#D82D31' }}>{formError}</p>
  )}
  ```
- Deshabilitar el botón mientras envía: `disabled={crearPropuesta.isPending}` y texto `{crearPropuesta.isPending ? 'Enviando…' : 'Enviar Propuesta'}`.

- [ ] **Step 3: Migrar `RecibidasPage.tsx`** (quitar los 2 `alert()` de `onError`, usar el estado de error de la mutación)

```tsx
const handleAceptar = (propuestaId: string) => responder.mutate({ propuestaId, accion: 'aceptar' });
const handleRechazar = (propuestaId: string) => responder.mutate({ propuestaId, accion: 'rechazar' });
```
Y agregar, debajo del `<h2>` de la página, un banner de error de la mutación:
```tsx
{responder.isError && (
  <p className="mb-4 text-sm font-semibold" style={{ color: '#D82D31' }}>
    No se pudo procesar la propuesta. Intentá de nuevo.
  </p>
)}
```

- [ ] **Step 4: Build + lint**

Run: `npm run build` → Expected: OK.
Run: `npm run lint` → Expected: sin `alert`/`console.log` en estas páginas.

- [ ] **Step 5: Checkpoint de review por diff** (sin commit).

---

### Task 9: Intercambios + Dashboard — quitar los `alert()` restantes

**Files:**
- Modify: `frontend/src/pages/intercambios/IntercambiosPage.tsx`
- Modify: `frontend/src/pages/home/DashboardPage.tsx`

- [ ] **Step 1: `IntercambiosPage.tsx` — error de calificación inline**

- Agregar estado: `const [calificarError, setCalificarError] = useState<string | null>(null);`
- En `handleCalificar`, reemplazar `alert('Error al calificar. Intentá de nuevo.')` por `setCalificarError('No se pudo calificar. Intentá de nuevo.')`, y limpiar al inicio (`setCalificarError(null)` antes del `try`).
- Renderizar el error debajo de la fila de estrellas (dentro del bloque `!yaCalifique`, después del `<div className="flex items-center gap-1">…</div>`):
  ```tsx
  {calificarError && submittingId === null && (
    <p className="text-xs font-semibold mt-1" style={{ color: RED }}>{calificarError}</p>
  )}
  ```
  (Como el rating es por tarjeta, el mensaje aparece tras un intento fallido; se limpia al reintentar.)

- [ ] **Step 2: `DashboardPage.tsx` — banner de error en vez de `alert()`**

- Agregar estado: `const [accionError, setAccionError] = useState<string | null>(null);`
- En `responderMut.onError`, reemplazar `alert('No se pudo procesar la propuesta')` por `setAccionError('No se pudo procesar la propuesta.');` (conservar el revert optimista `queryClient.setQueryData(dashboardKey, ctx.prev)` y se puede dejar el `console.error(e)` como diagnóstico).
- En `onMutate` (o en `responder`), limpiar: `setAccionError(null)` al iniciar.
- Renderizar el banner cerca del header "Inicio" del render principal (después del `<div>` del título, antes de `<CollectionProgress/>`):
  ```tsx
  {accionError && (
    <p className="text-sm font-semibold" style={{ color: RED }}>{accionError}</p>
  )}
  ```

- [ ] **Step 3: Build + lint**

Run: `npm run build` → Expected: OK.
Run: `npm run lint` → Expected: 0 `alert(` en todo `src/` (verificar con: `npx eslint . ` y/o búsqueda).

- [ ] **Step 4: Checkpoint de review por diff** (sin commit).

---

### Task 10: Accesibilidad — `eslint-plugin-jsx-a11y` + asociación de labels

**Files:**
- Modify: `frontend/package.json` + `frontend/package-lock.json` (instalar devDep)
- Modify: `frontend/eslint.config.js`
- Modify: `frontend/src/pages/login/LoginPage.tsx`
- Modify: `frontend/src/pages/registro/RegisterPage.tsx`
- Modify: `frontend/src/pages/admin/AdminGiftPage.tsx`

- [ ] **Step 1: Instalar el plugin** (actualiza lockfile; el usuario lo revisará)

Run (desde `frontend/`): `npm install --save-dev eslint-plugin-jsx-a11y`

- [ ] **Step 2: Configurar `eslint.config.js`**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // A11y incremental: estas dos reglas de interacción quedan como warning
      // para no bloquear el lint; reescribir todos los div/span interactivos
      // excede el alcance de "pulido" de la Fase 3 y se difiere a una pasada futura.
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
  },
])
```

- [ ] **Step 3: Correr lint para ver los errores de `label-has-associated-control`**

Run: `npm run lint`
Expected: errores `jsx-a11y/label-has-associated-control` en LoginPage (2), RegisterPage (4), AdminGiftPage (1). (Si aparecen otros **errores** jsx-a11y no previstos, anotarlos y resolverlos con la mínima intervención semántica; las 2 reglas de interacción quedan como warnings y no fallan.)

- [ ] **Step 4: `LoginPage.tsx` — asociar labels** (líneas ~92/93 y ~106/107)

```tsx
<label htmlFor="login-username" className="...">Usuario</label>
<input id="login-username" type="text" ... />
...
<label htmlFor="login-password" className="...">Contraseña</label>
<input id="login-password" type="password" ... />
```

- [ ] **Step 5: `RegisterPage.tsx` — asociar labels** (4 campos: usuario, email, contraseña, confirmar)

`htmlFor`/`id`: `register-username`, `register-email`, `register-password`, `register-confirm` (cada `<label htmlFor>` con su `<input id>` correspondiente).

- [ ] **Step 6: `AdminGiftPage.tsx` — asociar label/select** (label línea ~181, select ~182)

```tsx
<label htmlFor="gift-figurita" className="...">Selecciona Figurita</label>
<select id="gift-figurita" ...>
```

- [ ] **Step 7: Lint + build**

Run: `npm run lint` → Expected: **0 errores** (solo warnings de las 2 reglas de interacción).
Run: `npm run build` → Expected: OK.

- [ ] **Step 8: Checkpoint de review por diff** (sin commit).

---

### Task 11: Accesibilidad — `aria-label` en botones-ícono, selects y filtros

**Files:**
- Modify: `frontend/src/pages/home/components/Carousel.tsx` (flechas, líneas ~18–26 y ~38–46)
- Modify: `frontend/src/pages/subastas/components/ConditionsBuilder.tsx` (selects, ~75 y ~118)
- Modify: `frontend/src/pages/coleccion/components/FiltrosFigurita.tsx` (4 inputs)
- Modify: `frontend/src/pages/buscar/BuscarPage.tsx` (5 inputs de filtro)

- [ ] **Step 1: `Carousel.tsx` — aria-label en flechas**

Botón izquierdo: agregar `aria-label="Anterior"`. Botón derecho: `aria-label="Siguiente"`.

- [ ] **Step 2: `ConditionsBuilder.tsx` — aria-label en selects**

Select de tipo (línea ~118): `aria-label="Tipo de condición"`. Select de país (línea ~75): `aria-label="País"`.

- [ ] **Step 3: `FiltrosFigurita.tsx` — aria-label por input** (solo tienen `placeholder`)

`aria-label` = el placeholder: "Buscar figurita", "Selección", "Equipo", "Categoria".

- [ ] **Step 4: `BuscarPage.tsx` — aria-label por input de filtro**

"Buscar figurita", "Número", "Selección", "Equipo", "Categoria".

- [ ] **Step 5: Lint + build**

Run: `npm run lint` → Expected: 0 errores.
Run: `npm run build` → Expected: OK.

- [ ] **Step 6: Checkpoint de review por diff** (sin commit).

---

### Task 12: `MainLayout` — DOM hover → Tailwind, conectar campana, `aria-label`

Un único task dueño de `MainLayout` (evita que varias tasks toquen el mismo archivo).

**Files:**
- Modify: `frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: NavLink del sidebar — quitar `onMouseEnter/Leave` (líneas ~99–100)**

Mover el hover de fondo (solo cuando no está activo) a la función `className` del `<NavLink>` (rama no-activa), con Tailwind, y **borrar** los handlers `onMouseEnter`/`onMouseLeave`:
```tsx
className={({ isActive }) =>
  `… clases base … ${isActive ? 'font-semibold …' : '… hover:bg-[rgba(255,255,255,0.08)]'}`
}
```
(Leer el `className` actual del NavLink y agregar `hover:bg-[rgba(255,255,255,0.08)]` a la rama no-activa; quitar la lógica imperativa.)

- [ ] **Step 2: Botón logout — color por Tailwind + `aria-label` (líneas ~140–151)**

- Quitar `style={{ color: 'rgba(255,255,255,0.7)' }}` y los `onMouseEnter/Leave`.
- Agregar a `className` las clases `text-white/70 hover:text-white`.
- Agregar `aria-label="Cerrar sesión"` (mantener `title` y `onClick={logout}`).

- [ ] **Step 3: Botón campana — conectar a `/notificaciones` + `aria-label` (líneas ~159–164)**

- `MainLayout` ya usa rutas/navegación; usar `useNavigate` (si no está importado, importarlo de `react-router-dom`) y agregar `onClick={() => navigate('/notificaciones')}`.
- Agregar `aria-label="Notificaciones"` (mantener `title="Notificaciones"`).

- [ ] **Step 4: Lint + build**

Run: `npm run lint` → Expected: 0 errores.
Run: `npm run build` → Expected: OK.
Verificación manual: hover de sidebar/logout sigue igual visualmente; click en la campana navega a Notificaciones.

- [ ] **Step 5: Checkpoint de review por diff** (sin commit).

---

### Task 13: DOM hover/focus → Tailwind en `SubastasPage` e `HistorialPage`

**Files:**
- Modify: `frontend/src/pages/subastas/SubastasPage.tsx` (tabs, líneas ~37–42)
- Modify: `frontend/src/pages/perfil/HistorialPage.tsx` (3 inputs, líneas ~93–94, ~104–105, ~115–116)

- [ ] **Step 1: `SubastasPage.tsx` — tab hover por Tailwind**

El `<span>` dentro del `<NavLink>` aplicaba fondo gris en hover solo si no estaba activo, vía `onMouseEnter/Leave`. Mover ese hover a la `className` (rama no-activa) del NavLink/span con `hover:bg-gray-100`, y **borrar** los handlers. Espejar el patrón correcto de `IntercambiosPage` (estado/Tailwind, no mutación imperativa).

- [ ] **Step 2: `HistorialPage.tsx` — focus border por Tailwind (3 inputs)**

Cada input tenía `onFocus`/`onBlur` que seteaba `borderColor` a `BLUE`/`#e5e7eb`. Reemplazar por clases Tailwind y borrar los handlers: agregar a cada input `className` con `border border-[#e5e7eb] focus:border-[#03BAE9] outline-none` (manteniendo el resto de clases existentes). Quitar el `onFocus`/`onBlur` imperativo.

- [ ] **Step 3: Lint + build**

Run: `npm run lint` → Expected: 0 errores.
Run: `npm run build` → Expected: OK.

- [ ] **Step 4: Checkpoint de review por diff** (sin commit).

---

### Task 14: Limpieza — borrar `mockAuctions.ts` muerto

**Files:**
- Delete: `frontend/src/data/mockAuctions.ts`

- [ ] **Step 1: Confirmar que no hay imports**

Run (desde `frontend/`): `npx eslint . ` o búsqueda de `mockAuctions` en `src/`.
Expected: 0 referencias (verificado: 131 líneas, 0 imports).

- [ ] **Step 2: Borrar el archivo** `frontend/src/data/mockAuctions.ts`.

- [ ] **Step 3: Build + tests**

Run: `npm run build` → Expected: OK.
Run: `npm test` → Expected: toda la suite en verde.

- [ ] **Step 4: Checkpoint de review por diff** (sin commit).

---

## Verificación final (criterios de aceptación del spec — Fase 3)

- [ ] **Error Boundary:** un throw simulado en una página muestra el fallback (`role="alert"` + "Reintentar"), no pantalla en blanco. (Cubierto por `ErrorBoundary.test.tsx` + Task 2.)
- [ ] **Manejo de errores consistente:** 0 `alert(` en `src/` (Tasks 5, 8, 9); `console.error` mudos de fetch reemplazados por `ErrorState`/feedback (Tasks 6, 7); componentes `ErrorState`/`EmptyState` reutilizables creados y adoptados.
- [ ] **`strict`:** `tsconfig.app.json` con `"strict": true`; `npm run build` pasa (Task 1).
- [ ] **Accesibilidad:** `eslint-plugin-jsx-a11y` agregado; `npm run lint` sin errores nuevos; `htmlFor`/`id` en Login/Register/AdminGift; `aria-label` en botones-ícono (logout, campana, flechas del Carousel), selects de ConditionsBuilder y filtros (Tasks 10, 11, 12).
- [ ] **DOM imperativo → Tailwind/estado:** MainLayout, SubastasPage, HistorialPage sin `e.currentTarget.style…` en handlers de hover/focus (Tasks 12, 13). (El `onError` de `Figurita.tsx` se conserva: es recuperación de imagen rota, no interacción.)
- [ ] **Limpieza:** `StarRating` compartido (Task 4); campana conectada a `/notificaciones` (Task 12); `mockAuctions.ts` borrado (Task 14). `MOCK_USERS` de `UserProfileModal` se mantiene (load-bearing, fuera de alcance).
- [ ] `npm run build` + `npm run lint` + `npm test` en verde al cerrar.

## Cobertura del spec (self-review)

| Ítem spec Fase 3 | Task(s) |
|---|---|
| Error Boundary global envolviendo RouterProvider + fallback/reintentar | Task 2 |
| `<ErrorState onRetry/>` y `<EmptyState/>` reutilizables | Task 3 (+ adopción 5,6,7,9) |
| Reemplazar `alert()` mudos por UI | Tasks 5, 8, 9 |
| Reemplazar `console.error` mudos por feedback | Tasks 6, 7 (+ migración a hooks RQ) |
| `tsconfig.app.json` `strict: true` | Task 1 |
| `eslint-plugin-jsx-a11y` | Task 10 |
| `htmlFor`/`id` en labels (Login/Register/Filtros) | Tasks 10 (labels) + 11 (filtros vía aria-label, ya que no tienen `<label>`) |
| `aria-label` botones-ícono (logout, campana) | Task 12 |
| `aria-pressed/aria-label` selects de BidForm/Carousel | Task 11 (Carousel flechas + selects de ConditionsBuilder; BidForm ya es accesible: checkbox `sr-only` dentro de `<label>`, sin cambios) |
| DOM mutation → Tailwind/estado (MainLayout, SubastasPage, HistorialPage) | Tasks 12, 13 |
| `StarRating` compartido | Task 4 |
| Conectar/quitar campana | Task 12 (conectar a `/notificaciones`) |
| `data/mockAuctions.ts` (muerto) | Task 14 |
| mocks de `UserProfileModal` | Revisado: `MOCK_USERS` es load-bearing → se mantiene (documentado) |

**Notas de testing (estrategia Fase 3):** tests de componentes para `ErrorBoundary`, `ErrorState`, `EmptyState`, `StarRating` (Tasks 2–4). Los hooks de datos nuevos son wrappers finos de `useQuery` y se verifican vía `tsc`/`build` + comportamiento de página (consistente con que los hooks de Fase 2 no tienen unit tests dedicados). Checks de a11y por labels/roles quedan cubiertos por el lint (`jsx-a11y`) más que por tests unitarios.
