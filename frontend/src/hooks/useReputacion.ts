import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface Reputacion {
  score: number;
  total: number;
  cincoEstrellas: number;
  cuatroEstrellas: number;
  tresEstrellas: number;
  dosEstrellas: number;
  unaEstrella: number;
}

/** Reputación del usuario (promedio + histograma). Solo con id real hidratado. */
export function useReputacion(userId: string | undefined, username: string | undefined) {
  return useQuery({
    queryKey: ['reputacion', userId],
    queryFn: async (): Promise<Reputacion> =>
      (await api.get(`/api/intercambios/usuario/${userId}/reputacion`)).data,
    enabled: !!userId && userId !== username,
  });
}
