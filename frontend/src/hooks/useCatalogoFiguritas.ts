import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { FiguritaResponseDTO } from './useFiguritas';

/** Catálogo global de figuritas (todas las publicadas, GET /api/figuritas). */
export function useCatalogoFiguritas() {
  return useQuery({
    queryKey: ['figuritas', 'catalogo'],
    queryFn: async (): Promise<FiguritaResponseDTO[]> => (await api.get('/api/figuritas')).data,
  });
}
