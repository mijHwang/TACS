import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';
import type { FiguritaResponseDTO } from './useFiguritas';

/** Parámetros del catálogo paginado. `usuarioId` = caller a excluir (no muestra lo propio). */
export interface CatalogoParams {
  page: number;
  size?: number;
  usuarioId?: string;
  figuritaBaseId?: string;
  numero?: number;
  search?: string;
  seleccion?: string;
  equipo?: string;
  categoria?: string;
}

/** Catálogo de figuritas paginado y filtrado server-side (agrupado por figurita-base). */
export function useCatalogoFiguritas(params: CatalogoParams) {
  return useQuery({
    queryKey: ['figuritas', 'catalogo', params],
    queryFn: async (): Promise<PagedResponse<FiguritaResponseDTO>> =>
      (await api.get('/api/figuritas', { params: { size: DEFAULT_PAGE_SIZE, ...params } })).data,
    placeholderData: keepPreviousData,
  });
}
