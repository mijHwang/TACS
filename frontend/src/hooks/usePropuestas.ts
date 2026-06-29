import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

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

export function usePropuestasRecibidas(userId: string | undefined) {
  return useQuery({
    queryKey: ['propuestas', 'recibidas', userId],
    queryFn: async (): Promise<SolicitudDeIntercambio[]> => (await api.get(`/api/solicitudes-intercambio/recibidas/${userId}`)).data,
    enabled: !!userId,
  });
}

export function usePropuestasEnviadas(userId: string | undefined) {
  return useQuery({
    queryKey: ['propuestas', 'enviadas', userId],
    queryFn: async (): Promise<SolicitudDeIntercambio[]> => (await api.get(`/api/solicitudes-intercambio/enviadas/${userId}`)).data,
    enabled: !!userId,
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
    },
  });
}
