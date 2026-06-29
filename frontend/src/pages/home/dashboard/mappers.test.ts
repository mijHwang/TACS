import { describe, it, expect } from 'vitest';
import { mapPropuesta, mapSubastasActivas, mapAlertas, getPublicadas, sumExcedentes, flattenSugerencias } from './mappers';
import type { SolicitudDeIntercambio, NotificacionDTO, FiguritaResponseDTO, SugerenciaResponseDTO } from '../../../types/dashboard';
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

describe('flattenSugerencias', () => {
  it('flattens figuritasARecibir, propagates fields, respects max', () => {
    const s: SugerenciaResponseDTO = {
      contraparteId: 'u2',
      contraparteNombre: 'Sofia',
      figuritasARecibir: [fig('to1', 1), fig('to2', 1)],
      figuritasAOfrecer: [fig('from1', 1)],
    };
    const out = flattenSugerencias([s]);
    expect(out).toHaveLength(2);
    expect(out[0].key).toBe('u2-to1');
    expect(out[0].contraparteNombre).toBe('Sofia');
    expect(out[0].figuritasAOfrecerBaseIds).toEqual(['from1']);
    expect(out[1].key).toBe('u2-to2');
    expect(out[1].contraparteNombre).toBe('Sofia');
  });
});
