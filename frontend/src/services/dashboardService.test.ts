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
