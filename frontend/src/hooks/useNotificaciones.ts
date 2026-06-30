import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  enlace: string;
}

export function useNotificaciones(userId: string | undefined) {
  return useQuery({
    queryKey: ['notificaciones', userId],
    queryFn: async (): Promise<Notificacion[]> => {
      const res = await api.get(`/api/notificaciones/usuario/${userId}`);
      return [...res.data].sort((a: Notificacion, b: Notificacion) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    },
    enabled: !!userId,
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
