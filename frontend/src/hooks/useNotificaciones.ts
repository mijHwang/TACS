import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  enlace: string;
}

export function useNotificaciones(
  userId: string | undefined,
  page = 0,
  size = DEFAULT_PAGE_SIZE,
) {
  return useQuery({
    queryKey: ['notificaciones', userId, page, size],
    queryFn: async (): Promise<PagedResponse<Notificacion>> => {
      // El backend ordena por fecha desc (más recientes primero) y pagina server-side.
      const res = await api.get(`/api/notificaciones/usuario/${userId}`, {
        params: { page, size },
      });
      return res.data as PagedResponse<Notificacion>;
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}

export function useMarcarLeida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/api/notificaciones/${id}/leer`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
}

export function useEliminarNotificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/notificaciones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
}

export function useLimpiarNotificaciones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => api.delete(`/api/notificaciones/${id}`))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
}
