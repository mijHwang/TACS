# Diseño — Corregir Front para evitar full reload (la barra lateral debe mantenerse)

- **Tarjeta Trello:** [#22 — Corregir Front para evitar full reload, la barra lateral debe mantenerse](https://trello.com/c/LyyDYjzU/22-corregir-front-para-evitar-full-reload-la-barra-lateral-debe-mantenerse)
- **Fecha:** 2026-06-29
- **Alcance acordado:** Plan por fases (Fase 0 → 3), independientes y mergeables de a una.
- **Decisión de caché (Fase 2):** TanStack **React Query** v5.

## 1. Contexto y diagnóstico

El frontend (React 19 + Vite + React Router 6 `createBrowserRouter`) ya es una SPA correcta en su base: hay un *layout route* `MainLayout` con `<Outlet/>` y la barra lateral usa `<NavLink>`. Navegar entre secciones **no** recarga la página.

El "full reload que tira la barra lateral" tiene una causa raíz puntual y varias mejoras adyacentes que valen la pena.

**Causa raíz:** `src/services/api.ts` (interceptor de respuesta de Axios) ejecuta `window.location.href = '/login'` ante cualquier `401`. Eso es una navegación **dura** del navegador: re-monta toda la app, hay flash, se re-descarga el bundle y se pierde la sidebar + todo el estado en memoria.

**Restricción de arquitectura (clave para el diseño):** `AuthProvider` (`src/auth/useAuth.tsx`) envuelve a `<App/>` en `src/main.tsx`, y `App` es quien monta `<RouterProvider/>`. Por lo tanto **`AuthProvider` está por fuera del Router y NO puede usar `useNavigate()`**. La redirección tras un 401/logout debe ser **declarativa**: `logout()` hace `setUser(null)` → `isAuthenticated` pasa a `false` → `PrivateRoute` renderiza `<Navigate to="/login" state={{from}}/>`. Sin recarga.

## 2. Objetivos y no-objetivos

**Objetivos**
- Eliminar todo full-reload del documento durante la sesión; la sidebar (`MainLayout`) permanece montada siempre.
- Endurecer correctness de React (reglas de hooks) sin cambiar comportamiento.
- Eliminar la sensación de "reload" al volver a pantallas ya visitadas (caché de server-state).
- Mejorar robustez (Error Boundary, manejo de errores, tipos) y accesibilidad básica.

**No-objetivos**
- No rediseñar la UI ni cambiar la paleta/estilos.
- No implementar refresh-token en backend (solo se contempla detección local de expiración como opcional).
- No migrar el 100% de los fetch a React Query en una sola pasada: se prioriza por pantalla.
- No tocar backend salvo que una fase lo requiera explícitamente (se documentará).

## 3. Plan por fases

Cada fase cierra en un branch propio y se mergea sola. Orden por relación riesgo/valor.

---

### Fase 0 — Correctness barato (reglas de hooks + tipos)

**Objetivo:** dejar el lint casi en verde arreglando violaciones que son *bugs*, sin cambiar comportamiento observable.

**Cambios**
- `react-hooks/set-state-in-render`: `src/pages/perfil/HistorialPage.tsx:28` — sacar `setPage(1)` del `useMemo`; el filtrado queda puro y el reset de página va a un `useEffect(() => setPage(1), [search, desde, hasta])`.
- `react-hooks/purity`: `src/pages/subastas/components/CreateAuctionForm.tsx:131` — `Date.now()` en render → calcular dentro de un handler/`useMemo` o derivar de un estado estable.
- `react-hooks/set-state-in-effect` (×5): ActivasPage, MiasPage, NuevaPage (subastas), IntercambiosPage — reemplazar `setLoading(false)` dentro del guard por estado inicial derivado (`useState(!user?.id)`) o reestructurar el efecto.
- `react-hooks/exhaustive-deps` (×3): `src/auth/useAuth.tsx:54`, `src/pages/propuestas/EnviadasPage.tsx:59` (deps `[]` → `[user?.id]`, corrige stale closure), y `src/pages/propuestas/NuevaPage.tsx:96` (quitar `eslint-disable`, incluir `offeredBaseIds`).
- `@typescript-eslint/no-explicit-any` (×9): RecibidasPage, auctionService, AuctionDetailModal, ConditionsBuilder, ActivasPage/ParticipandoPage (`err: any` → `err: unknown`).
- `@typescript-eslint/no-unused-vars` (×1): eliminar código muerto.
- (Opcional, DX) `react-refresh/only-export-components` (×27): mover los `const … = lazy(...)` y helpers no-componente a archivos aparte (p.ej. `router.routes.tsx`, `auth/decodeToken.ts`). Es ruido de Fast Refresh, no afecta producción; se puede diferir.

**Criterio de aceptación:** `npm run lint` sin errores de `react-hooks/*` ni `no-explicit-any`; `npm run build` y los tests existentes (`npm test`) pasan; ningún cambio funcional perceptible.

---

### Fase 1 — Fix de la tarjeta: 401/logout sin recarga (núcleo)

**Objetivo:** cerrar Trello #22. Ningún 401 ni logout recarga el documento; la sidebar nunca se desmonta.

**Diseño del flujo 401 (declarativo, respetando que AuthProvider está fuera del Router):**

1. `src/services/api.ts`: el interceptor **deja de** hacer `window.location.href`. En su lugar invoca un handler registrado:
   - Exponer `setUnauthorizedHandler(fn: () => void)` (un módulo con una variable `onUnauthorized`).
   - En el interceptor: ante `401`, `localStorage.removeItem('token')` y `onUnauthorized?.()`.
   - `apiFetch` (el helper fetch) replica la misma política: si `res.status === 401`, llamar `onUnauthorized()` y lanzar — así **se unifica** el manejo entre Axios y fetch (hoy inconsistente).
2. `src/auth/useAuth.tsx`: en un `useEffect` de montaje, `setUnauthorizedHandler(logout)`. Así un 401 → `logout()` → `setUser(null)`.
3. Redirección declarativa: con `isAuthenticated === false`, `PrivateRoute` ya renderiza `<Navigate to="/login" state={{ from: location }} replace />`. La sidebar y el árbol React se mantienen; solo cambia la ruta. **Sin reload.**
4. `logout()` (botón en `MainLayout`): solo `setUser(null)` + limpiar token; el redirect lo hace `PrivateRoute`. (No se usa `navigate()` porque el contexto está fuera del Router.)
5. `LoginPage`: leer `const { state } = useLocation()` y tras login navegar a `state?.from?.pathname ?? '/dashboard'`. Así un 401 a mitad de navegación devuelve al usuario a donde estaba.

**Consolidar `MainLayout` duplicado (evita re-montaje de la sidebar):**
- `src/router/router.tsx`: hoy hay dos subárboles que montan `<MainLayout>` por separado (uno user, uno admin) → pasar de zona user a `/admin` **re-monta** `MainLayout`. Unificar a un solo `MainLayout`, con las rutas admin anidadas y protegidas por un `PrivateRoute requiredRole="admin"` interno:
  ```
  { element: <PrivateRoute/>, children: [
    { element: <MainLayout/>, children: [
      ...rutas user...,
      { element: <PrivateRoute requiredRole="admin"/>, children: [
        { path: 'admin', element: <AdminPage/> },
        { path: 'admin/gift', element: <AdminGiftPage/> },
      ]},
    ]},
  ]}
  ```

**Opcional (mismo branch o el siguiente):** utilidad `isTokenExpired(token)` que lee `exp` del JWT; al montar AuthProvider, si está expirado → `logout()` sin pegar al backend (evita el 401 "sorpresa").

**Criterio de aceptación:** forzar un 401 (token vencido/borrado) mientras se navega NO recarga la página y la sidebar permanece; logout idem; tras login se vuelve a la ruta original; navegar user↔admin no re-monta `MainLayout` (verificable con un `console.count`/React DevTools temporal o un test). `npm run build` ok.

---

### Fase 2 — Server-state con React Query (mata la sensación de reload)

**Objetivo:** que volver a una pantalla ya visitada sea instantáneo (sin spinner/flash), con caché, dedup e invalidación correctas.

**Cambios**
- Agregar dependencia `@tanstack/react-query` v5 (compatible con React 19) y montar `QueryClientProvider` en `App.tsx` (dentro o fuera del Router; típicamente envolviendo `RouterProvider`).
- Crear hooks de datos por dominio que reemplazan los `useEffect + fetch` manuales:
  - `useFiguritas(username)`, `useFaltantes/useRepetidas`, `usePropuestasRecibidas/Enviadas`, `useSubastas` (activas/mías/participando), `useNotificaciones`, `useDashboard`.
  - Config: `staleTime` razonable (p.ej. 30s) para stale-while-revalidate.
- Mutaciones (`useMutation`) para ofertar, aceptar/rechazar propuesta, crear subasta, etc., con `queryClient.invalidateQueries([...])` en `onSuccess` (elimina los refetch manuales tipo `api.get('/api/subastas')` post-acción y la doble fuente de verdad `localState`).
- Para fetch que no migren a React Query en esta fase: agregar `AbortController`/flag `cancelled` en el `useEffect` (cleanup) para cortar race conditions y `setState` tras unmount (Colección, Buscar, `useTransactions`).
- Memoizar el value de `AuthContext` con `useMemo` y estabilizar `loginWithToken/logout/updateUser` con `useCallback` (`src/auth/useAuth.tsx`). Impacto práctico chico pero correcto y barato; además estabiliza deps de los nuevos hooks.

**Criterio de aceptación:** navegar fuera y volver a Colección/Subastas/Propuestas/Dashboard no muestra esqueleto si el dato está fresco; tras una mutación, la lista afectada se actualiza por invalidación (no por reload); no quedan warnings de `setState` tras unmount en consola con StrictMode.

---

### Fase 3 — Robustez, errores y accesibilidad (pulido)

**Objetivo:** que un error no tumbe la app, que el usuario vea feedback claro, y subir la base de a11y/tipos.

**Cambios**
- `src/components/ErrorBoundary.tsx` (class component con `componentDidCatch`) envolviendo `RouterProvider` en `App.tsx`, con UI de fallback + reintentar.
- Manejo de errores consistente: componentes reutilizables `<ErrorState onRetry/>` y `<EmptyState/>`; reemplazar `console.error` "mudos" y `alert()` por feedback en UI; cada fetch/mutación setea estado de error.
- `tsconfig.app.json`: activar `"strict": true`.
- Accesibilidad: agregar `eslint-plugin-jsx-a11y`; `htmlFor`/`id` en labels (Login/Register/Filtros), `aria-label` en botones-ícono (logout, campana), `aria-pressed`/`aria-label` en selects de BidForm/Carousel.
- Reemplazar la mutación directa de DOM en handlers (`e.currentTarget.style…`) por `hover:` de Tailwind o estado React, en `MainLayout`, `SubastasPage`, `HistorialPage` (patrón correcto ya existe en `IntercambiosPage`).
- Limpieza: `src/components/StarRating.tsx` compartido (hoy duplicado en `UserProfileModal` y `PerfilPage`); conectar/o quitar el botón de campana de `MainLayout` (hoy sin `onClick`); revisar `data/mockAuctions.ts` (código muerto) y mocks de `UserProfileModal`.

**Criterio de aceptación:** un throw simulado en una página muestra el fallback del Error Boundary, no pantalla en blanco; `npm run lint` (con jsx-a11y) sin errores nuevos; `tsc`/build pasan con `strict`.

## 4. Estrategia de testing

- **Fase 0/1:** `npm run lint`, `npm run build`, `npm test` (vitest). Para Fase 1, test del wiring del handler 401 (que `onUnauthorized` dispare `logout`) y/o verificación manual de no-reload (la sidebar persiste).
- **Fase 2:** tests de los hooks de datos con React Query (mock de fetch); verificación de invalidación tras mutación.
- **Fase 3:** test del Error Boundary (render con hijo que lanza → fallback); checks de a11y por roles/labels en formularios.

## 5. Riesgos

- **React Query + React 19 StrictMode:** doble fetch en dev es esperado; no es bug. Documentarlo.
- **Consolidación de rutas admin:** validar que el guard de rol anidado sigue bloqueando `/admin` a usuarios no-admin (redirige a `/dashboard`).
- **Unificación de 401 en `apiFetch`:** revisar que ningún flujo dependa hoy de que `apiFetch` ignore el 401.

## 6. Orden de entrega sugerido

`Fase 0` (rápida, sin riesgo) → `Fase 1` (cierra la tarjeta) → `Fase 2` (mayor ganancia de UX) → `Fase 3` (pulido). Cada una se puede mergear y demostrar por separado.
