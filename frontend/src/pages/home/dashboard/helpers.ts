import type { AlertaTipoUI, FiguritaBaseRef } from '../../../types/dashboard';

export function nombreFigurita(fb?: FiguritaBaseRef): string {
  const jugador = fb?.jugador?.nombre?.trim();
  const numero = fb?.numero;
  if (jugador && numero != null) return `${jugador} #${numero}`;
  if (jugador) return jugador;
  if (numero != null) return `#${numero}`;
  return 'Figurita';
}

export function mapAlertaTipo(tipo?: string): AlertaTipoUI {
  if (tipo === 'propuesta' || tipo === 'subasta' || tipo === 'intercambio') return tipo;
  return 'sistema';
}

function toMs(iso?: string): number {
  if (!iso) return NaN;
  const norm = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  return Date.parse(norm);
}

export function formatRelativeTime(iso?: string, now: number = Date.now()): string {
  const ts = toMs(iso);
  if (Number.isNaN(ts)) return '';
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function isPorVencer(endTime: string, now: number = Date.now(), horas = 1): boolean {
  const ts = toMs(endTime);
  if (Number.isNaN(ts)) return false;
  const diff = ts - now;
  return diff > 0 && diff < horas * 3_600_000;
}
