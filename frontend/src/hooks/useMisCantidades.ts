import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { FiguritaResponseDTO } from './useFiguritas';

/** Mapa `figuritaBaseId → cantidad poseída` del usuario (una sola consulta, sin paginar). */
export function useMisCantidades(username: string | undefined) {
  return useQuery({
    queryKey: ['figuritas', 'cantidades', username],
    enabled: !!username,
    queryFn: async (): Promise<Map<string, number>> => {
      const res = await api.get(`/api/usuarios/${username}/figuritas`, { params: { page: 0, size: 2000 } });
      const content = (res.data.content ?? []) as FiguritaResponseDTO[];
      return new Map(content.map((f) => [f.figuritaBaseId, f.count]));
    },
  });
}
