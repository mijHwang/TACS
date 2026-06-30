import type { Auction, AuctionCondition, AuctionStatus, Bid, Sticker } from '../types/auction';
import { apiFetch, mapSubasta, mapPage, DEFAULT_PAGE_SIZE, type BackendSubasta, type PagedResponse } from './api';
import type { SubastaResponseDTO } from '../hooks/useSubastas';

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

export { mapFiguritaToSticker };

function dtoEstadoToStatus(estado: SubastaResponseDTO['estado'], liderId: string | null, currentUserId?: string): AuctionStatus {
  if (estado === 'PENDIENTE' || estado === 'EN_CURSO') return 'active';
  // FINALIZADA: si el líder soy yo gané; si participé pero no soy líder, perdí.
  if (currentUserId && liderId) {
    return liderId === currentUserId ? 'won' : 'lost';
  }
  return 'finished';
}

/**
 * Adapta el SubastaResponseDTO (plano) del backend al modelo `Auction` del front.
 * Reconstruye `bids` con longitud = ofertasCount y la última oferta atribuida al líder,
 * para preservar la semántica que consume el dashboard (`bids.length`, `bids.at(-1)?.bidderId`).
 */
function mapSubastaDTO(d: SubastaResponseDTO, currentUserId?: string): Auction {
  const bids: Bid[] = Array.from({ length: Math.max(0, d.ofertasCount) }, (_, i) => ({
    id: `${d.id}-bid-${i}`,
    bidderId: i === d.ofertasCount - 1 ? (d.liderId ?? '') : '',
    bidderUsername: i === d.ofertasCount - 1 ? (d.liderUsername ?? '') : '',
    stickers: [],
    placedAt: d.horaInicio ?? new Date().toISOString(),
  }));
  return {
    id: d.id,
    ownerId: d.usuarioId ?? '',
    ownerUsername: d.usuarioUsername ?? '',
    sticker: {
      id: d.figuritaId ?? '',
      number: d.figuritaNumero ?? 0,
      playerName: d.figuritaJugadorNombre ?? '',
      country: d.figuritaSeleccionNombre ?? '',
    },
    bids,
    endTime: d.horaFin ?? new Date().toISOString(),
    createdAt: d.horaInicio ?? new Date().toISOString(),
    status: dtoEstadoToStatus(d.estado, d.liderId, currentUserId),
    conditions: [],
  };
}

export const auctionService = {

  async getAll(currentUserId?: string, page = 0, size = DEFAULT_PAGE_SIZE): Promise<Auction[]> {
    const res = await apiFetch<PagedResponse<SubastaResponseDTO>>(`/subastas?estado=EN_CURSO&page=${page}&size=${size}`);
    return mapPage(res, s => mapSubastaDTO(s, currentUserId)).content;
  },

  async getByUsuario(usuarioId: string, page = 0, size = DEFAULT_PAGE_SIZE): Promise<Auction[]> {
    const res = await apiFetch<PagedResponse<SubastaResponseDTO>>(`/subastas/usuario/${usuarioId}?page=${page}&size=${size}`);
    return mapPage(res, s => mapSubastaDTO(s, usuarioId)).content;
  },

  async getParticipando(usuarioId: string, page = 0, size = DEFAULT_PAGE_SIZE): Promise<Auction[]> {
    const res = await apiFetch<PagedResponse<SubastaResponseDTO>>(`/subastas/participando/${usuarioId}?page=${page}&size=${size}`);
    return mapPage(res, s => mapSubastaDTO(s, usuarioId)).content;
  },

  async finalizar(auctionId: string): Promise<Auction> {
     const data = await apiFetch<BackendSubasta>(`/subastas/${auctionId}/finalizar`, {
       method: 'PUT',
     });
     return mapSubasta(data);
   },

  /** Crea una subasta. El sticker se construye a partir del objeto Sticker del frontend. */
  async create(payload: {
  sticker: Sticker;
  durationHours: number;
  conditions: AuctionCondition[];
  userId: string;
  username: string;
}): Promise<Auction> {
  // FIXED: Send correct SubastaDTO structure
  const body = {
    usuarioId: payload.userId,
    figuritaId: payload.sticker.id,  // Use the sticker ID (figuritaBaseId)
    duracion: payload.durationHours,
    condiciones: payload.conditions.map(c => ({ tipo: c.type, valor: String(c.value) })),
  };

  const data = await apiFetch<BackendSubasta>('/subastas', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapSubasta(data, payload.userId);
},


  /**
   * Agrega una oferta a una subasta.
   * Estrategia: POST /api/ofertas → GET /api/subastas/{id} → PUT /api/subastas/{id}
   * (el backend no tiene endpoint dedicado para agregar ofertas a una subasta)
   */
  async placeBid(auctionId: string, payload: {
  stickers: Sticker[];
  userId: string;
  username: string;
}): Promise<void> {
  // Single atomic call to backend
  await apiFetch(`/ofertas/subasta/${auctionId}`, {
    method: 'POST',
    body: JSON.stringify({
      usuarioId: payload.userId,
      figuritaIds: payload.stickers.map(s => s.id),
    }),
  });
},
};
