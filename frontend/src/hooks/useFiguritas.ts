import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface FiguritaResponseDTO {
  id: string;
  figuritaBaseId: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  count: number;
  ownerId: string;
  ownerName: string;
  imagenUrl?: string | null;
}

/** Colección completa del usuario, cacheada por username. */
export function useFiguritas(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', username],
    queryFn: async (): Promise<FiguritaResponseDTO[]> => {
      const res = await api.get(`/api/usuarios/${username}/figuritas`);
      return res.data;
    },
    enabled: !!username,
  });
}

export interface FiguritaBaseDTO {
  id: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  imagenUrl?: string | null;
}

/** Repetidas del usuario (count > 1). Solo lectura. */
export function useRepetidas(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', 'repetidas', username],
    queryFn: async (): Promise<FiguritaResponseDTO[]> =>
      (await api.get(`/api/usuarios/${username}/figuritas/repetidas`)).data,
    enabled: !!username,
  });
}

/** Figuritas que el usuario no tiene. */
export function useFaltantes(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', 'faltantes', username],
    queryFn: async (): Promise<FiguritaBaseDTO[]> =>
      (await api.get(`/api/usuarios/${username}/figuritas/faltantes`)).data,
    enabled: !!username,
  });
}
