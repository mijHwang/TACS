import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { FiguritaBaseDTO } from './useFiguritas';

const PAGE = 100;

/** Set de `figuritaBaseId` en la wishlist declarada del usuario (recorre todas las páginas). */
export function useWishlistBaseIds(username: string | undefined) {
  return useQuery({
    queryKey: ['faltantes', 'ids', username],
    enabled: !!username,
    queryFn: async (): Promise<Set<string>> => {
      const ids = new Set<string>();
      let page = 0;
      // El cap del backend es 100 por página → paginamos hasta agotar para no perder ids.
      for (;;) {
        const res = await api.get(`/api/usuarios/${username}/figuritas/faltantes`, { params: { page, size: PAGE } });
        const content = (res.data.content ?? []) as FiguritaBaseDTO[];
        content.forEach((b) => ids.add(b.id));
        if (res.data.last || content.length === 0) break;
        page += 1;
      }
      return ids;
    },
  });
}
