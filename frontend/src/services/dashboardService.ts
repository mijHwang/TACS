import { apiFetch, type PagedResponse } from './api';
import { auctionService } from './auctionService';
import type { Auction } from '../types/auction';
import type {
  FiguritaResponseDTO, SolicitudDeIntercambio, NotificacionDTO,
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

// El dashboard sólo necesita un resumen; de los endpoints ahora paginados pedimos la primera
// página grande (size=100, el máximo) y leemos `.content`. Los contadores quedan exactos hasta
// 100 ítems por fuente (suficiente para el resumen). Las fuentes no paginadas (figuritas,
// faltantes) se piden igual.
const DASH_SIZE = 100;
const defaultDeps: DashboardDeps = {
  fetchFiguritas: (u) => apiFetch<FiguritaResponseDTO[]>(`/usuarios/${u}/figuritas`),
  fetchFaltantes: (u) => apiFetch<unknown[]>(`/usuarios/${u}/figuritas/faltantes`),
  fetchEnviadas: (id) => apiFetch<PagedResponse<SolicitudDeIntercambio>>(`/solicitudes-intercambio/enviadas/${id}?page=0&size=${DASH_SIZE}`).then(r => r.content),
  fetchRecibidas: (id) => apiFetch<PagedResponse<SolicitudDeIntercambio>>(`/solicitudes-intercambio/recibidas/${id}?page=0&size=${DASH_SIZE}`).then(r => r.content),
  fetchMisSubastas: (id) => auctionService.getByUsuario(id, 0, DASH_SIZE),
  fetchParticipando: (id) => auctionService.getParticipando(id, 0, DASH_SIZE),
  fetchNotificaciones: (id) => apiFetch<PagedResponse<NotificacionDTO>>(`/notificaciones/usuario/${id}?page=0&size=${DASH_SIZE}`).then(r => r.content),
  fetchSugerencias: (u) => apiFetch<PagedResponse<SugerenciaResponseDTO>>(`/usuarios/${u}/sugerencias?page=0&size=${DASH_SIZE}`).then(r => r.content),
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
  const subastas = mapSubastasActivas(miasR.data, partR.data, userId);
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
