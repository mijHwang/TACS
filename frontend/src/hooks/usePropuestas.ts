import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../services/api';

export interface Usuario { id: string; username: string; password?: string; email?: string; figuritas?: Figurita[]; }
export interface FiguritaBase {
  id: string; numero?: number;
  seleccion: { id: string; nombre: string; grupo: string };
  equipo: { id: string; nombre: string };
  categoria: { id: string; nombre: string };
  jugador: { id: string; nombre: string };
}
export interface Figurita { id: string; figuritaBase: FiguritaBase; owner?: Usuario; }
export interface SolicitudDeIntercambio {
  id: string; usuario: Usuario; figurita: Figurita; figuritasOfrecidas: Figurita[];
  cantidadDisponible: number; estado: string; destinatarioUsername: string;
}

export function usePropuestasRecibidas(userId: string | undefined, page = 0, size = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: ['propuestas', 'recibidas', userId, page, size],
    queryFn: async (): Promise<PagedResponse<SolicitudDeIntercambio>> =>
      (await api.get(`/api/solicitudes-intercambio/recibidas/${userId}`, { params: { page, size } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}

export function usePropuestasEnviadas(userId: string | undefined, page = 0, size = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: ['propuestas', 'enviadas', userId, page, size],
    queryFn: async (): Promise<PagedResponse<SolicitudDeIntercambio>> =>
      (await api.get(`/api/solicitudes-intercambio/enviadas/${userId}`, { params: { page, size } })).data,
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
}

export function useResponderPropuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { propuestaId: string; accion: 'aceptar' | 'rechazar' }) =>
      api.put(`/api/solicitudes-intercambio/${vars.propuestaId}/${vars.accion}`),
    // Aceptar un intercambio cambia propuestas, el resumen del dashboard y la colección (se transfiere la figurita).
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['propuestas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['figuritas'] });
    },
  });
}

export function useCrearPropuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      usuarioId: string;
      usuarioDestino: string;
      figuritaId: string;
      figuritasOfrecidas: string[];
      estado: string;
    }) => api.post('/api/solicitudes-intercambio', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['propuestas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      // crear una propuesta suele originarse en una sugerencia, así que se refresca esa lista
      qc.invalidateQueries({ queryKey: ['sugerencias'] });
    },
  });
}
