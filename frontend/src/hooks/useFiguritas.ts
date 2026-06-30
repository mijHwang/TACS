import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';

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

export interface FiguritaBaseDTO {
  id: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  imagenUrl?: string | null;
}

/** Filtros server-side comunes a colección/faltantes/repetidas. */
export interface FiltrosColeccion {
  page: number;
  size?: number;
  search?: string;
  seleccion?: string;
  equipo?: string;
  categoria?: string;
}

/**
 * Colección COMPLETA del usuario (sin paginar). La usa "Nueva propuesta", que necesita toda la
 * lista para mantener la selección entre páginas y el prefill desde Sugerencia. Pide una página
 * grande y devuelve sólo el contenido.
 */
export function useFiguritas(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', username, 'all'],
    queryFn: async (): Promise<FiguritaResponseDTO[]> => {
      const res = await api.get(`/api/usuarios/${username}/figuritas`, { params: { page: 0, size: 2000 } });
      return res.data.content as FiguritaResponseDTO[];
    },
    enabled: !!username,
  });
}

/** Colección del usuario paginada y filtrada server-side (agrupada por base, con cantidad). */
export function useFiguritasPaginadas(username: string | undefined, p: FiltrosColeccion) {
  return useQuery({
    queryKey: ['figuritas', 'pag', username, p],
    queryFn: async (): Promise<PagedResponse<FiguritaResponseDTO>> =>
      (await api.get(`/api/usuarios/${username}/figuritas`, { params: { size: DEFAULT_PAGE_SIZE, ...p } })).data,
    enabled: !!username,
    placeholderData: keepPreviousData,
  });
}

/** Repetidas del usuario (count > 1) paginadas y filtradas server-side. */
export function useRepetidasPaginadas(username: string | undefined, p: FiltrosColeccion) {
  return useQuery({
    queryKey: ['figuritas', 'repetidas', 'pag', username, p],
    queryFn: async (): Promise<PagedResponse<FiguritaResponseDTO>> =>
      (await api.get(`/api/usuarios/${username}/figuritas/repetidas`, { params: { size: DEFAULT_PAGE_SIZE, ...p } })).data,
    enabled: !!username,
    placeholderData: keepPreviousData,
  });
}

/** Figuritas que el usuario no tiene, paginadas y filtradas server-side. */
export function useFaltantesPaginadas(username: string | undefined, p: FiltrosColeccion) {
  return useQuery({
    queryKey: ['figuritas', 'faltantes', 'pag', username, p],
    queryFn: async (): Promise<PagedResponse<FiguritaBaseDTO>> =>
      (await api.get(`/api/usuarios/${username}/figuritas/faltantes`, { params: { size: DEFAULT_PAGE_SIZE, ...p } })).data,
    enabled: !!username,
    placeholderData: keepPreviousData,
  });
}
