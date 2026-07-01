# Front: evitar full reload (Fase 0 + Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el full-reload del documento durante la sesión (la barra lateral nunca se desmonta) y endurecer la correctness de React, cubriendo la Fase 0 (lint/correctness) y la Fase 1 (flujo 401/logout SPA + rutas) del [spec](../specs/2026-06-29-front-evitar-full-reload-design.md).

**Architecture:** El interceptor 401 deja de hacer `window.location.href` y pasa a **notificar** (callback `onUnauthorized`) que `AuthProvider` traduce en `logout()`; como `isAuthenticated` cae a `false`, `PrivateRoute` redirige declarativamente con `<Navigate>` — sin recargar. `AuthProvider` vive **fuera** del `RouterProvider`, así que la redirección NO puede ser `useNavigate()`: tiene que ser declarativa. Fase 0 son arreglos de lint/correctness sin cambio de comportamiento; Fase 1 es el rework de auth/rutas.

**Tech Stack:** React 19, TypeScript 6, React Router 6 (`createBrowserRouter`), Axios, Vitest + React Testing Library, ESLint (`eslint-plugin-react-hooks` v6).

## Global Constraints

- **Commits:** el usuario pidió NO ejecutar `git commit` ni `git push` sin autorización explícita en el turno. Los pasos `git commit` están documentados como parte del flujo; pedir OK antes de ejecutarlos (o agrupar y confirmar al final). Nunca `push`.
- **Comandos:** se corren desde `frontend/`. Lint: `npm run lint`. Build: `npm run build` (corre `tsc` + Vite). Tests: `npm test` (Vitest).
- **Sin cambios de UI/estilos** en estas fases (paleta, layout y copy se mantienen).
- **Convenciones del repo:** páginas con default export PascalCase; colores accent inline (`RED='#D82D31'`, `BLUE='#03BAE9'`, `GREEN='#05B15A'`); SVG inline `strokeWidth="1.8"`.
- **Verificación por defecto de cada task:** `npm run lint` no introduce errores nuevos y `npm run build` pasa. Para refactors de lint, el linter ES el gate (no se exige un unit test nuevo salvo donde se indica).

---

## FASE 0 — Correctness & lint

> Estado inicial verificado: `npm run lint` reporta **44 errores + 3 warnings**. Al final de Fase 0 deben desaparecer `react-hooks/set-state-in-render`, `react-hooks/purity`, `react-hooks/set-state-in-effect`, `@typescript-eslint/no-explicit-any` y `@typescript-eslint/no-unused-vars`. Quedan pendientes a propósito: los `exhaustive-deps`/`only-export-components` de `useAuth.tsx` y `router.tsx` (los resuelve Fase 1 / cleanup opcional).

### Task 0.1: Helper `getApiErrorMessage` + uso en subastas

Centraliza la extracción del mensaje de error de Axios (hoy duplicada con `err: any`) en un helper tipado. Quita 2 `any` (`ActivasPage:89`, `ParticipandoPage:90`).

**Files:**
- Create: `frontend/src/services/errors.ts`
- Create: `frontend/src/services/errors.test.ts`
- Modify: `frontend/src/pages/subastas/ActivasPage.tsx:89-93`
- Modify: `frontend/src/pages/subastas/ParticipandoPage.tsx:90-93`

**Interfaces:**
- Produces: `getApiErrorMessage(err: unknown, fallback: string): string`

- [ ] **Step 1: Escribir el test que falla**

```ts
// frontend/src/services/errors.test.ts
import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getApiErrorMessage } from './errors';

describe('getApiErrorMessage', () => {
  it('devuelve el message del response cuando es un AxiosError', () => {
    const err = new AxiosError('req failed');
    err.response = { data: { message: 'Oferta inválida' } } as never;
    expect(getApiErrorMessage(err, 'fallback')).toBe('Oferta inválida');
  });

  it('devuelve el fallback cuando no hay message', () => {
    expect(getApiErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
```

- [ ] **Step 2: Correr el test y verque falla**

Run: `npm test -- errors`
Expected: FAIL (`Cannot find module './errors'`).

- [ ] **Step 3: Implementar el helper**

```ts
// frontend/src/services/errors.ts
import { AxiosError } from 'axios';

/** Extrae el mensaje de error del backend (Spring) de forma segura, sin `any`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}
```

- [ ] **Step 4: Usar el helper en ActivasPage y ParticipandoPage**

En `frontend/src/pages/subastas/ActivasPage.tsx`, agregar el import y reemplazar el `catch`:

```tsx
// import nuevo (junto a los otros imports)
import { getApiErrorMessage } from '../../services/errors';
```
```tsx
    } catch (err: unknown) {
      console.error('Error placing bid:', err);
      alert(getApiErrorMessage(err, 'Error al enviar la oferta.'));
    } finally {
      setSubmitting(false);
    }
```

Aplicar el mismo cambio idéntico en `frontend/src/pages/subastas/ParticipandoPage.tsx` (import + el mismo `catch` en `handleBid`).

- [ ] **Step 5: Verificar lint + build + test**

Run: `npm test -- errors && npm run lint && npm run build`
Expected: tests PASS; lint ya no reporta `no-explicit-any` en `ActivasPage.tsx` ni `ParticipandoPage.tsx`; build OK.

- [ ] **Step 6: Commit** (pedir OK primero)

```bash
git add frontend/src/services/errors.ts frontend/src/services/errors.test.ts frontend/src/pages/subastas/ActivasPage.tsx frontend/src/pages/subastas/ParticipandoPage.tsx
git commit -m "refactor(front): helper getApiErrorMessage tipado, quita any en bidding"
```

---

### Task 0.2: Quitar los `any` restantes + `no-unused-vars`

**Files:**
- Modify: `frontend/src/services/auctionService.ts:5`
- Modify: `frontend/src/pages/subastas/components/AuctionDetailModal.tsx:29`
- Modify: `frontend/src/pages/subastas/components/ConditionsBuilder.tsx:13,35,119`
- Modify: `frontend/src/pages/propuestas/RecibidasPage.tsx:50`

**Interfaces:**
- Consumes: tipo `Sticker` y `AuctionCondition` de `frontend/src/types/auction.ts`; tipo `SolicitudDeIntercambio` ya definido en `RecibidasPage.tsx`.

- [ ] **Step 1: `auctionService.ts` — tipar `mapFiguritaToSticker`**

Reemplazar la firma `figurita: any` por la forma concreta que usa:

```ts
function mapFiguritaToSticker(figurita: {
  id: string; numero: number; jugadorNombre: string; seleccionNombre: string;
}): Sticker {
  return {
    id: figurita.id,
    number: figurita.numero,
    playerName: figurita.jugadorNombre,
    country: figurita.seleccionNombre,
  };
}
```

- [ ] **Step 2: `AuctionDetailModal.tsx` — `myStickers: Sticker[]`**

Agregar el import de tipo y cambiar la prop:

```tsx
import type { Sticker } from '../../../types/auction';
```
```tsx
interface AuctionDetailModalProps {
  auction: SubastaResponseDTO;
  myStickers: Sticker[];
  onClose: () => void;
  onBid: (auctionId: string, stickerIds: string[]) => void;
  isSubmitting?: boolean;
  isFetchingStickers?: boolean;
}
```

- [ ] **Step 3: `ConditionsBuilder.tsx` — tipar las 3 ocurrencias**

```tsx
const CONDITION_TYPES: { type: AuctionCondition['type']; label: string }[] = [
```
```tsx
  const [type, setType] = useState<AuctionCondition['type']>('min_stickers');
```
```tsx
          value={type} onChange={(e) => setType(e.target.value as AuctionCondition['type'])}
```

- [ ] **Step 4: `RecibidasPage.tsx` — tipar el `reduce`**

```tsx
        const initialState = (res.data as SolicitudDeIntercambio[]).reduce(
          (acc: Record<string, string>, prop: SolicitudDeIntercambio) => ({
            ...acc,
            [prop.id]: prop.estado,
          }),
          {} as Record<string, string>,
        );
```

- [ ] **Step 5: Localizar y eliminar el `no-unused-vars`**

Run: `npm run lint 2>&1 | grep -B3 no-unused-vars`
Acción: en el archivo/línea reportado, eliminar la variable/import sin uso (no comentarla).

- [ ] **Step 6: Verificar**

Run: `npm run lint && npm run build`
Expected: `npm run lint` ya no reporta `@typescript-eslint/no-explicit-any` ni `@typescript-eslint/no-unused-vars` en ningún archivo; build OK.

- [ ] **Step 7: Commit** (pedir OK primero)

```bash
git add -A frontend/src
git commit -m "refactor(front): elimina usos de any y variable sin uso (type-safety)"
```

---

### Task 0.3: Arreglar `exhaustive-deps` en propuestas

`EnviadasPage` tiene deps `[]` leyendo `user` → muestra datos del usuario anterior tras un cambio de sesión (stale closure). `NuevaPage` (propuestas) tapa el deps faltante con un `eslint-disable`.

**Files:**
- Modify: `frontend/src/pages/propuestas/EnviadasPage.tsx:47-59`
- Modify: `frontend/src/pages/propuestas/NuevaPage.tsx:73-97`

- [ ] **Step 1: `EnviadasPage.tsx` — deps correctas**

Cambiar la línea de cierre del `useEffect`:

```tsx
  }, [user?.id]);
```

(la línea hoy es `}, []);` en `EnviadasPage.tsx:59`).

- [ ] **Step 2: `NuevaPage.tsx` — incluir `offeredBaseIds`, quitar el disable**

Reemplazar el cierre del `useEffect` (líneas 96-97):

```tsx
  }, [user?.username, offeredBaseIds]);
```

Eliminar el comentario `// eslint-disable-next-line react-hooks/exhaustive-deps` de la línea 96.

- [ ] **Step 3: Verificar lint**

Run: `npm run lint 2>&1 | grep exhaustive-deps`
Expected: no aparecen `EnviadasPage.tsx` ni `NuevaPage.tsx` (puede seguir apareciendo `useAuth.tsx` — lo resuelve Fase 1).

- [ ] **Step 4: Verificación manual rápida**

Run: `npm run dev` → loguearse, ver "Propuestas · Enviadas", desloguear, loguear con otro usuario, volver a "Enviadas": la lista corresponde al usuario actual (no quedan datos del anterior).

- [ ] **Step 5: Commit** (pedir OK primero)

```bash
git add frontend/src/pages/propuestas/EnviadasPage.tsx frontend/src/pages/propuestas/NuevaPage.tsx
git commit -m "fix(front): exhaustive-deps en propuestas (evita stale closure entre sesiones)"
```

---

### Task 0.4: Arreglar `set-state-in-effect` (5 páginas)

Patrón actual (anti-rule): `useState(true)` + guard que llama `setLoading(false)` síncronamente dentro del efecto. Fix: inicializar `loading` derivado de si hay usuario a consultar, y que el guard sólo haga `return` (los `setState` quedan sólo en los callbacks async `.then/.catch/.finally`, que la regla no marca).

**Files:**
- Modify: `frontend/src/pages/subastas/ActivasPage.tsx:35,43-47`
- Modify: `frontend/src/pages/subastas/MiasPage.tsx:38,44-48`
- Modify: `frontend/src/pages/subastas/ParticipandoPage.tsx:36,44-48`
- Modify: `frontend/src/pages/subastas/NuevaPage.tsx:15,21-23`
- Modify: `frontend/src/pages/intercambios/IntercambiosPage.tsx:25,30-34`

- [ ] **Step 1: ActivasPage / MiasPage / ParticipandoPage (mismo patrón, deps `[user?.id]`)**

En cada uno, cambiar la inicialización:

```tsx
  const [loading, setLoading] = useState(Boolean(user?.id));
```

y el guard del efecto:

```tsx
  useEffect(() => {
    if (!user?.id) return;

    // ...la llamada api.get(...).then(...).catch(...).finally(() => setLoading(false)) queda igual...
  }, [user?.id]);
```

(elimina las líneas `setLoading(false);` del guard `if (!user?.id) { ... }`).

- [ ] **Step 2: subastas/NuevaPage (guard por `username`)**

```tsx
  const [loading, setLoading] = useState(Boolean(user?.username));
```
```tsx
  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/figuritas/repetidas`)
      // ...resto igual...
  }, [user?.username]);
```

- [ ] **Step 3: IntercambiosPage (guard compuesto)**

```tsx
  const [loading, setLoading] = useState(Boolean(user?.id && user.id !== user.username));
```
```tsx
  useEffect(() => {
    if (!user?.id || user.id === user.username) return;
    api.get(`/api/intercambios/usuario/${user.id}`)
      // ...resto igual...
  }, [user?.id, user?.username]);
```

- [ ] **Step 4: Verificar lint + build**

Run: `npm run lint 2>&1 | grep set-state-in-effect`
Expected: sin resultados (0 ocurrencias). Luego `npm run build` OK.

> Fallback si alguna sigue marcada: mover el `setLoading(false)` del guard a no existir (ya hecho) suele bastar. Si persiste, envolver la lógica del efecto en una función async interna y llamarla, dejando el cuerpo del efecto sin `setState` síncrono.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev` → entrar a Subastas (Activas/Mías/Participando), Nueva subasta e Intercambios: cargan igual que antes (spinner mientras fetch, luego datos/empty).

- [ ] **Step 6: Commit** (pedir OK primero)

```bash
git add frontend/src/pages/subastas/ActivasPage.tsx frontend/src/pages/subastas/MiasPage.tsx frontend/src/pages/subastas/ParticipandoPage.tsx frontend/src/pages/subastas/NuevaPage.tsx frontend/src/pages/intercambios/IntercambiosPage.tsx
git commit -m "fix(front): loading inicial derivado, elimina set-state-in-effect"
```

---

### Task 0.5: `set-state-in-render` (HistorialPage) + `purity` (CreateAuctionForm)

**Files:**
- Modify: `frontend/src/pages/perfil/HistorialPage.tsx:1,28-37`
- Modify: `frontend/src/pages/subastas/components/CreateAuctionForm.tsx:1,129-143`

- [ ] **Step 1: HistorialPage — sacar `setPage(1)` del `useMemo`**

Importar `useEffect`:

```tsx
import { useState, useMemo, useEffect } from 'react';
```

Quitar `setPage(1);` del `useMemo` y agregar un efecto que resetee la página al cambiar filtros:

```tsx
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = search.trim() === '' ||
        tx.stickers.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchDesde = desde === '' || tx.isoDate >= desde;
      const matchHasta = hasta === '' || tx.isoDate <= hasta;
      return matchSearch && matchDesde && matchHasta;
    });
  }, [search, desde, hasta, transactions]);

  useEffect(() => { setPage(1); }, [search, desde, hasta]);
```

- [ ] **Step 2: CreateAuctionForm — sacar `Date.now()` del render**

Importar `useEffect`:

```tsx
import { useState, useEffect } from 'react';
```

Agregar un estado `previewNow` que se actualiza por efecto (no en render) y usarlo en la preview:

```tsx
  const [conditions, setConditions] = useState<AuctionCondition[]>([]);
  const [previewNow, setPreviewNow] = useState(0);

  useEffect(() => {
    setPreviewNow(Date.now());
  }, [selectedSticker, duration]);
```

Y en el bloque de preview reemplazar la línea con `Date.now()`:

```tsx
          {selectedSticker && previewNow > 0 && (() => {
            const s = myStickers.find((st) => st.id === selectedSticker)!;
            const end = new Date(previewNow + duration * 3600 * 1000);
            return (
              // ...el resto del JSX de la preview queda igual...
```

- [ ] **Step 3: Verificar lint + build**

Run: `npm run lint 2>&1 | grep -E "set-state-in-render|purity"`
Expected: sin resultados. Luego `npm run build` OK.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev` → Historial: tipear en el filtro vuelve a página 1; paginación funciona. Nueva subasta: al elegir figurita/duración, la "Vista previa" muestra "Finaliza: …" con fecha coherente.

- [ ] **Step 5: Commit** (pedir OK primero)

```bash
git add frontend/src/pages/perfil/HistorialPage.tsx frontend/src/pages/subastas/components/CreateAuctionForm.tsx
git commit -m "fix(front): elimina setState-en-render (Historial) y Date.now en render (CreateAuctionForm)"
```

---

## FASE 1 — 401/logout SPA + rutas

> Cierra Trello #22. Al final: ningún 401 ni logout recarga el documento; la sidebar permanece montada; tras login se vuelve a la ruta original; user↔admin no re-monta `MainLayout`.

### Task 1.1: Utilidades de token robustas (`token.ts`)

Separa la decodificación del JWT a su propio módulo, valida estructura y agrega `isTokenExpired` (para detección proactiva opcional). De paso elimina un `react-refresh/only-export-components` de `useAuth.tsx` (la función helper sale del archivo del componente).

**Files:**
- Create: `frontend/src/auth/token.ts`
- Create: `frontend/src/auth/token.test.ts`

**Interfaces:**
- Produces:
  - `decodeToken(token: string): { sub: string; roles: string[] } | null`
  - `isTokenExpired(token: string): boolean`

- [ ] **Step 1: Test que falla**

```ts
// frontend/src/auth/token.test.ts
import { describe, it, expect } from 'vitest';
import { decodeToken, isTokenExpired } from './token';

// helper: arma un JWT no firmado con el payload dado (base64url)
function makeToken(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

describe('decodeToken', () => {
  it('extrae sub y roles de un token válido', () => {
    const t = makeToken({ sub: 'ana', roles: ['ROLE_ADMIN'] });
    expect(decodeToken(t)).toEqual({ sub: 'ana', roles: ['ROLE_ADMIN'] });
  });
  it('devuelve null ante un token corrupto', () => {
    expect(decodeToken('no-es-un-jwt')).toBeNull();
    expect(decodeToken('a.b')).toBeNull();
  });
  it('roles default a [] si falta', () => {
    expect(decodeToken(makeToken({ sub: 'x' }))).toEqual({ sub: 'x', roles: [] });
  });
});

describe('isTokenExpired', () => {
  it('true si exp ya pasó', () => {
    expect(isTokenExpired(makeToken({ sub: 'x', exp: 1 }))).toBe(true);
  });
  it('false si exp es futuro lejano', () => {
    expect(isTokenExpired(makeToken({ sub: 'x', exp: 4102444800 }))).toBe(false);
  });
  it('false (no bloquea) si no hay exp o el token es inválido', () => {
    expect(isTokenExpired(makeToken({ sub: 'x' }))).toBe(false);
    expect(isTokenExpired('basura')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- token`
Expected: FAIL (`Cannot find module './token'`).

- [ ] **Step 3: Implementar**

```ts
// frontend/src/auth/token.ts
interface JwtPayload {
  sub: string;
  roles?: string[];
  exp?: number;
}

function readPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as JwtPayload;
    if (typeof payload?.sub !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): { sub: string; roles: string[] } | null {
  const payload = readPayload(token);
  if (!payload) return null;
  return { sub: payload.sub, roles: payload.roles ?? [] };
}

/** true sólo si el token trae `exp` y ya venció. Token inválido o sin exp ⇒ false (no bloquea). */
export function isTokenExpired(token: string): boolean {
  const payload = readPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}
```

- [ ] **Step 4: Verde**

Run: `npm test -- token`
Expected: PASS (todos).

- [ ] **Step 5: Commit** (pedir OK primero)

```bash
git add frontend/src/auth/token.ts frontend/src/auth/token.test.ts
git commit -m "feat(front): util token.ts (decodeToken robusto + isTokenExpired)"
```

---

### Task 1.2: 401 desacoplado en la capa API (`onUnauthorized`)

El interceptor de Axios y `apiFetch` dejan de redirigir con `window.location` y pasan a invocar un handler registrable. Unifica la política de 401 entre los dos clientes HTTP.

**Files:**
- Modify: `frontend/src/services/api.ts:18-27` (interceptor) y `:147-160` (`apiFetch`)
- Create: `frontend/src/services/api.unauthorized.test.ts`

**Interfaces:**
- Produces: `setUnauthorizedHandler(fn: (() => void) | null): void` exportado desde `services/api.ts`. Al recibir 401, la capa API hace `localStorage.removeItem('token')` y llama al handler (si hay).

- [ ] **Step 1: Test que falla (wiring del interceptor)**

```ts
// frontend/src/services/api.unauthorized.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { setUnauthorizedHandler } from './api';
import MockAdapter from 'axios-mock-adapter';

describe('manejo de 401 en axios', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(api); localStorage.setItem('token', 'x'); });

  it('ante 401 limpia el token y llama al handler, sin tocar window.location', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mock.onGet('/api/whatever').reply(401);

    await api.get('/api/whatever').catch(() => {});

    expect(handler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    setUnauthorizedHandler(null);
  });
});
```

> Nota: requiere `axios-mock-adapter` como devDependency. Instalar: `npm i -D axios-mock-adapter`.

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- api.unauthorized`
Expected: FAIL (`setUnauthorizedHandler` no existe).

- [ ] **Step 3: Implementar en `api.ts`**

Reemplazar el interceptor de respuesta y exportar el setter. Cabecera del archivo (después de crear `api`):

```ts
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  onUnauthorized?.();
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);
```

Y en `apiFetch`, antes de lanzar por `!res.ok`, contemplar el 401:

```ts
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`API 401: ${path}`);
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
```

- [ ] **Step 4: Verde**

Run: `npm test -- api.unauthorized`
Expected: PASS.

- [ ] **Step 5: Verificar que no quedó `window.location`**

Run: `npm run lint && npm run build`
Expected: OK. (Grep de control: `git grep -n "window.location" frontend/src` no debe devolver el interceptor.)

- [ ] **Step 6: Commit** (pedir OK primero)

```bash
git add frontend/src/services/api.ts frontend/src/services/api.unauthorized.test.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(front): 401 desacoplado via onUnauthorized (axios + apiFetch), sin window.location"
```

---

### Task 1.3: AuthProvider — registrar handler, logout declarativo, memoización

`AuthProvider` registra `logout` como handler de 401; usa `token.ts`; memoiza el `value` y estabiliza funciones con `useCallback`; arregla su `exhaustive-deps`; deduplica el fetch de usuario. La redirección la hace `PrivateRoute` al caer `isAuthenticated` (declarativa, porque el provider está fuera del Router).

**Files:**
- Modify: `frontend/src/auth/useAuth.tsx` (completo)

**Interfaces:**
- Consumes: `decodeToken`, `isTokenExpired` de `./token`; `setUnauthorizedHandler` de `../services/api`.
- Produces: API de contexto sin cambios — `{ isAuthenticated, user, loginWithToken, logout, updateUser }`.

- [ ] **Step 1: Reescribir `AuthProvider`**

```tsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import api, { setUnauthorizedHandler } from '../services/api';
import { decodeToken, isTokenExpired } from './token';

export interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loginWithToken: (token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<Pick<User, 'username' | 'email' | 'avatar'>>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function userFromToken(token: string): User | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  const role = decoded.roles.some((r) => r.includes('ADMIN')) ? 'admin' : 'user';
  return { id: decoded.sub, username: decoded.sub, email: '', role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem('token');
      return null;
    }
    return userFromToken(token);
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    localStorage.setItem('token', token);
    const base = userFromToken(token);
    if (!base) { logout(); return; }
    setUser(base);
    try {
      const res = await api.get(`/api/usuarios/by-username/${base.username}`);
      setUser({ id: res.data.id, username: res.data.username, email: res.data.email, role: base.role });
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }, [logout]);

  const updateUser = useCallback(
    (data: Partial<Pick<User, 'username' | 'email' | 'avatar'>>) =>
      setUser((prev) => (prev ? { ...prev, ...data } : prev)),
    [],
  );

  // Registrar el handler de 401: un 401 ⇒ logout ⇒ PrivateRoute redirige (sin reload).
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Hidratar datos completos del usuario una sola vez al montar si ya había sesión.
  useEffect(() => {
    const username = user?.username;
    if (!username) return;
    let cancelled = false;
    api.get(`/api/usuarios/by-username/${username}`)
      .then((res) => {
        if (cancelled) return;
        setUser((prev) => (prev ? { id: res.data.id, username: res.data.username, email: res.data.email, role: prev.role } : prev));
      })
      .catch((error) => console.error('Failed to fetch user:', error));
    return () => { cancelled = true; };
    // sólo al montar: hidrata la sesión persistida; loginWithToken ya hidrata en el login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: !!user, user, loginWithToken, logout, updateUser }),
    [user, loginWithToken, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

> Decisión documentada: el efecto de hidratación inicial conserva `[]` con un `eslint-disable` **acotado y justificado** (corre una sola vez para la sesión ya persistida; `loginWithToken` cubre el caso del login). Es intencional y distinto del anti-patrón que Fase 0 corrige.

- [ ] **Step 2: Verificar lint + build + tests existentes**

Run: `npm run lint && npm run build && npm test`
Expected: lint sin `exhaustive-deps` no justificados ni `only-export-components` por `decodeToken` (ya salió a `token.ts`); build OK; tests verdes.

- [ ] **Step 3: Verificación manual (núcleo de la tarjeta)**

Run: `npm run dev`, loguearse y navegar a una sección. En DevTools → Application, borrar el `token` de localStorage y disparar una acción que pegue a la API (o esperar un 401). **Esperado:** redirige a `/login` SIN recarga del documento (sin flash blanco), la barra lateral no parpadea y la pestaña no recarga. Probar el botón de logout: mismo comportamiento.

- [ ] **Step 4: Commit** (pedir OK primero)

```bash
git add frontend/src/auth/useAuth.tsx
git commit -m "refactor(front): AuthProvider declarativo (401⇒logout), memoización y dedupe de fetch"
```

---

### Task 1.4: LoginPage respeta `state.from`

**Files:**
- Modify: `frontend/src/pages/login/LoginPage.tsx:2,11,30`

- [ ] **Step 1: Leer `state.from` y usarlo al navegar**

Agregar `useLocation` al import:

```tsx
import { useNavigate, useLocation, Link } from 'react-router-dom';
```

En el componente:

```tsx
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
```

Y en `handleSubmit`, tras `loginWithToken(token)`:

```tsx
        loginWithToken(token);
        navigate(from, { replace: true });
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`. Sin sesión, navegar directo a `/subastas` → redirige a `/login`; tras loguearse, vuelve a `/subastas` (no a `/dashboard`).

- [ ] **Step 4: Commit** (pedir OK primero)

```bash
git add frontend/src/pages/login/LoginPage.tsx
git commit -m "feat(front): login respeta la ruta original (state.from)"
```

---

### Task 1.5: Consolidar rutas admin bajo un único `MainLayout`

Hoy `router.tsx` monta `<MainLayout>` en dos subárboles distintos (user y admin) → pasar de zona user a `/admin` re-monta `MainLayout`. Unificar para que sea una sola instancia.

**Files:**
- Modify: `frontend/src/router/router.tsx:55-122`

- [ ] **Step 1: Reemplazar los dos bloques de rutas protegidas por uno solo**

Dejar un único bloque `PrivateRoute → MainLayout` con las rutas admin anidadas y protegidas por un `PrivateRoute requiredRole="admin"` interno:

```tsx
  // Rutas protegidas — cualquier usuario autenticado
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'buscar', element: <BuscarPage /> },
          { path: 'sugerencias', element: <SugerenciasPage /> },
          { path: 'intercambios', element: <IntercambiosPage /> },
          { path: 'notificaciones', element: <NotificacionesPage /> },
          { path: 'perfil', element: <PerfilPage /> },
          { path: 'perfil/historial', element: <HistorialPage /> },

          // Colección
          {
            path: 'coleccion',
            element: <ColeccionPage />,
            children: [
              { index: true, element: <TodasPage /> },
              { path: 'repetidas', element: <RepetidasPage /> },
              { path: 'faltantes', element: <FaltantesPage /> },
            ],
          },

          // Propuestas
          {
            path: 'propuestas',
            element: <PropuestasPage />,
            children: [
              { path: 'nueva', element: <PropNuevaPage /> },
              { path: 'recibidas', element: <PropRecibidasPage /> },
              { path: 'enviadas', element: <PropEnviadasPage /> },
            ],
          },

          // Subastas
          {
            path: 'subastas',
            element: <SubastasPage />,
            children: [
              { index: true, element: <Navigate to="activas" replace /> },
              { path: 'nueva', element: <SubNuevaPage /> },
              { path: 'activas', element: <SubActivasPage /> },
              { path: 'mias', element: <SubMiasPage /> },
              { path: 'participando', element: <SubParticipandoPage /> },
            ],
          },

          // Admin — sólo rol "admin", dentro del mismo MainLayout
          {
            element: <PrivateRoute requiredRole="admin" />,
            children: [
              { path: 'admin', element: <AdminPage /> },
              { path: 'admin/gift', element: <AdminGiftPage /> },
            ],
          },
        ],
      },
    ],
  },
```

(eliminar el segundo bloque `{ element: <PrivateRoute requiredRole="admin" />, children: [{ element: <MainLayout/> … }] }`).

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Verificación manual (rol + no-remount)**

Run: `npm run dev`.
- Como **usuario normal**: `/admin` redirige a `/dashboard` (el guard sigue activo).
- Como **admin**: navegar `/dashboard` → `/admin` → `/dashboard`. La sidebar no parpadea. Verificación opcional de no-remount: agregar temporalmente `console.count('MainLayout mount')` en un `useEffect(() => {...}, [])` de `MainLayout`; debe contar **1** al moverse entre user y admin. Quitar el log antes de commitear.

- [ ] **Step 4: Commit** (pedir OK primero)

```bash
git add frontend/src/router/router.tsx
git commit -m "refactor(front): un único MainLayout (admin anidado) — la sidebar no se re-monta"
```

---

## Self-Review (cobertura del spec)

- **Fase 0 del spec** (reglas de hooks + `any`): Tasks 0.1–0.5 cubren `set-state-in-render`, `purity`, `set-state-in-effect` ×5, `exhaustive-deps` (propuestas), `no-explicit-any` ×9, `no-unused-vars`. El `exhaustive-deps` de `useAuth.tsx` se resuelve en Task 1.3 (intencional). Los `only-export-components` (router.tsx) quedan como cleanup opcional fuera de estas fases (declarado en el spec).
- **Fase 1 del spec** (401 SPA, logout, unificación Axios/fetch, `state.from`, layout admin, exp opcional): Tasks 1.1–1.5; `isTokenExpired` (1.1) + chequeo al montar (1.3) cubren la detección proactiva opcional.
- **Restricción AuthProvider-fuera-del-Router:** respetada — redirección 100% declarativa vía `PrivateRoute` (Tasks 1.2/1.3).
- **Fases 2 (React Query) y 3 (Error Boundary/a11y/strict):** fuera de este plan; tendrán su propio plan cuando se aborden.

## Execution Handoff

Ver sección final de la conversación para elegir modo de ejecución.
