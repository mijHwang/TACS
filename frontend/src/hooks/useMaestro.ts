import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';
import type { FiguritaBaseDTO } from './useFiguritas';

/** Parámetros del maestro paginado para el modal de agregar figurita. */
export interface MaestroParams {
  page: number;
  size?: number;
  search?: string;
  /** Si viene, el backend excluye las bases que ese usuario ya posee (modo faltantes). */
  excludeOwnedBy?: string;
}

/** Maestro de figuritas-base paginado + búsqueda (`GET /api/figuritas-base/search`). */
export function useMaestro(p: MaestroParams) {
  return useQuery({
    queryKey: ['figuritas-base', 'search', p],
    queryFn: async (): Promise<PagedResponse<FiguritaBaseDTO>> =>
      (await api.get('/api/figuritas-base/search', { params: { size: DEFAULT_PAGE_SIZE, ...p } })).data,
    placeholderData: keepPreviousData,
  });
}
