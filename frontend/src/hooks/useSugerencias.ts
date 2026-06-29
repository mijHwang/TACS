import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { FiguritaResponseDTO } from './useFiguritas';

export interface SugerenciaResponseDTO {
  contraparteId: string;
  contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[];
  figuritasAOfrecer: FiguritaResponseDTO[];
}

/** Sugerencias bidireccionales (US4), agrupadas por contraparte. */
export function useSugerencias(username: string | undefined) {
  return useQuery({
    queryKey: ['sugerencias', username],
    queryFn: async (): Promise<SugerenciaResponseDTO[]> =>
      (await api.get(`/api/usuarios/${username}/sugerencias`)).data ?? [],
    enabled: !!username,
  });
}
