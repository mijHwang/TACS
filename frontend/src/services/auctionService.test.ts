import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { auctionService } from './auctionService';
import type { PagedResponse } from './api';
import type { SubastaResponseDTO } from '../hooks/useSubastas';

const dto: SubastaResponseDTO = {
  id: 's1',
  usuarioId: 'u1',
  usuarioUsername: 'dueno',
  figuritaId: 'f1',
  figuritaNumero: 10,
  figuritaJugadorNombre: 'Messi',
  figuritaSeleccionNombre: 'Argentina',
  figuritaEquipoNombre: '',
  figuritaCategoriaNombre: '',
  estado: 'EN_CURSO',
  duracion: 24,
  horaInicio: '2026-06-30T10:00:00Z',
  horaFin: '2026-07-01T10:00:00Z',
  ofertasCount: 2,
  liderId: 'u2',
  liderUsername: 'lider',
  liderFiguritasNombres: [],
};

function pagedResponse(content: SubastaResponseDTO[]): PagedResponse<SubastaResponseDTO> {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, last: true };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('auctionService — adaptación de PagedResponse<SubastaResponseDTO> a Auction[]', () => {
  it('getByUsuario pide la página y mapea el DTO plano a Auction', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(pagedResponse([dto])), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const auctions = await auctionService.getByUsuario('u1');

    // URL paginada con page/size
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/subastas/usuario/u1');
    expect(calledUrl).toContain('page=0');
    expect(calledUrl).toContain('size=10');

    // Mapeo: devuelve solo el contenido de la página como Auction[]
    expect(auctions).toHaveLength(1);
    const a = auctions[0];
    expect(a.id).toBe('s1');
    expect(a.ownerId).toBe('u1');
    expect(a.ownerUsername).toBe('dueno');
    expect(a.sticker.number).toBe(10);
    expect(a.sticker.playerName).toBe('Messi');
    expect(a.endTime).toBe('2026-07-01T10:00:00Z');
    expect(a.status).toBe('active');
    // bids reconstruidos a partir de ofertasCount; el último atribuido al líder
    expect(a.bids).toHaveLength(2);
    expect(a.bids.at(-1)?.bidderId).toBe('u2');
  });

  it('getParticipando mapea FINALIZADA con líder distinto del usuario como "lost"', async () => {
    const finished: SubastaResponseDTO = { ...dto, estado: 'FINALIZADA', liderId: 'u2' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(pagedResponse([finished])), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ));

    const auctions = await auctionService.getParticipando('u1');

    expect(auctions[0].status).toBe('lost');
  });
});
