import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { type PagedResponse } from '../services/api';
import type { FiguritaBaseDTO } from './useFiguritas';

/**
 * Búsqueda paginada de figuritas-base por texto (nombre de jugador/selección o número).
 * Usada por el typeahead de "regalar figurita" (admin). Sólo consulta con 2+ caracteres.
 */
export function useBaseSearch(search: string, page = 0, size = 10) {
  return useQuery({
    queryKey: ['figuritas-base', 'search', search, page, size],
    queryFn: async (): Promise<PagedResponse<FiguritaBaseDTO>> =>
      (await api.get('/api/figuritas-base/search', { params: { search, page, size } })).data,
    enabled: search.trim().length >= 2,
    placeholderData: keepPreviousData,
  });
}
