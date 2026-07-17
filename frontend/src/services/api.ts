import axios from 'axios';

// Origen de la API. En el build de producción se inyecta VITE_API_URL="" → mismo origen
// (todas las llamadas pasan por Nginx). En desarrollo (npm run dev) cae al backend local.
const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

const api = axios.create({
  baseURL: API_ORIGIN,
  headers: { 'Content-Type': 'application/json' },
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  onUnauthorized?.();
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;

import type { Sticker, Bid, Auction, AuctionCondition, AuctionStatus } from '../types/auction';

export const BASE_URL = `${API_ORIGIN}/api`;

// ── Backend types ─────────────────────────────────────────────────────────────

export interface BackendFiguritaBase {
  id?: string;
  numero?: number;
  seleccion?: { id?: string; nombre?: string; grupo?: string };
  equipo?: { id?: string; nombre?: string };
  jugador?: { id?: string; nombre?: string };
}

export interface BackendFigurita {
  id: string;
  figuritaBase?: BackendFiguritaBase;
}

export interface BackendCondicion {
  id?: string;
  tipo?: string;
  valor?: string;
}

export interface BackendUsuario {
  id: string;
  username?: string;
  figuritas?: BackendFigurita[];
}

export interface BackendOferta {
  id: string;
  figuritas?: BackendFigurita[];
  usuario?: BackendUsuario;
  estado?: string;
  fechaOferta?: string;
}

export interface BackendSubasta {
  id: string;
  usuario?: BackendUsuario;
  ofertas?: BackendOferta[];
  figurita?: BackendFigurita;
  duracion?: number;
  condiciones?: BackendCondicion[];
  estado?: string;
  horaInicio?: string;
  horaFin?: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

export function mapFigurita(f: BackendFigurita): Sticker {
  return {
    id: f.id,
    number: f.figuritaBase?.numero ?? 0,
    playerName: f.figuritaBase?.jugador?.nombre ?? '',
    country: f.figuritaBase?.seleccion?.nombre ?? '',
  };
}

export function mapCondicion(c: BackendCondicion): AuctionCondition | null {
  const { tipo, valor = '' } = c;
  if (tipo === 'min_stickers') return { type: 'min_stickers', value: parseInt(valor, 10) };
  if (tipo === 'country') return { type: 'country', value: valor };
  if (tipo === 'specific_sticker') return { type: 'specific_sticker', value: parseInt(valor, 10) };
  return null;
}

export function mapOferta(o: BackendOferta): Bid {
  return {
    id: o.id,
    bidderId: o.usuario?.id ?? '',
    bidderUsername: o.usuario?.username ?? '',
    stickers: (o.figuritas ?? []).map(mapFigurita),
    placedAt: o.fechaOferta ?? new Date().toISOString(),
  };
}

function mapEstado(
  estado: string | undefined,
  ofertas: BackendOferta[],
  currentUserId?: string,
): AuctionStatus {
  if (!estado || estado === 'PENDIENTE' || estado === 'EN_CURSO') return 'active';
  if (estado === 'FINALIZADA') {
    if (currentUserId) {
      const lastBid = ofertas.at(-1);
      if (lastBid?.usuario?.id === currentUserId) return 'won';
      if (ofertas.some(o => o.usuario?.id === currentUserId)) return 'lost';
    }
    return 'finished';
  }
  return 'finished';
}

export function mapSubasta(s: BackendSubasta, currentUserId?: string): Auction {
  const ofertas = s.ofertas ?? [];
  return {
    id: s.id,
    ownerId: s.usuario?.id ?? '',
    ownerUsername: s.usuario?.username ?? '',
    sticker: s.figurita ? mapFigurita(s.figurita) : { id: '', number: 0, playerName: '', country: '' },
    bids: ofertas.map(mapOferta),
    endTime: s.horaFin ?? new Date().toISOString(),
    createdAt: s.horaInicio ?? new Date().toISOString(),
    status: mapEstado(s.estado, ofertas, currentUserId),
    conditions: (s.condiciones ?? [])
      .map(mapCondicion)
      .filter((c): c is AuctionCondition => c !== null),
  };
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`API 401: ${path}`);
  }
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.message;
    } catch {
      // response wasn't JSON, fall through with no detail
    }
    throw new Error(detail ?? `API ${res.status}: ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Pagination envelope ─────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface PagedResponse<T> {
  content: T[];
  page: number;          // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/** Maps the inner list of a page while keeping the pagination metadata. */
export function mapPage<A, B>(res: PagedResponse<A>, fn: (a: A) => B): PagedResponse<B> {
  return { ...res, content: res.content.map(fn) };
}
