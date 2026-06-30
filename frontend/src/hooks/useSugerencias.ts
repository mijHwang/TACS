import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';
import type { FiguritaResponseDTO } from './useFiguritas';

export interface SugerenciaResponseDTO {
  contraparteId: string;
  contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[];
  figuritasAOfrecer: FiguritaResponseDTO[];
}

/** Sugerencias bidireccionales (US4), agrupadas por contraparte. Paginadas (0-based). */
export function useSugerencias(username: string | undefined, page = 0, size = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: ['sugerencias', username, page, size],
    queryFn: async (): Promise<PagedResponse<SugerenciaResponseDTO>> =>
      (await api.get(`/api/usuarios/${username}/sugerencias`, { params: { page, size } })).data,
    enabled: !!username,
    placeholderData: keepPreviousData,
  });
}
