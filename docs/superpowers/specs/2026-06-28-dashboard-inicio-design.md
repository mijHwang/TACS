# Dashboard / Inicio — Diseño

- **Fecha:** 2026-06-28
- **Tarjeta Trello:** [2. Dashboard / Inicio](https://trello.com/c/GVTeRvNC/5-2-dashboard-inicio) (label *Frontend*, due 2026-05-05)
- **User Stories:** US8 (ver figuritas publicadas, propuestas enviadas/recibidas, subastas activas y estado de cada operación) + US2 (faltantes para completar la colección)
- **Estado:** aprobado, listo para plan de implementación

## 1. Objetivo

Convertir `DashboardPage` de datos mock a **datos reales**, como **pantalla de resumen del estado del usuario**. Hoy el dashboard tiene 4 secciones y solo "Sugerencias" usa datos reales; el resto (Propuestas, Subastas, Alertas) es mock y "Figuritas publicadas" no existe.

Lo que pide la tarjeta: figuritas publicadas, propuestas enviadas y recibidas, subastas activas, alertas pendientes. Se mantiene además "Sugerencias para vos" (US4, ya real) y se agregan dos elementos de utilidad (progreso de colección, acciones rápidas) coherentes con el enunciado.

## 2. Alcance

**Dentro:**
- Reescritura de `DashboardPage` con datos reales y nueva jerarquía.
- Nueva capa de servicio `dashboardService.ts` (orquesta endpoints existentes en paralelo).
- Componentes nuevos de presentación y ajustes menores a componentes existentes.
- Estados de carga / vacío / error por sección.
- Tests unitarios del servicio (se agrega `vitest`).

**Fuera (descartado, con motivo en §12):**
- Endpoint agregador en backend (Enfoque B).
- Paginación real (tiene su propia tarjeta).
- "Intercambios recientes" en el dashboard (requiere backend nuevo y pisa Perfil > Historial, que aún es mock).
- Countdown en vivo reescrito desde cero (se reutiliza `CountdownBadge`).

**Cero backend:** todas las fuentes ya existen y son consumidas por otras pantallas. Verificado endpoint por endpoint.

## 3. Enfoque arquitectónico (A)

Frontend puro con capa de servicio, siguiendo la convención del repo (`{feature}Service.ts` + mappers en `api.ts`, como `auctionService`).

- `src/services/dashboardService.ts` expone `getDashboardData(userId, username): Promise<DashboardData>`.
- Internamente hace `Promise.allSettled` de todas las fuentes → **si una sección falla, el resto igual renderiza** (resiliencia).
- Mapea los DTOs del backend a *view-models* y calcula los contadores (KPIs).
- `DashboardPage` queda declarativa: un `useEffect` que llama al servicio y compone secciones presentacionales.

Por qué A y no B/C: A respeta convenciones, mantiene el scope en frontend (label *Frontend*), deja la página testeable y mantenible, y reutiliza endpoints ya probados. Deja el camino abierto a B (agregador) sin tocar componentes si en el futuro la performance lo amerita.

## 4. Jerarquía de la pantalla (orden por utilidad real)

1. **Header** — título "Inicio" + saludo.
2. **Progreso de colección** (banner) — `X / Y figuritas`, barra de progreso, `te faltan N`, link a faltantes.
3. **Fila de KPIs** (4 tarjetas clickeables): Figuritas publicadas · Propuestas pendientes · Subastas activas · Alertas sin leer.
4. **Acciones rápidas** — fila de CTAs de navegación.
5. **Sugerencias para vos** — carousel (motor del loop de intercambio).
6. **Propuestas recibidas** (accionables: aceptar/rechazar) + **enviadas** (lista compacta).
7. **Subastas activas** — carousel (mías + participando, con estado "vas ganando / te superaron").
8. **Novedades** — alertas sin leer como lista compacta (no carousel) para evitar redundancia con las secciones de arriba.

## 5. Fuentes de datos por sección

Todas vía `apiFetch` (helper fetch del repo; las rutas van sin el prefijo `/api`, que `apiFetch` antepone) salvo subastas, que usan `auctionService`.

| Dato | Fuente | Devuelve |
|---|---|---|
| Figuritas del usuario (owned + publicadas) | `GET /usuarios/{username}/figuritas` | `FiguritaResponseDTO[]` (distintas, con `count`) |
| Faltantes (progreso) | `GET /usuarios/{username}/figuritas/faltantes` | `FiguritaBaseDTO[]` (solo se usa el `length`) |
| Propuestas enviadas | `GET /solicitudes-intercambio/enviadas/{userId}` | `SolicitudDeIntercambio[]` |
| Propuestas recibidas | `GET /solicitudes-intercambio/recibidas/{userId}` | `SolicitudDeIntercambio[]` |
| Subastas mías | `auctionService.getByUsuario(userId)` | `Auction[]` |
| Subastas participando | `auctionService.getParticipando(userId)` | `Auction[]` |
| Alertas | `GET /notificaciones/usuario/{userId}` | `Notificacion[]` |
| Sugerencias | `GET /usuarios/{username}/sugerencias` | `SugerenciaResponseDTO[]` |

**8 llamadas en paralelo** (`Promise.allSettled`). Optimización: "Figuritas publicadas" se deriva de `/figuritas` filtrando `count > 1` — no se llama a `/figuritas/repetidas` por separado.

Nota: `repetidas`/`figuritas` y `sugerencias` usan `username`; el resto usa `userId`. Ambos vienen de `useAuth()` (`user.id`, `user.username`).

## 6. Contadores (KPIs) y progreso

- **Progreso de colección:** `owned = figuritas.length` (distintas que tenés), `faltan = faltantes.length`, `total = owned + faltan`, `pct = round(owned / total * 100)`. Si `total === 0`, ocultar barra y mostrar estado vacío.
- **Figuritas publicadas:** `publicadas = figuritas.filter(f => f.count > 1)`; KPI = `publicadas.length`, subtítulo = `Σ(count - 1)` excedentes.
- **Propuestas pendientes:** `(enviadas + recibidas).filter(estado === 'PENDIENTE').length`; subtítulo distingue recibidas/enviadas.
- **Subastas activas:** subastas (mías ∪ participando, deduplicadas por `id`) con `status === 'active'`; subtítulo "N por vencer" = activas con `endTime` en menos de 1 h.
- **Alertas sin leer:** `notificaciones.filter(n => !n.leida).length`.

Todo número que llega a pantalla pasa por `Math.round`.

## 7. View-models y mapeos

### Propuestas
Las GET de enviadas/recibidas devuelven el **modelo** `SolicitudDeIntercambio` (no el DTO de request): `{ id, usuario:{id,username}, figurita:{id, figuritaBase:{numero, jugador:{nombre}, seleccion:{nombre}}, owner:{username}}, figuritasOfrecidas:[...], estado, destinatarioUsername }`.

- Helper `nombreFigurita(figuritaBase)` → `"{jugador.nombre} #{numero}"`.
- **Recibida:** contraparte = `usuario.username`; ofrece = `figuritasOfrecidas.map(nombreFigurita)`; pide = `nombreFigurita(figurita.figuritaBase)`; `estado`.
- **Enviada:** contraparte = `destinatarioUsername` (fallback `figurita.owner?.username`); mismos campos.
- `estado` ∈ `PENDIENTE | ACEPTADO | RECHAZADO` (enum backend `EstadoSolicitud`).
- Recibidas se ordenan con `PENDIENTE` primero; las pendientes muestran acciones **Aceptar/Rechazar** que llaman `PUT /solicitudes-intercambio/{id}/aceptar` y `/rechazar` (misma API que `RecibidasPage`), con update optimista de esa tarjeta.

### Subastas
Sobre `Auction` (mapeado por `mapSubasta` en `api.ts`): `{ id, ownerId, ownerUsername, sticker:{number,playerName,country}, bids:[{bidderId,...}], endTime, status }`.

- Merge mías ∪ participando, deduplicar por `id` (`Map`), filtrar `status === 'active'`.
- `esMia = ownerId === userId`.
- `figuritaLabel = "{sticker.playerName} #{sticker.number} {sticker.country}"`.
- `ofertas = bids.length`.
- Estado de participación (heurística best-effort, no es estado del backend): `esMia ? 'mia' : (bids.at(-1)?.bidderId === userId ? 'ganando' : 'superado')`.
- Countdown: se pasa `endTime` y se reutiliza `CountdownBadge` (tickeo en vivo, maneja el sufijo `Z`).

### Alertas
`Notificacion = { id, tipo, titulo, mensaje, leida, fecha, enlace }`.

- Filtrar `!leida`, ordenar por `fecha` desc, tomar top ~5 para la lista; el KPI cuenta todas las no leídas.
- `mapAlertaTipo(tipo)`: `'propuesta'→propuesta`, `'subasta'→subasta`, `'intercambio'→intercambio`, resto (`'figurita-faltante'`, etc.) → `sistema`.
- Texto = `titulo ?? mensaje`; `tiempo = formatRelativeTime(fecha)`.

### Sugerencias
Igual que hoy: aplana `figuritasARecibir` y prearma la propuesta al navegar a `/propuestas/nueva` (se conserva el comportamiento actual de `DashboardPage`).

## 8. Componentes

**Nuevos** (en `src/pages/home/components/`):
- `StatCard` — KPI clickeable `{ label, value, sub?, color, icon, to }`.
- `CollectionProgress` — banner `{ owned, total, faltan }` con barra y link a `/coleccion/faltantes`.
- `QuickActions` — fila de CTAs de navegación.
- `PropuestaRecibidaCard` — tarjeta destacada con Aceptar/Rechazar.
- `PropuestaEnviadaRow` — fila compacta para enviadas.
- `NovedadesList` — lista compacta de alertas no leídas.
- `SectionSkeleton` — placeholder de carga por sección.

**Ajustes menores:**
- `SubastaCard` — aceptar opcional `endTime` para renderizar `CountdownBadge`; mantener `tiempoRestante` string como fallback (compat).
- `CountdownBadge` — reutilizar; evaluar moverlo a `src/components/` (hoy vive en `pages/subastas/components/`) para evitar import cruzado entre features. Si se mueve, actualizar imports de subastas.
- `PropuestaCard` actual (carousel) queda **superado** por los componentes nuevos del dashboard; se puede dejar o eliminar (no se usa en otra pantalla).

**Reutilizados:** `Carousel`, `FiguritaCard` (sugerencias).

## 9. Tipos / consolidación de DTOs

Consolidar en `src/types/` los DTOs hoy redeclarados en varias páginas, **solo los que usa el dashboard**:
- `FiguritaResponseDTO`, `SolicitudDeIntercambio`, `Notificacion`, `SugerenciaResponseDTO`, `FiguritaBaseDTO`.
- View-models del dashboard (`DashboardData`, `PropuestaVM`, `SubastaVM`, `AlertaVM`, `DashboardCounts`).

Las páginas existentes pueden seguir con sus tipos locales; opcionalmente luego importan de `src/types/` (no es parte de esta tarea migrarlas todas).

## 10. Rutas de navegación (verificadas contra `router.tsx`)

| Origen | Destino |
|---|---|
| KPI Figuritas publicadas | `/coleccion/repetidas` |
| Progreso / faltantes | `/coleccion/faltantes` |
| KPI/sección Propuestas | `/propuestas/recibidas`, `/propuestas/enviadas` |
| KPI/sección Subastas | `/subastas/activas` (o `/subastas/mias`, `/subastas/participando`) |
| KPI/sección Alertas | `/notificaciones` |
| Sugerencias | `/sugerencias` y `/propuestas/nueva` (prearmada) |
| Acción "Buscar figuritas" | `/buscar` |
| Acción "Publicar subasta" | `/subastas/nueva` |
| Acción "Cargar figuritas" | `/coleccion` (confirmar en implementación si hay form dedicado; si no, usar `/coleccion` o reemplazar por "Nueva propuesta" → `/propuestas/nueva`) |

## 11. Estados (UX) y resiliencia

- Un `useEffect` → `getDashboardData(user.id, user.username)`. Guard: no llamar si falta `user.id`/`user.username`.
- `Promise.allSettled`: cada fuente devuelve `{ data, error }`. La página renderiza cada sección por separado.
- **Loading:** `SectionSkeleton` por sección.
- **Vacío:** mensaje corto por sección (patrón actual "Sin sugerencias por ahora."). Estado vacío global útil para usuario nuevo sin datos.
- **Error:** mensaje inline discreto por sección ("No se pudieron cargar las propuestas") + `console.error`. Nunca rompe toda la página.

## 12. Decisiones y descartes

- **Enfoque B (agregador backend):** descartado — optimización prematura a esta escala, expande scope a backend en tarjeta *Frontend*, riesgo de "god endpoint". Es la evolución futura si la performance lo pide.
- **Enfoque C (sin refactor):** descartado — cementa deuda en un componente ya grande, no testeable.
- **Intercambios recientes:** descartado en esta tarjeta — (1) coherencia: el historial de operaciones concretadas es de US9/Perfil, no de US8/Dashboard; (2) no existe endpoint de intercambios por usuario (`IntercambioController` solo tiene `GET` de todos) → requeriría backend; (3) Perfil > Historial todavía usa `MOCK_TRANSACTIONS`. Conviene cablear Perfil primero y luego reflejar un resumen acá.
- **Figuritas publicadas como carousel → KPI:** es info de referencia (tus propias repetidas, ya están en Mi Colección), no accionable; ocupa mucho para poca urgencia.
- **Alertas como carousel → lista compacta:** evita redundancia (una propuesta/oferta nueva ya aparece en su sección y además genera alerta).

## 13. Helpers

- `nombreFigurita(figuritaBase)` → `"{jugador} #{numero}"`.
- `formatRelativeTime(fecha)` → "hace X min/h/días".
- `mapAlertaTipo(tipo)` → tipo de `AlertaCard`.
- Conteos "por vencer" usan `endTime` (subasta) con umbral 1 h.

## 14. Testing

- Se agrega `vitest` (+ `@testing-library/react` si se testea algún componente) como devDep y script `test`. Es el único agregado de tooling (el frontend hoy no tiene runner).
- El `dashboardService` se diseña **puro y aislado** (mappers + agregación) para testearlo sin red (inyectando/mockeando los fetchers).
- Casos: dedupe de subastas, filtro `active`, conteo `PENDIENTE`, derivación de publicadas (`count>1`) y excedentes, progreso (`owned/total`), `mapAlertaTipo`, y `allSettled` con una fuente caída (las demás siguen).
- Verificación final: `npm run build` (typecheck) + `npm run lint` sin errores + prueba manual contra el backend real.

## 15. Archivos afectados (estimado)

**Nuevos:**
- `frontend/src/services/dashboardService.ts`
- `frontend/src/services/dashboardService.test.ts`
- `frontend/src/types/dashboard.ts` (view-models) y/o `frontend/src/types/backend-dtos.ts`
- `frontend/src/pages/home/components/{StatCard,CollectionProgress,QuickActions,PropuestaRecibidaCard,PropuestaEnviadaRow,NovedadesList,SectionSkeleton}.tsx`
- Config de `vitest` (`vitest.config.ts` o sección en `vite.config`)

**Modificados:**
- `frontend/src/pages/home/DashboardPage.tsx` (reescritura)
- `frontend/src/pages/home/components/SubastaCard.tsx` (prop `endTime` opcional)
- `frontend/package.json` (devDeps + script `test`)
- (Opcional) mover `CountdownBadge` a `src/components/` y actualizar imports
- (Opcional) eliminar `PropuestaCard` si queda sin uso

## 16. Criterios de aceptación

1. El dashboard muestra datos reales del usuario logueado en: figuritas publicadas, propuestas enviadas y recibidas, subastas activas, alertas pendientes (US8), más progreso de colección (US2) y sugerencias (US4).
2. Las propuestas recibidas pendientes se pueden aceptar/rechazar desde el dashboard y la UI refleja el cambio.
3. Cada KPI/sección navega a su pantalla correspondiente.
4. Si un endpoint falla, su sección muestra error pero el resto del dashboard funciona.
5. Estados de carga y vacío correctos.
6. `npm run build` y `npm run lint` pasan; tests del `dashboardService` en verde.
7. No hay cambios en el backend.
