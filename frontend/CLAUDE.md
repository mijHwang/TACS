# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc + Vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Auth & JWT

`src/auth/useAuth.tsx` exposes `{ isAuthenticated, user, loginWithToken, logout, updateUser }`.

- JWT stored in localStorage. Token decoded client-side: `sub` → user ID, `roles` array → if includes `'ADMIN'` then `user.role = 'admin'`, otherwise `'user'`.
- Axios interceptor in `src/services/api.ts` auto-injects `Authorization: Bearer {token}` on every request and redirects to `/login` on 401.

## Protected Routes

- `PrivateRoute` — requires auth; accepts optional `requiredRole="admin"` prop.
- `PublicRoute` — blocks authenticated users, redirects to `/dashboard`.
- All pages are lazy-loaded via `React.lazy()` — Suspense boundary is in `App.tsx`.

## Adding a New Page/Route

1. Create `src/pages/{feature}/{FeaturePage}.tsx` (default export, PascalCase filename).
2. In `src/router/router.tsx`, add `const Page = lazy(() => import('../pages/...'))` and the route object inside the `PrivateRoute` children.
3. If the feature needs API calls, create `src/services/{feature}Service.ts`.

## API Service Pattern

Two helpers in `src/services/api.ts`:

- `api` — Axios instance. Used in auth service (typed response via `res.data`).
- `apiFetch<T>(path, init?)` — fetch-based helper that returns parsed JSON. Used for all business entities.

Backend returns Spanish field names (`figurita`, `subasta`, `oferta`, `ofertas`, `estado`). Always map through the mapper functions in `api.ts` (`mapFigurita`, `mapSubasta`, `mapOferta`, `mapCondicion`) before using in components.

```ts
// Pattern for a new service
import { apiFetch } from './api';

export const thingService = {
  getAll: () => apiFetch<BackendThing[]>('/things'),
  create: (payload: CreatePayload) =>
    apiFetch<BackendThing>('/things', { method: 'POST', body: JSON.stringify(payload) }),
};
```

## UI Conventions

**Colors** (always inline `style={}`, never Tailwind utilities for accent colors):
```ts
const RED   = '#D82D31'; // primary / subastas
const BLUE  = '#03BAE9'; // info / búsqueda
const GREEN = '#05B15A'; // success / propuestas
```
Opacity backgrounds: append hex digits — `${RED}15` ≈ 8%, `${RED}30` ≈ 19%.

**Cards:** `rounded-2xl`, white bg, `border: 1.5px solid ${COLOR}30`, `hover:-translate-y-0.5`.

**Icons:** All SVG inline, no icon library, `strokeWidth="1.8"`.

**Modals:** Conditionally mounted (not CSS-hidden) to avoid stale state.

**Layout:** `MainLayout` provides fixed sidebar (w-60) + topbar (h-[52px]) + scrollable content area. Pages wrap content in `<div className="page-enter flex flex-col gap-6">`.

## Key Gotchas

**Mock data completely removed:** All flows (Profile, History, User Modal, and Auction Bidding) now hit the real API.
- Nested routes (Subastas, Colección, Propuestas) use `<Outlet />` in the parent page and `NavLink` tabs for sub-navigation.
- `VITE_API_URL` env var sets the backend base URL (defaults to `http://localhost:8080`).
