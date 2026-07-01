# Fase 2 — React Query (server-state cache) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps usan checkbox (`- [ ]`).

**Goal:** Introducir TanStack React Query como capa de caché de server-state para que volver a una pantalla ya visitada sea instantáneo (sin spinner/flash), con dedup e invalidación en mutaciones. Se hace por **rebanadas verticales** (un dominio por iteración); este plan cubre la **Iteración 1: infra + dominio Colección**.

**Architecture:** `QueryClient` único con `staleTime` razonable; `QueryClientProvider` envuelve la app. Cada dominio expone hooks (`useX`) que encapsulan `useQuery`/`useMutation`. Las páginas consumen los hooks en vez de `useEffect + fetch`.

**Tech Stack:** `@tanstack/react-query` v5 (compatible con React 19), Vite, TS, Vitest.

## Global Constraints
- **Commits:** no `git commit`/`push` sin OK explícito del usuario. Pasos de commit documentados pero pedir confirmación.
- **Dependencia nueva:** `@tanstack/react-query` (prod). Modifica `package.json` + `package-lock.json` (esperado).
- **Sin cambios de UI/estilos.** Comportamiento observable equivalente, salvo la mejora buscada (menos flashes al re-navegar).
- Comandos desde `frontend/`. Gates: `npm run lint`, `npm run build`, `npm test`.

---

### Task 2.1 — Infra: React Query + QueryClientProvider

**Files:**
- Modify: `frontend/package.json` (dep) — vía `npm install`
- Create: `frontend/src/lib/queryClient.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `queryClient` (export default) desde `src/lib/queryClient.ts`.

- [ ] **Step 1: Instalar la dependencia**

Run (desde `frontend/`): `npm install @tanstack/react-query`
Expected: agrega `@tanstack/react-query` a `dependencies` y actualiza el lock.

- [ ] **Step 2: Crear el QueryClient compartido**

```ts
// frontend/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s: stale-while-revalidate, evita refetch al re-navegar
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
```

- [ ] **Step 3: Envolver la app con QueryClientProvider**

En `frontend/src/App.tsx`, envolver el `<Suspense>` con el provider:
```tsx
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import router from './router/router';
import queryClient from './lib/queryClient';

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
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `npm run build && npm test`
Expected: build OK; los 37 tests siguen verdes (nada consume RQ aún, pero el provider debe montar sin romper).

- [ ] **Step 5: Commit** (pedir OK)
```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/queryClient.ts frontend/src/App.tsx
git commit -m "feat(front): infra React Query (QueryClientProvider + queryClient)"
```

---

### Task 2.2 — Dominio Colección con useQuery

**Objetivo:** migrar `TodasPage` (y, si comparten endpoint, sus hermanas) a un hook `useFiguritas(username)` basado en `useQuery`, demostrando caché + dedup: navegar fuera y volver no re-fetchea si el dato está fresco.

> El código exacto de este task se completa tras leer `TodasPage.tsx` y su patrón de fetch (se llena en la ejecución, antes de despachar). Patrón:
```ts
// src/hooks/useFiguritas.ts
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useFiguritas(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', username],
    queryFn: async () => (await api.get(`/api/usuarios/${username}/figuritas`)).data,
    enabled: !!username,
  });
}
```
La página reemplaza su `useState(data)/useState(loading)/useEffect(fetch)` por `const { data = [], isLoading } = useFiguritas(user?.username)`.

**Criterio de aceptación:** `TodasPage` muestra figuritas igual que antes; navegar a otra sección y volver dentro de `staleTime` no muestra spinner (data cacheada). `npm run build`/`test`/`lint` verdes.

---

## Iteraciones siguientes (fuera de este plan)
Cada dominio = su propia iteración con el mismo patrón: Subastas (list + `useMutation` de oferta con `invalidateQueries`), Propuestas (recibidas/enviadas + aceptar/rechazar), Dashboard (`useQuery` por sección), Buscar, Notificaciones. Se planifican al abordarlas.
