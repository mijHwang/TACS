# Dashboard / Inicio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el `DashboardPage` mock por una pantalla de inicio con datos reales (resumen del estado del usuario), frontend puro.

**Architecture:** Capa de servicio `dashboardService` que orquesta endpoints existentes en paralelo con `Promise.allSettled` (resiliencia por sección) y mapea a view-models; `DashboardPage` queda declarativa, compuesta de componentes presentacionales. Sin cambios de backend.

**Tech Stack:** React 19, TypeScript, Vite, Axios/fetch (`apiFetch`), TailwindCSS v4. Tests con Vitest + @testing-library/react (se agregan en este plan).

## Global Constraints

- **Cero backend.** Solo se consumen endpoints ya existentes. Verificado en el spec.
- **Colores de marca inline** (convención del repo, `frontend/CLAUDE.md`): `RED='#D82D31'`, `BLUE='#03BAE9'`, `GREEN='#05B15A'`; fondos con opacidad agregando dígitos hex (`${COLOR}30` ≈ 19%). Tarjetas `rounded-2xl`, `border: 1.5px solid ${COLOR}30`, hover `-translate-y-0.5`. Íconos SVG inline `strokeWidth="1.8"`, sin librería de íconos.
- **API:** `apiFetch<T>(path)` (de `src/services/api.ts`) antepone `BASE_URL = API_ORIGIN + '/api'`; las rutas se pasan sin `/api`. `repetidas/figuritas` y `sugerencias` usan `username`; el resto usa `userId`. Ambos de `useAuth()`.
- **Commits:** la regla del equipo es commitear solo con OK explícito del usuario. Los pasos de commit quedan documentados; al ejecutar, agrupar y confirmar antes de commitear (no `push`).
- **Verificación:** `npm run build` (tsc) y `npm run lint` deben pasar. Comandos desde `frontend/`.

---

### Task 1: Tooling de tests (Vitest)

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/smoke.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: script `npm run test`; entorno Vitest disponible para tasks siguientes.

- [ ] **Step 1: Instalar devDeps**

Run (desde `frontend/`):
```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

Nota: el repo usa Vite 8 (muy nuevo). Instalar la última `vitest` que declare soporte para Vite 8; si npm marca conflicto de peer-deps con `vite@^8`, resolver subiendo `vitest` a la versión que lo soporte (no bajar Vite). Confirmar con `npx vitest --version` y `npm run test` antes de seguir.

- [ ] **Step 2: Agregar script `test` en `package.json`**

En `frontend/package.json`, dentro de `"scripts"`, agregar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Crear `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

- [ ] **Step 4: Crear smoke test `frontend/src/test/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('tooling', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Correr y verificar**

Run: `npm run test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test/smoke.test.ts
git commit -m "chore(frontend): add vitest tooling"
```

---

### Task 2: Tipos compartidos del dashboard

**Files:**
- Create: `frontend/src/types/dashboard.ts`

**Interfaces:**
- Consumes: nada.
- Produces: tipos usados por todos los tasks siguientes (DTOs backend + view-models).

- [ ] **Step 1: Crear `frontend/src/types/dashboard.ts`**

```ts
// ── DTOs backend (subconjunto usado por el dashboard) ──────────────────────────
export interface FiguritaResponseDTO {
  id: string;
  numero: number;
  figuritaBaseId: string;
  count: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  ownerId: string;
  ownerName: string;
}

export interface FiguritaBaseRef {
  numero?: number;
  jugador?: { nombre?: string };
  seleccion?: { nombre?: string };
}

export interface FiguritaRef {
  id: string;
  figuritaBase?: FiguritaBaseRef;
  owner?: { username?: string };
}

export interface SolicitudDeIntercambio {
  id: string;
  usuario?: { id?: string; username?: string };
  figurita?: FiguritaRef;
  figuritasOfrecidas?: FiguritaRef[];
  estado: string;
  destinatarioUsername?: string;
}

export interface NotificacionDTO {
  id: string;
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  leida?: boolean;
  fecha?: string;
  enlace?: string;
}

export interface SugerenciaResponseDTO {
  contraparteId: string;
  contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[];
  figuritasAOfrecer: FiguritaResponseDTO[];
}

// ── View-models ────────────────────────────────────────────────────────────────
export type AlertaTipoUI = 'propuesta' | 'subasta' | 'intercambio' | 'sistema';

export interface PropuestaVM {
  id: string;
  tipo: 'enviada' | 'recibida';
  contraparte: string;
  ofrece: string[];
  pide: string;
  estado: string;
}

export interface SubastaVM {
  id: string;
  figuritaLabel: string;
  esMia: boolean;
  propietario: string;
  ofertas: number;
  endTime: string;
  participacion: 'mia' | 'ganando' | 'superado';
}

export interface AlertaVM {
  id: string;
  tipo: AlertaTipoUI;
  texto: string;
  tiempo: string;
  leida: boolean;
}

export interface SugerenciaFlatVM {
  key: string;
  figurita: FiguritaResponseDTO;
  contraparteNombre: string;
  figuritasAOfrecerBaseIds: string[];
}

export interface DashboardCounts {
  owned: number;
  totalAlbum: number;
  faltan: number;
  progresoPct: number;
  publicadas: number;
  excedentes: number;
  propuestasPendientes: number;
  recibidasPendientes: number;
  enviadasPendientes: number;
  subastasActivas: number;
  subastasPorVencer: number;
  alertasSinLeer: number;
}

export interface SectionResult<T> {
  data: T;
  error: boolean;
}

export interface DashboardData {
  counts: DashboardCounts;
  progreso: { owned: number; total: number; faltan: number };
  publicadas: SectionResult<FiguritaResponseDTO[]>;
  recibidas: SectionResult<PropuestaVM[]>;
  enviadas: SectionResult<PropuestaVM[]>;
  subastas: SectionResult<SubastaVM[]>;
  alertas: SectionResult<AlertaVM[]>;
  sugerencias: SectionResult<SugerenciaFlatVM[]>;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run build`
Expected: PASS (sin errores de tipos).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/dashboard.ts
git commit -m "feat(dashboard): shared dashboard types"
```

---

### Task 3: Helpers puros

**Files:**
- Create: `frontend/src/pages/home/dashboard/helpers.ts`
- Test: `frontend/src/pages/home/dashboard/helpers.test.ts`

**Interfaces:**
- Consumes: tipos de `src/types/dashboard.ts`.
- Produces:
  - `nombreFigurita(fb?: FiguritaBaseRef): string`
  - `formatRelativeTime(iso?: string, now?: number): string`
  - `mapAlertaTipo(tipo?: string): AlertaTipoUI`
  - `isPorVencer(endTime: string, now?: number, horas?: number): boolean`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from 'vitest';
import { nombreFigurita, formatRelativeTime, mapAlertaTipo, isPorVencer } from './helpers';

describe('nombreFigurita', () => {
  it('arma "jugador #numero"', () => {
    expect(nombreFigurita({ numero: 10, jugador: { nombre: 'Messi' } })).toBe('Messi #10');
  });
  it('tolera datos faltantes', () => {
    expect(nombreFigurita(undefined)).toBe('Figurita');
  });
});

describe('mapAlertaTipo', () => {
  it('mapea conocidos', () => {
    expect(mapAlertaTipo('propuesta')).toBe('propuesta');
    expect(mapAlertaTipo('subasta')).toBe('subasta');
    expect(mapAlertaTipo('intercambio')).toBe('intercambio');
  });
  it('cae a sistema', () => {
    expect(mapAlertaTipo('figurita-faltante')).toBe('sistema');
    expect(mapAlertaTipo(undefined)).toBe('sistema');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-06-28T12:00:00Z');
  it('minutos', () => {
    expect(formatRelativeTime('2026-06-28T11:50:00Z', now)).toBe('hace 10 min');
  });
  it('horas', () => {
    expect(formatRelativeTime('2026-06-28T10:00:00Z', now)).toBe('hace 2 h');
  });
  it('dias', () => {
    expect(formatRelativeTime('2026-06-26T12:00:00Z', now)).toBe('hace 2 d');
  });
});

describe('isPorVencer', () => {
  const now = Date.parse('2026-06-28T12:00:00Z');
  it('true si vence en menos de 1h', () => {
    expect(isPorVencer('2026-06-28T12:30:00Z', now)).toBe(true);
  });
  it('false si falta mas de 1h', () => {
    expect(isPorVencer('2026-06-28T14:00:00Z', now)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test -- helpers`
Expected: FAIL ("Cannot find module './helpers'").

- [ ] **Step 3: Implementar `helpers.ts`**

```ts
import type { AlertaTipoUI, FiguritaBaseRef } from '../../../types/dashboard';

export function nombreFigurita(fb?: FiguritaBaseRef): string {
  const jugador = fb?.jugador?.nombre?.trim();
  const numero = fb?.numero;
  if (jugador && numero != null) return `${jugador} #${numero}`;
  if (jugador) return jugador;
  if (numero != null) return `#${numero}`;
  return 'Figurita';
}

export function mapAlertaTipo(tipo?: string): AlertaTipoUI {
  if (tipo === 'propuesta' || tipo === 'subasta' || tipo === 'intercambio') return tipo;
  return 'sistema';
}

function toMs(iso?: string): number {
  if (!iso) return NaN;
  const norm = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  return Date.parse(norm);
}

export function formatRelativeTime(iso?: string, now: number = Date.now()): string {
  const ts = toMs(iso);
  if (Number.isNaN(ts)) return '';
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function isPorVencer(endTime: string, now: number = Date.now(), horas = 1): boolean {
  const ts = toMs(endTime);
  if (Number.isNaN(ts)) return false;
  const diff = ts - now;
  return diff > 0 && diff < horas * 3_600_000;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test -- helpers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/home/dashboard/helpers.ts frontend/src/pages/home/dashboard/helpers.test.ts
git commit -m "feat(dashboard): pure helpers + tests"
```

---

### Task 4: Mappers y contadores

**Files:**
- Create: `frontend/src/pages/home/dashboard/mappers.ts`
- Test: `frontend/src/pages/home/dashboard/mappers.test.ts`

**Interfaces:**
- Consumes: tipos de `src/types/dashboard.ts`, helpers de Task 3, `Auction` de `src/types/auction.ts`.
- Produces:
  - `mapPropuesta(s: SolicitudDeIntercambio, tipo): PropuestaVM`
  - `mapSubastasActivas(mias: Auction[], participando: Auction[], userId: string, now?): SubastaVM[]`
  - `mapAlertas(ns: NotificacionDTO[], now?): AlertaVM[]`
  - `getPublicadas(figuritas: FiguritaResponseDTO[]): FiguritaResponseDTO[]`
  - `sumExcedentes(publicadas: FiguritaResponseDTO[]): number`
  - `flattenSugerencias(ss: SugerenciaResponseDTO[], max?): SugerenciaFlatVM[]`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from 'vitest';
import { mapPropuesta, mapSubastasActivas, mapAlertas, getPublicadas, sumExcedentes } from './mappers';
import type { SolicitudDeIntercambio, NotificacionDTO, FiguritaResponseDTO } from '../../../types/dashboard';
import type { Auction } from '../../../types/auction';

const fig = (id: string, count: number): FiguritaResponseDTO => ({
  id, numero: 1, figuritaBaseId: id, count,
  jugadorNombre: 'J', seleccionNombre: 'S', equipoNombre: 'E', categoriaNombre: 'C',
  ownerId: 'u1', ownerName: 'me',
});

const auction = (id: string, ownerId: string, status: Auction['status'], lastBidder?: string): Auction => ({
  id, ownerId, ownerUsername: ownerId, sticker: { id, number: 10, playerName: 'Messi', country: 'Argentina' },
  bids: lastBidder ? [{ id: 'b', bidderId: lastBidder, bidderUsername: lastBidder, stickers: [], placedAt: '' }] : [],
  endTime: '2026-06-28T14:00:00Z', createdAt: '2026-06-28T10:00:00Z', status, conditions: [],
});

describe('mapPropuesta', () => {
  it('recibida usa usuario.username', () => {
    const s: SolicitudDeIntercambio = {
      id: 's1', usuario: { username: 'sofi' },
      figurita: { id: 'f', figuritaBase: { numero: 10, jugador: { nombre: 'Messi' } } },
      figuritasOfrecidas: [{ id: 'o', figuritaBase: { numero: 8, jugador: { nombre: 'Pedri' } } }],
      estado: 'PENDIENTE',
    };
    const vm = mapPropuesta(s, 'recibida');
    expect(vm).toMatchObject({ tipo: 'recibida', contraparte: 'sofi', pide: 'Messi #10', estado: 'PENDIENTE' });
    expect(vm.ofrece).toEqual(['Pedri #8']);
  });
  it('enviada usa destinatarioUsername', () => {
    const s: SolicitudDeIntercambio = { id: 's2', destinatarioUsername: 'carlos', estado: 'ACEPTADO' };
    expect(mapPropuesta(s, 'enviada').contraparte).toBe('carlos');
  });
});

describe('mapSubastasActivas', () => {
  it('dedup por id, filtra solo active, calcula participacion', () => {
    const mias = [auction('a1', 'u1', 'active')];
    const part = [auction('a1', 'u1', 'active'), auction('a2', 'u2', 'active', 'u1'), auction('a3', 'u3', 'finished')];
    const out = mapSubastasActivas(mias, part, 'u1');
    expect(out.map(s => s.id).sort()).toEqual(['a1', 'a2']);
    expect(out.find(s => s.id === 'a1')!.participacion).toBe('mia');
    expect(out.find(s => s.id === 'a2')!.participacion).toBe('ganando');
  });
  it('superado cuando la ultima oferta no es mia', () => {
    const out = mapSubastasActivas([], [auction('a2', 'u2', 'active', 'u9')], 'u1');
    expect(out[0].participacion).toBe('superado');
  });
});

describe('mapAlertas', () => {
  it('solo no leidas, ordenadas desc', () => {
    const ns: NotificacionDTO[] = [
      { id: 'n1', leida: true, fecha: '2026-06-28T10:00:00Z', titulo: 'vieja' },
      { id: 'n2', leida: false, fecha: '2026-06-28T09:00:00Z', titulo: 'a', tipo: 'subasta' },
      { id: 'n3', leida: false, fecha: '2026-06-28T11:00:00Z', titulo: 'b', tipo: 'propuesta' },
    ];
    const out = mapAlertas(ns, Date.parse('2026-06-28T12:00:00Z'));
    expect(out.map(a => a.id)).toEqual(['n3', 'n2']);
    expect(out[0].tipo).toBe('propuesta');
  });
});

describe('getPublicadas / sumExcedentes', () => {
  it('publicadas = count>1, excedentes = sum(count-1)', () => {
    const all = [fig('f1', 1), fig('f2', 3), fig('f3', 2)];
    const pub = getPublicadas(all);
    expect(pub.map(f => f.id)).toEqual(['f2', 'f3']);
    expect(sumExcedentes(pub)).toBe(3);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test -- mappers`
Expected: FAIL ("Cannot find module './mappers'").

- [ ] **Step 3: Implementar `mappers.ts`**

```ts
import type {
  SolicitudDeIntercambio, PropuestaVM, NotificacionDTO, AlertaVM,
  FiguritaResponseDTO, SugerenciaResponseDTO, SugerenciaFlatVM,
} from '../../../types/dashboard';
import type { Auction } from '../../../types/auction';
import { nombreFigurita, mapAlertaTipo, formatRelativeTime } from './helpers';

export function mapPropuesta(s: SolicitudDeIntercambio, tipo: 'enviada' | 'recibida'): PropuestaVM {
  const contraparte = tipo === 'recibida'
    ? (s.usuario?.username ?? 'usuario')
    : (s.destinatarioUsername ?? s.figurita?.owner?.username ?? 'usuario');
  return {
    id: s.id,
    tipo,
    contraparte,
    ofrece: (s.figuritasOfrecidas ?? []).map(f => nombreFigurita(f.figuritaBase)),
    pide: nombreFigurita(s.figurita?.figuritaBase),
    estado: s.estado,
  };
}

export function mapSubastasActivas(
  mias: Auction[], participando: Auction[], userId: string, now: number = Date.now(),
): SubastaVM[] {
  void now;
  const byId = new Map<string, Auction>();
  [...mias, ...participando].forEach(a => { if (!byId.has(a.id)) byId.set(a.id, a); });
  return [...byId.values()]
    .filter(a => a.status === 'active')
    .map(a => {
      const esMia = a.ownerId === userId;
      const ultimaEsMia = a.bids.at(-1)?.bidderId === userId;
      return {
        id: a.id,
        figuritaLabel: `${a.sticker.playerName} #${a.sticker.number} ${a.sticker.country}`.trim(),
        esMia,
        propietario: esMia ? 'vos' : a.ownerUsername,
        ofertas: a.bids.length,
        endTime: a.endTime,
        participacion: esMia ? 'mia' : (ultimaEsMia ? 'ganando' : 'superado'),
      };
    });
}

export function mapAlertas(ns: NotificacionDTO[], now: number = Date.now()): AlertaVM[] {
  return ns
    .filter(n => !n.leida)
    .sort((a, b) => Date.parse(b.fecha ?? '') - Date.parse(a.fecha ?? ''))
    .map(n => ({
      id: n.id,
      tipo: mapAlertaTipo(n.tipo),
      texto: n.titulo ?? n.mensaje ?? 'Notificación',
      tiempo: formatRelativeTime(n.fecha, now),
      leida: false,
    }));
}

export function getPublicadas(figuritas: FiguritaResponseDTO[]): FiguritaResponseDTO[] {
  return figuritas.filter(f => f.count > 1);
}

export function sumExcedentes(publicadas: FiguritaResponseDTO[]): number {
  return publicadas.reduce((acc, f) => acc + (f.count - 1), 0);
}

export function flattenSugerencias(ss: SugerenciaResponseDTO[], max = 8): SugerenciaFlatVM[] {
  return ss
    .flatMap(s => s.figuritasARecibir.map(f => ({
      key: `${s.contraparteId}-${f.id}`,
      figurita: f,
      contraparteNombre: s.contraparteNombre,
      figuritasAOfrecerBaseIds: s.figuritasAOfrecer.map(x => x.figuritaBaseId),
    })))
    .slice(0, max);
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test -- mappers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/home/dashboard/mappers.ts frontend/src/pages/home/dashboard/mappers.test.ts
git commit -m "feat(dashboard): view-model mappers + tests"
```

---

### Task 5: dashboardService (orquestación)

**Files:**
- Create: `frontend/src/services/dashboardService.ts`
- Test: `frontend/src/services/dashboardService.test.ts`

**Interfaces:**
- Consumes: `apiFetch`, `auctionService`, tipos, mappers (Task 4).
- Produces: `getDashboardData(userId: string, username: string, deps?: DashboardDeps): Promise<DashboardData>` y el tipo `DashboardDeps` (fetchers inyectables para testear sin red).

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from 'vitest';
import { getDashboardData, type DashboardDeps } from './dashboardService';
import type { FiguritaResponseDTO } from '../types/dashboard';

const fig = (id: string, count: number): FiguritaResponseDTO => ({
  id, numero: 1, figuritaBaseId: id, count,
  jugadorNombre: 'J', seleccionNombre: 'S', equipoNombre: 'E', categoriaNombre: 'C',
  ownerId: 'u1', ownerName: 'me',
});

const okDeps = (): DashboardDeps => ({
  fetchFiguritas: async () => [fig('f1', 1), fig('f2', 3)],
  fetchFaltantes: async () => [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }],
  fetchEnviadas: async () => [{ id: 's1', estado: 'PENDIENTE', destinatarioUsername: 'c' }],
  fetchRecibidas: async () => [{ id: 's2', estado: 'PENDIENTE', usuario: { username: 'sofi' } }],
  fetchMisSubastas: async () => [],
  fetchParticipando: async () => [],
  fetchNotificaciones: async () => [{ id: 'n1', leida: false, fecha: '2026-06-28T11:00:00Z', titulo: 'x' }],
  fetchSugerencias: async () => [],
});

describe('getDashboardData', () => {
  it('agrega counts y secciones', async () => {
    const d = await getDashboardData('u1', 'me', okDeps());
    expect(d.counts.owned).toBe(2);
    expect(d.counts.faltan).toBe(3);
    expect(d.counts.totalAlbum).toBe(5);
    expect(d.counts.progresoPct).toBe(40);
    expect(d.counts.publicadas).toBe(1);
    expect(d.counts.excedentes).toBe(2);
    expect(d.counts.propuestasPendientes).toBe(2);
    expect(d.counts.alertasSinLeer).toBe(1);
    expect(d.publicadas.error).toBe(false);
  });

  it('una fuente caida no rompe el resto', async () => {
    const deps = okDeps();
    deps.fetchRecibidas = async () => { throw new Error('boom'); };
    const d = await getDashboardData('u1', 'me', deps);
    expect(d.recibidas.error).toBe(true);
    expect(d.recibidas.data).toEqual([]);
    expect(d.enviadas.error).toBe(false);
    expect(d.counts.recibidasPendientes).toBe(0);
    expect(d.counts.enviadasPendientes).toBe(1);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test -- dashboardService`
Expected: FAIL ("Cannot find module './dashboardService'").

- [ ] **Step 3: Implementar `dashboardService.ts`**

```ts
import { apiFetch } from './api';
import { auctionService } from './auctionService';
import type { Auction } from '../types/auction';
import type {
  FiguritaResponseDTO, FiguritaBaseRef, SolicitudDeIntercambio, NotificacionDTO,
  SugerenciaResponseDTO, DashboardData, SectionResult,
} from '../types/dashboard';
import {
  mapPropuesta, mapSubastasActivas, mapAlertas, getPublicadas, sumExcedentes, flattenSugerencias,
} from '../pages/home/dashboard/mappers';
import { isPorVencer } from '../pages/home/dashboard/helpers';

export interface DashboardDeps {
  fetchFiguritas: (username: string) => Promise<FiguritaResponseDTO[]>;
  fetchFaltantes: (username: string) => Promise<unknown[]>;
  fetchEnviadas: (userId: string) => Promise<SolicitudDeIntercambio[]>;
  fetchRecibidas: (userId: string) => Promise<SolicitudDeIntercambio[]>;
  fetchMisSubastas: (userId: string) => Promise<Auction[]>;
  fetchParticipando: (userId: string) => Promise<Auction[]>;
  fetchNotificaciones: (userId: string) => Promise<NotificacionDTO[]>;
  fetchSugerencias: (username: string) => Promise<SugerenciaResponseDTO[]>;
}

const defaultDeps: DashboardDeps = {
  fetchFiguritas: (u) => apiFetch<FiguritaResponseDTO[]>(`/usuarios/${u}/figuritas`),
  fetchFaltantes: (u) => apiFetch<unknown[]>(`/usuarios/${u}/figuritas/faltantes`),
  fetchEnviadas: (id) => apiFetch<SolicitudDeIntercambio[]>(`/solicitudes-intercambio/enviadas/${id}`),
  fetchRecibidas: (id) => apiFetch<SolicitudDeIntercambio[]>(`/solicitudes-intercambio/recibidas/${id}`),
  fetchMisSubastas: (id) => auctionService.getByUsuario(id),
  fetchParticipando: (id) => auctionService.getParticipando(id),
  fetchNotificaciones: (id) => apiFetch<NotificacionDTO[]>(`/notificaciones/usuario/${id}`),
  fetchSugerencias: (u) => apiFetch<SugerenciaResponseDTO[]>(`/usuarios/${u}/sugerencias`),
};

async function settle<T>(p: Promise<T>, fallback: T): Promise<SectionResult<T>> {
  try {
    return { data: await p, error: false };
  } catch (e) {
    console.error('[dashboard] fuente caida:', e);
    return { data: fallback, error: true };
  }
}

export async function getDashboardData(
  userId: string, username: string, deps: DashboardDeps = defaultDeps,
): Promise<DashboardData> {
  const now = Date.now();
  const [figuritas, faltantes, enviadasR, recibidasR, miasR, partR, notifR, sugR] = await Promise.all([
    settle(deps.fetchFiguritas(username), [] as FiguritaResponseDTO[]),
    settle(deps.fetchFaltantes(username), [] as unknown[]),
    settle(deps.fetchEnviadas(userId), [] as SolicitudDeIntercambio[]),
    settle(deps.fetchRecibidas(userId), [] as SolicitudDeIntercambio[]),
    settle(deps.fetchMisSubastas(userId), [] as Auction[]),
    settle(deps.fetchParticipando(userId), [] as Auction[]),
    settle(deps.fetchNotificaciones(userId), [] as NotificacionDTO[]),
    settle(deps.fetchSugerencias(username), [] as SugerenciaResponseDTO[]),
  ]);

  const publicadasList = getPublicadas(figuritas.data);
  const enviadas = enviadasR.data.map(s => mapPropuesta(s, 'enviada'));
  const recibidas = recibidasR.data.map(s => mapPropuesta(s, 'recibida'))
    .sort((a, b) => (a.estado === 'PENDIENTE' ? -1 : 1) - (b.estado === 'PENDIENTE' ? -1 : 1));
  const subastas = mapSubastasActivas(miasR.data, partR.data, userId, now);
  const alertas = mapAlertas(notifR.data, now);
  const sugerencias = flattenSugerencias(sugR.data);

  const owned = figuritas.data.length;
  const faltan = faltantes.data.length;
  const totalAlbum = owned + faltan;
  const recibidasPendientes = recibidas.filter(p => p.estado === 'PENDIENTE').length;
  const enviadasPendientes = enviadas.filter(p => p.estado === 'PENDIENTE').length;

  return {
    counts: {
      owned,
      totalAlbum,
      faltan,
      progresoPct: totalAlbum > 0 ? Math.round((owned / totalAlbum) * 100) : 0,
      publicadas: publicadasList.length,
      excedentes: sumExcedentes(publicadasList),
      propuestasPendientes: recibidasPendientes + enviadasPendientes,
      recibidasPendientes,
      enviadasPendientes,
      subastasActivas: subastas.length,
      subastasPorVencer: subastas.filter(s => isPorVencer(s.endTime, now)).length,
      alertasSinLeer: alertas.length,
    },
    progreso: { owned, total: totalAlbum, faltan },
    publicadas: { data: publicadasList, error: figuritas.error },
    recibidas: { data: recibidas, error: recibidasR.error },
    enviadas: { data: enviadas, error: enviadasR.error },
    subastas: { data: subastas, error: miasR.error || partR.error },
    alertas: { data: alertas, error: notifR.error },
    sugerencias: { data: sugerencias, error: sugR.error },
  };
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test -- dashboardService`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/dashboardService.ts frontend/src/services/dashboardService.test.ts
git commit -m "feat(dashboard): aggregation service with allSettled resilience"
```

---

### Task 6: `SubastaCard` con countdown en vivo

**Files:**
- Modify: `frontend/src/pages/home/components/SubastaCard.tsx`

**Interfaces:**
- Consumes: `CountdownBadge` de `../../subastas/components/CountdownBadge`.
- Produces: `SubastaCard` acepta `endTime?: string` (si está, renderiza countdown en vivo; si no, usa `tiempoRestante`). Nueva prop opcional `etiqueta?: string` para el badge ('Mi subasta' | 'Vas ganando' | 'Te superaron' | 'Activa').

- [ ] **Step 1: Reemplazar el contenido de `SubastaCard.tsx`**

```tsx
import CountdownBadge from '../../subastas/components/CountdownBadge';

const AMBER = '#D82D31';

interface Props {
  figurita: string;
  propietario: string;
  ofertasCount: number;
  tiempoRestante?: string;
  endTime?: string;
  esMia: boolean;
  etiqueta?: string;
}

export default function SubastaCard({ figurita, propietario, ofertasCount, tiempoRestante, endTime, esMia, etiqueta }: Props) {
  const label = etiqueta ?? (esMia ? 'Mi subasta' : 'Activa');
  return (
    <div
      className="flex-none w-48 rounded-2xl p-4 bg-white flex flex-col gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
      style={{ border: `1.5px solid ${AMBER}30` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${AMBER}15`, color: AMBER }}>
          {label}
        </span>
        {endTime ? (
          <CountdownBadge endTime={endTime} />
        ) : (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" style={{ color: AMBER }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span className="text-xs font-semibold" style={{ color: AMBER }}>{tiempoRestante}</span>
          </div>
        )}
      </div>

      <div className="w-full h-16 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: `${AMBER}10`, color: AMBER }}>
        🃏
      </div>

      <div>
        <p className="text-xs font-bold text-gray-800 leading-tight truncate">{figurita}</p>
        <p className="text-xs text-gray-400 mt-0.5">@{propietario}</p>
      </div>

      <div className="flex items-center gap-1">
        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
        </svg>
        <span className="text-xs text-gray-500">{ofertasCount} {ofertasCount === 1 ? 'oferta' : 'ofertas'}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/home/components/SubastaCard.tsx
git commit -m "feat(dashboard): SubastaCard live countdown + etiqueta"
```

---

### Task 7: Componentes de KPIs y layout

**Files:**
- Create: `frontend/src/pages/home/components/StatCard.tsx`
- Create: `frontend/src/pages/home/components/CollectionProgress.tsx`
- Create: `frontend/src/pages/home/components/QuickActions.tsx`
- Create: `frontend/src/pages/home/components/SectionSkeleton.tsx`

**Interfaces:**
- Consumes: `react-router-dom` (`useNavigate`).
- Produces:
  - `StatCard({ label, value, sub?, color, to })`
  - `CollectionProgress({ owned, total, faltan })`
  - `QuickActions()` (acciones fijas de navegación)
  - `SectionSkeleton({ height? })`

- [ ] **Step 1: Crear `StatCard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';

interface Props {
  label: string;
  value: number;
  sub?: string;
  color: string;
  to: string;
}

export default function StatCard({ label, value, sub, color, to }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="text-left rounded-2xl p-4 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      style={{ border: `1.5px solid ${color}30` }}
    >
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{Math.round(value)}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </button>
  );
}
```

- [ ] **Step 2: Crear `CollectionProgress.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';

const BLUE = '#03BAE9';

interface Props {
  owned: number;
  total: number;
  faltan: number;
}

export default function CollectionProgress({ owned, total, faltan }: Props) {
  const navigate = useNavigate();
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ border: `1.5px solid ${BLUE}30` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-900">Progreso de tu colección</span>
        <button
          type="button"
          onClick={() => navigate('/coleccion/faltantes')}
          className="text-xs font-semibold bg-transparent border-none cursor-pointer hover:opacity-70"
          style={{ color: BLUE }}
        >
          Ver faltantes →
        </button>
      </div>
      {total > 0 ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-gray-900">{owned}</span>
            <span className="text-sm text-gray-400">/ {total} figuritas</span>
            <span className="text-xs text-gray-500 ml-auto">te faltan {faltan}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: `${BLUE}20` }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BLUE }} />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400">Cargá tus figuritas para ver tu progreso.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Crear `QuickActions.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';

const RED = '#D82D31';
const BLUE = '#03BAE9';
const GREEN = '#05B15A';

const ACTIONS = [
  { label: 'Buscar figuritas', to: '/buscar', color: BLUE,
    icon: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></> },
  { label: 'Mi colección', to: '/coleccion', color: GREEN,
    icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { label: 'Publicar subasta', to: '/subastas/nueva', color: RED,
    icon: <><path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8"/></> },
];

export default function QuickActions() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-3 gap-3">
      {ACTIONS.map((a) => (
        <button
          key={a.to}
          type="button"
          onClick={() => navigate(a.to)}
          className="flex items-center justify-center gap-2 rounded-2xl p-3 bg-white text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          style={{ border: `1.5px solid ${a.color}30` }}
        >
          <svg className="w-4 h-4" style={{ color: a.color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {a.icon}
          </svg>
          {a.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Crear `SectionSkeleton.tsx`**

```tsx
interface Props {
  cards?: number;
}

export default function SectionSkeleton({ cards = 3 }: Props) {
  return (
    <div className="flex gap-4">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="flex-none w-48 h-28 rounded-2xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/home/components/StatCard.tsx frontend/src/pages/home/components/CollectionProgress.tsx frontend/src/pages/home/components/QuickActions.tsx frontend/src/pages/home/components/SectionSkeleton.tsx
git commit -m "feat(dashboard): KPI and layout components"
```

---

### Task 8: Componentes de propuestas y novedades

**Files:**
- Create: `frontend/src/pages/home/components/PropuestaRecibidaCard.tsx`
- Create: `frontend/src/pages/home/components/PropuestaEnviadaRow.tsx`
- Create: `frontend/src/pages/home/components/NovedadesList.tsx`
- Test: `frontend/src/pages/home/components/PropuestaRecibidaCard.test.tsx`

**Interfaces:**
- Consumes: `PropuestaVM`, `AlertaVM`; callbacks de acción.
- Produces:
  - `PropuestaRecibidaCard({ propuesta, onAceptar, onRechazar })`
  - `PropuestaEnviadaRow({ propuesta })`
  - `NovedadesList({ alertas })`

- [ ] **Step 1: Escribir el test que falla (`PropuestaRecibidaCard.test.tsx`)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PropuestaRecibidaCard from './PropuestaRecibidaCard';
import type { PropuestaVM } from '../../../types/dashboard';

const vm: PropuestaVM = {
  id: 's1', tipo: 'recibida', contraparte: 'sofi',
  ofrece: ['Pedri #8'], pide: 'Messi #10', estado: 'PENDIENTE',
};

describe('PropuestaRecibidaCard', () => {
  it('muestra contraparte y dispara onAceptar', () => {
    const onAceptar = vi.fn();
    render(<PropuestaRecibidaCard propuesta={vm} onAceptar={onAceptar} onRechazar={vi.fn()} />);
    expect(screen.getByText(/sofi/)).toBeTruthy();
    fireEvent.click(screen.getByText('Aceptar'));
    expect(onAceptar).toHaveBeenCalledWith('s1');
  });

  it('sin botones si no esta pendiente', () => {
    render(<PropuestaRecibidaCard propuesta={{ ...vm, estado: 'ACEPTADO' }} onAceptar={vi.fn()} onRechazar={vi.fn()} />);
    expect(screen.queryByText('Aceptar')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test -- PropuestaRecibidaCard`
Expected: FAIL ("Cannot find module './PropuestaRecibidaCard'").

- [ ] **Step 3: Crear `PropuestaRecibidaCard.tsx`**

```tsx
import type { PropuestaVM } from '../../../types/dashboard';

const GREEN = '#05B15A';

interface Props {
  propuesta: PropuestaVM;
  onAceptar: (id: string) => void;
  onRechazar: (id: string) => void;
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ACEPTADO: 'Aceptada', RECHAZADO: 'Rechazada',
};

export default function PropuestaRecibidaCard({ propuesta, onAceptar, onRechazar }: Props) {
  const pendiente = propuesta.estado === 'PENDIENTE';
  return (
    <div className="flex-none w-60 rounded-2xl p-4 bg-white flex flex-col gap-2" style={{ border: `1.5px solid ${GREEN}30` }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800 truncate">@{propuesta.contraparte}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${GREEN}15`, color: GREEN }}>
          {ESTADO_LABEL[propuesta.estado] ?? propuesta.estado}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">Te ofrece: {propuesta.ofrece.join(', ') || '—'}</p>
      <p className="text-xs text-gray-500 truncate">Quiere: {propuesta.pide}</p>
      {pendiente && (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => onAceptar(propuesta.id)}
            className="flex-1 text-xs font-bold text-white rounded-lg py-1.5 cursor-pointer hover:opacity-90"
            style={{ background: GREEN }}
          >
            Aceptar
          </button>
          <button
            type="button"
            onClick={() => onRechazar(propuesta.id)}
            className="flex-1 text-xs font-bold rounded-lg py-1.5 cursor-pointer border hover:opacity-80"
            style={{ color: '#6b7280', borderColor: '#e5e7eb' }}
          >
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Crear `PropuestaEnviadaRow.tsx`**

```tsx
import type { PropuestaVM } from '../../../types/dashboard';

const GREEN = '#05B15A';
const AMBER = '#D97706';

const ESTADO: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pend.', color: AMBER },
  ACEPTADO: { label: 'Acept.', color: GREEN },
  RECHAZADO: { label: 'Rech.', color: '#D82D31' },
};

export default function PropuestaEnviadaRow({ propuesta }: { propuesta: PropuestaVM }) {
  const est = ESTADO[propuesta.estado] ?? { label: propuesta.estado, color: '#6b7280' };
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0" style={{ borderColor: '#f3f4f6' }}>
      <span className="text-xs text-gray-600 truncate">@{propuesta.contraparte} · {propuesta.pide}</span>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${est.color}15`, color: est.color }}>
        {est.label}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Crear `NovedadesList.tsx`**

```tsx
import type { AlertaVM, AlertaTipoUI } from '../../../types/dashboard';

const COLORS: Record<AlertaTipoUI, string> = {
  propuesta: '#05B15A', subasta: '#D82D31', intercambio: '#05B15A', sistema: '#03BAE9',
};

const ICONS: Record<AlertaTipoUI, React.ReactNode> = {
  propuesta: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  subasta: <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />,
  intercambio: <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />,
  sistema: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
};

export default function NovedadesList({ alertas }: { alertas: AlertaVM[] }) {
  if (alertas.length === 0) {
    return <p className="text-sm text-gray-400">No tenés novedades sin leer.</p>;
  }
  return (
    <div className="rounded-2xl bg-white px-4" style={{ border: '1.5px solid #03BAE930' }}>
      {alertas.map((a) => {
        const color = COLORS[a.tipo];
        return (
          <div key={a.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: '#f3f4f6' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{ICONS[a.tipo]}</svg>
            </div>
            <span className="text-sm text-gray-700 flex-1 truncate">{a.texto}</span>
            <span className="text-xs text-gray-400 shrink-0">{a.tiempo}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Correr tests y build**

Run: `npm run test -- PropuestaRecibidaCard`
Expected: PASS.
Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/home/components/PropuestaRecibidaCard.tsx frontend/src/pages/home/components/PropuestaEnviadaRow.tsx frontend/src/pages/home/components/NovedadesList.tsx frontend/src/pages/home/components/PropuestaRecibidaCard.test.tsx
git commit -m "feat(dashboard): propuestas and novedades components"
```

---

### Task 9: Ensamblar `DashboardPage`

**Files:**
- Modify: `frontend/src/pages/home/DashboardPage.tsx` (reescritura completa)

**Interfaces:**
- Consumes: `getDashboardData` (Task 5), todos los componentes (Tasks 6-8), `useAuth`, `api` (para aceptar/rechazar), `Carousel`, `FiguritaCard`.
- Produces: pantalla final.

- [ ] **Step 1: Reescribir `DashboardPage.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
import { getDashboardData } from '../../services/dashboardService';
import type { DashboardData } from '../../types/dashboard';
import Carousel from './components/Carousel';
import FiguritaCard from './components/FiguritaCard';
import StatCard from './components/StatCard';
import CollectionProgress from './components/CollectionProgress';
import QuickActions from './components/QuickActions';
import SectionSkeleton from './components/SectionSkeleton';
import SubastaCard from './components/SubastaCard';
import PropuestaRecibidaCard from './components/PropuestaRecibidaCard';
import PropuestaEnviadaRow from './components/PropuestaEnviadaRow';
import NovedadesList from './components/NovedadesList';

const BLUE = '#03BAE9';
const RED = '#D82D31';
const GREEN = '#05B15A';
const PURPLE = '#7F77DD';

function Section({ title, color, to, toLabel, error, children }: {
  title: string; color: string; to?: string; toLabel?: string; error?: boolean; children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
        </div>
        {to && (
          <button type="button" onClick={() => navigate(to)}
            className="flex items-center gap-1 text-xs font-semibold bg-transparent border-none cursor-pointer hover:opacity-70" style={{ color }}>
            {toLabel ?? 'Ver todos'} →
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-gray-400">No se pudo cargar esta sección.</p> : children}
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    if (!user?.id || !user?.username) return;
    setLoading(true);
    getDashboardData(user.id, user.username)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user?.id, user?.username]);

  useEffect(() => { cargar(); }, [cargar]);

  const responder = (id: string, accion: 'aceptar' | 'rechazar') => {
    api.put(`/api/solicitudes-intercambio/${id}/${accion}`)
      .then(() => setData((prev) => prev && {
        ...prev,
        recibidas: { ...prev.recibidas, data: prev.recibidas.data.map(p => p.id === id ? { ...p, estado: accion === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO' } : p) },
      }))
      .catch((e) => { console.error(e); alert('No se pudo procesar la propuesta'); });
  };

  const wrap = { margin: '-1.75rem', padding: '1.75rem', minHeight: 'calc(100% + 3.5rem)', background: 'white' };

  if (loading || !data) {
    return (
      <div className="page-enter flex flex-col gap-8" style={wrap}>
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Inicio</h1><p className="text-sm text-gray-500">Cargando tu resumen…</p></div>
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  const c = data.counts;

  return (
    <div className="page-enter flex flex-col gap-8" style={wrap}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Inicio</h1>
        <p className="text-sm text-gray-500">Resumen de tu actividad{user?.username ? `, ${user.username}` : ''}</p>
      </div>

      <CollectionProgress owned={data.progreso.owned} total={data.progreso.total} faltan={data.progreso.faltan} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Figuritas publicadas" value={c.publicadas} sub={`+${c.excedentes} excedentes`} color={BLUE} to="/coleccion/repetidas" />
        <StatCard label="Propuestas pendientes" value={c.propuestasPendientes} sub={`${c.recibidasPendientes} recibidas`} color={GREEN} to="/propuestas/recibidas" />
        <StatCard label="Subastas activas" value={c.subastasActivas} sub={`${c.subastasPorVencer} por vencer`} color={RED} to="/subastas/activas" />
        <StatCard label="Alertas sin leer" value={c.alertasSinLeer} sub="novedades" color={BLUE} to="/notificaciones" />
      </div>

      <QuickActions />

      <Section title="Sugerencias para vos" color={PURPLE} to="/sugerencias" toLabel="Ver todas" error={data.sugerencias.error}>
        {data.sugerencias.data.length === 0 ? (
          <p className="text-sm text-gray-400">Sin sugerencias por ahora.</p>
        ) : (
          <Carousel>
            {data.sugerencias.data.map(({ key, figurita: f, contraparteNombre, figuritasAOfrecerBaseIds }) => (
              <button key={key}
                onClick={() => navigate('/propuestas/nueva', { state: { figuritaSeleccionada: f, figuritasOfrecidasBaseIds: figuritasAOfrecerBaseIds } })}
                className="text-left min-w-[180px] p-4 rounded-2xl bg-white hover:-translate-y-0.5 transition-transform" style={{ border: `1.5px solid ${PURPLE}30` }}>
                <p className="text-sm font-bold text-gray-900">{f.jugadorNombre} <span className="text-gray-400 font-normal">#{f.numero}</span></p>
                <p className="text-xs text-gray-500">{f.seleccionNombre} · {f.equipoNombre}</p>
                <p className="text-xs text-gray-400 mt-2">De @{contraparteNombre}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: PURPLE }}>Proponer →</p>
              </button>
            ))}
          </Carousel>
        )}
      </Section>

      <Section title="Propuestas recibidas" color={GREEN} to="/propuestas/recibidas" toLabel="Ver todas" error={data.recibidas.error}>
        {data.recibidas.data.length === 0 ? (
          <p className="text-sm text-gray-400">No tenés propuestas recibidas.</p>
        ) : (
          <Carousel>
            {data.recibidas.data.map((p) => (
              <PropuestaRecibidaCard key={p.id} propuesta={p}
                onAceptar={(id) => responder(id, 'aceptar')} onRechazar={(id) => responder(id, 'rechazar')} />
            ))}
          </Carousel>
        )}
        {data.enviadas.data.length > 0 && (
          <div className="rounded-2xl bg-white px-4 mt-1" style={{ border: `1.5px solid ${GREEN}20` }}>
            <p className="text-xs font-semibold text-gray-400 pt-3">Enviadas</p>
            {data.enviadas.data.slice(0, 5).map((p) => <PropuestaEnviadaRow key={p.id} propuesta={p} />)}
          </div>
        )}
      </Section>

      <Section title="Subastas activas" color={RED} to="/subastas/activas" toLabel="Ver todas" error={data.subastas.error}>
        {data.subastas.data.length === 0 ? (
          <p className="text-sm text-gray-400">No tenés subastas activas ni participando.</p>
        ) : (
          <Carousel>
            {data.subastas.data.map((s) => (
              <SubastaCard key={s.id} figurita={s.figuritaLabel} propietario={s.propietario} ofertasCount={s.ofertas}
                endTime={s.endTime} esMia={s.esMia}
                etiqueta={s.participacion === 'mia' ? 'Mi subasta' : s.participacion === 'ganando' ? 'Vas ganando' : 'Te superaron'} />
            ))}
          </Carousel>
        )}
      </Section>

      <Section title="Novedades" color={BLUE} to="/notificaciones" toLabel="Ver todas" error={data.alertas.error}>
        <NovedadesList alertas={data.alertas.data.slice(0, 5)} />
      </Section>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build y lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev` y abrir `/dashboard` con un usuario con datos. Verificar: progreso, 4 KPIs, acciones rápidas navegan, sugerencias, propuestas recibidas con Aceptar/Rechazar funcionando, subastas con countdown, novedades. Apagar el backend y confirmar que las secciones muestran error sin romper la página.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/home/DashboardPage.tsx
git commit -m "feat(dashboard): real-data dashboard assembly (US8 + US2)"
```

---

### Task 10: Limpieza y documentación

**Files:**
- Delete (si quedó sin uso): `frontend/src/pages/home/components/PropuestaCard.tsx`
- Modify: `README.md` (mapa de cobertura de US: marcar US8 dashboard real)
- Modify: `frontend/CLAUDE.md` ("Key Gotchas": el dashboard ya no es mock)

**Interfaces:**
- Consumes: nada.
- Produces: repo consistente.

- [ ] **Step 1: Verificar que `PropuestaCard` quedó sin referencias**

Run: `git grep -n "PropuestaCard" frontend/src` (ignorar `PropuestaRecibidaCard`)
Expected: sin matches a `components/PropuestaCard`. Si es así, eliminarlo:
```bash
git rm frontend/src/pages/home/components/PropuestaCard.tsx
```

- [ ] **Step 2: Actualizar `frontend/CLAUDE.md`**

En "Key Gotchas", reemplazar la mención de que `DashboardPage` es 100% mock por: el dashboard usa datos reales vía `dashboardService` (US8 + US2). Quitar `FIGURITAS/PROPUESTAS/SUBASTAS/ALERTAS` mock de la lista.

- [ ] **Step 3: Actualizar `README.md`**

En "Cobertura de User Stories", actualizar US8 a ✅ (dashboard con datos reales: figuritas publicadas, propuestas enviadas/recibidas, subastas activas, alertas) y notar el extra de progreso de colección (US2) y acciones rápidas.

- [ ] **Step 4: Verificación final**

Run: `npm run build && npm run lint && npm run test`
Expected: todo PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(dashboard): cleanup unused PropuestaCard + docs sync"
```

---

## Notas de implementación

- **Consolidación de DTOs (spec §9):** los tipos viven en `src/types/dashboard.ts` (Task 2). Migrar las páginas existentes a estos tipos queda fuera de alcance.
- **CountdownBadge cross-feature import:** `SubastaCard` importa desde `pages/subastas/components/CountdownBadge`. Si se prefiere, moverlo a `src/components/CountdownBadge.tsx` y actualizar imports de subastas (no obligatorio para esta tarjeta).
- **"Cargar figuritas":** la acción rápida usa `/coleccion`. Si existe un form de alta dedicado, apuntar ahí.
