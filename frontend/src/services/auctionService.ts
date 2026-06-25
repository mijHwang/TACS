import type { Auction, AuctionCondition, Sticker } from '../types/auction';
import { apiFetch, mapSubasta, type BackendSubasta } from './api';


function mapFiguritaToSticker(figurita: any): Sticker {
  return {
    id: figurita.id,
    number: figurita.numero,
    playerName: figurita.jugadorNombre,
    country: figurita.seleccionNombre,
  };
}

export { mapFiguritaToSticker };

export const auctionService = {

  async getAll(currentUserId?: string): Promise<Auction[]> {
    const data = await apiFetch<BackendSubasta[]>('/subastas');
    return data.map(s => mapSubasta(s, currentUserId));
  },

  async getByUsuario(usuarioId: string): Promise<Auction[]> {
    const data = await apiFetch<BackendSubasta[]>(`/subastas/usuario/${usuarioId}`);
    return data.map(s => mapSubasta(s, usuarioId));
  },

  async getParticipando(usuarioId: string): Promise<Auction[]> {
    const data = await apiFetch<BackendSubasta[]>(`/subastas/participando/${usuarioId}`);
    return data.map(s => mapSubasta(s, usuarioId));
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
