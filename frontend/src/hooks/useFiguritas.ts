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
