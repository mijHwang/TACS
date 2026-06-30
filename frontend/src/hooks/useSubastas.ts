import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface SubastaResponseDTO {
  id: string;
  usuarioId: string;
  usuarioUsername: string;
  figuritaId: string;
  figuritaNumero: number;
  figuritaJugadorNombre: string;
  figuritaSeleccionNombre: string;
  figuritaEquipoNombre: string;
  figuritaCategoriaNombre: string;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA';
  duracion: number;
  horaInicio: string;
  horaFin: string;
  ofertasCount: number;
  liderId: string | null;
  liderUsername: string;
  liderFiguritasNombres: string[];
}

export function useSubastasActivas() {
  return useQuery({
    queryKey: ['subastas', 'activas'],
    queryFn: async (): Promise<SubastaResponseDTO[]> => {
      const res = await api.get('/api/subastas');
      return (res.data as SubastaResponseDTO[]).filter((d) => d.estado === 'EN_CURSO');
    },
  });
}

export function useMisSubastas(userId: string | undefined) {
  return useQuery({
    queryKey: ['subastas', 'mias', userId],
    queryFn: async (): Promise<SubastaResponseDTO[]> => (await api.get(`/api/subastas/usuario/${userId}`)).data,
    enabled: !!userId,
  });
}

export function useSubastasParticipando(userId: string | undefined) {
  return useQuery({
    queryKey: ['subastas', 'participando', userId],
    queryFn: async (): Promise<SubastaResponseDTO[]> => (await api.get(`/api/subastas/participando/${userId}`)).data,
    enabled: !!userId,
  });
}

export function useOfertar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { auctionId: string; usuarioId: string; figuritaIds: string[] }) =>
      api.post(`/api/subastas/${vars.auctionId}/ofertar`, { usuarioId: vars.usuarioId, figuritaIds: vars.figuritaIds }),
    // Ofertar cambia las subastas y el contador de subastas del dashboard.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subastas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
