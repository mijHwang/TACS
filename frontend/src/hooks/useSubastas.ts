import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';

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

// El backend filtra por estado server-side (ActivasPage pasa estado=EN_CURSO).
export function useSubastasActivas(page = 0, size = DEFAULT_PAGE_SIZE, estado = 'EN_CURSO') {
  return useQuery({
    queryKey: ['subastas', 'activas', estado, page, size],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get('/api/subastas', { params: { estado, page, size } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useMisSubastas(userId: string | undefined, page = 0, size = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: ['subastas', 'mias', userId, page, size],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get(`/api/subastas/usuario/${userId}`, { params: { page, size } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}

export function useSubastasParticipando(userId: string | undefined, page = 0, size = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: ['subastas', 'participando', userId, page, size],
    queryFn: async (): Promise<PagedResponse<SubastaResponseDTO>> =>
      (await api.get(`/api/subastas/participando/${userId}`, { params: { page, size } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
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
