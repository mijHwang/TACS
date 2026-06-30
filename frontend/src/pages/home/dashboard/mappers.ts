import type {
  SolicitudDeIntercambio, PropuestaVM, NotificacionDTO, AlertaVM, SubastaVM,
  FiguritaResponseDTO, SugerenciaResponseDTO, SugerenciaFlatVM,
} from '../../../types/dashboard';
import type { Auction } from '../../../types/auction';
import { nombreFigurita, mapAlertaTipo, formatRelativeTime } from './helpers';

export function mapPropuesta(s: SolicitudDeIntercambio, tipo: 'enviada' | 'recibida'): PropuestaVM {
  const contraparte = tipo === 'recibida'
    ? (s.usuario?.username ?? 'usuario')
    : (s.destinatarioUsername ?? s.figurita?.owner?.username ?? 'usuario');
  return {
    id: s.id,
    tipo,
    contraparte,
    ofrece: (s.figuritasOfrecidas ?? []).map(f => nombreFigurita(f.figuritaBase)),
    pide: nombreFigurita(s.figurita?.figuritaBase),
    estado: s.estado,
  };
}

export function mapSubastasActivas(
  mias: Auction[], participando: Auction[], userId: string,
): SubastaVM[] {
  const byId = new Map<string, Auction>();
  [...mias, ...participando].forEach(a => { if (!byId.has(a.id)) byId.set(a.id, a); });
  return [...byId.values()]
    .filter(a => a.status === 'active')
    .map(a => {
      const esMia = a.ownerId === userId;
      const ultimaEsMia = a.bids.at(-1)?.bidderId === userId;
      return {
        id: a.id,
        figuritaLabel: `${a.sticker.playerName} #${a.sticker.number} ${a.sticker.country}`.trim(),
        esMia,
        propietario: esMia ? 'vos' : a.ownerUsername,
        ofertas: a.bids.length,
        endTime: a.endTime,
        participacion: esMia ? 'mia' : (ultimaEsMia ? 'ganando' : 'superado'),
      };
    });
}

export function mapAlertas(ns: NotificacionDTO[], now: number = Date.now()): AlertaVM[] {
  return ns
    .filter(n => !n.leida)
    .sort((a, b) => Date.parse(b.fecha ?? '') - Date.parse(a.fecha ?? ''))
    .map(n => ({
      id: n.id,
      tipo: mapAlertaTipo(n.tipo),
      texto: n.titulo ?? n.mensaje ?? 'Notificación',
      tiempo: formatRelativeTime(n.fecha, now),
      leida: false,
    }));
}

export function getPublicadas(figuritas: FiguritaResponseDTO[]): FiguritaResponseDTO[] {
  return figuritas.filter(f => f.count > 1);
}

export function sumExcedentes(publicadas: FiguritaResponseDTO[]): number {
  return publicadas.reduce((acc, f) => acc + (f.count - 1), 0);
}

export function flattenSugerencias(ss: SugerenciaResponseDTO[], max = 8): SugerenciaFlatVM[] {
  return ss
    .flatMap(s => s.figuritasARecibir.map(f => ({
      key: `${s.contraparteId}-${f.id}`,
      figurita: f,
      contraparteNombre: s.contraparteNombre,
      figuritasAOfrecerBaseIds: s.figuritasAOfrecer.map(x => x.figuritaBaseId),
    })))
    .slice(0, max);
}

