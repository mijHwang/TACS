import { describe, it, expect } from 'vitest';
import { nombreFigurita, formatRelativeTime, mapAlertaTipo, isPorVencer } from './helpers';

describe('nombreFigurita', () => {
  it('arma "jugador #numero"', () => {
    expect(nombreFigurita({ numero: 10, jugador: { nombre: 'Messi' } })).toBe('Messi #10');
  });
  it('tolera datos faltantes', () => {
    expect(nombreFigurita(undefined)).toBe('Figurita');
  });
});

describe('mapAlertaTipo', () => {
  it('mapea conocidos', () => {
    expect(mapAlertaTipo('propuesta')).toBe('propuesta');
    expect(mapAlertaTipo('subasta')).toBe('subasta');
    expect(mapAlertaTipo('intercambio')).toBe('intercambio');
  });
  it('cae a sistema', () => {
    expect(mapAlertaTipo('figurita-faltante')).toBe('sistema');
    expect(mapAlertaTipo(undefined)).toBe('sistema');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-06-28T12:00:00Z');
  it('minutos', () => {
    expect(formatRelativeTime('2026-06-28T11:50:00Z', now)).toBe('hace 10 min');
  });
  it('horas', () => {
    expect(formatRelativeTime('2026-06-28T10:00:00Z', now)).toBe('hace 2 h');
  });
  it('dias', () => {
    expect(formatRelativeTime('2026-06-26T12:00:00Z', now)).toBe('hace 2 d');
  });
  it('devuelve vacio con fecha invalida o ausente', () => {
    expect(formatRelativeTime('no-es-fecha', now)).toBe('');
    expect(formatRelativeTime(undefined, now)).toBe('');
  });
  it('clampa futuro a "recién"', () => {
    expect(formatRelativeTime('2026-06-28T12:05:00Z', now)).toBe('recién');
  });
});

describe('isPorVencer', () => {
  const now = Date.parse('2026-06-28T12:00:00Z');
  it('true si vence en menos de 1h', () => {
    expect(isPorVencer('2026-06-28T12:30:00Z', now)).toBe(true);
  });
  it('false si falta mas de 1h', () => {
    expect(isPorVencer('2026-06-28T14:00:00Z', now)).toBe(false);
  });
  it('respeta la ventana de horas configurable', () => {
    expect(isPorVencer('2026-06-28T13:30:00Z', now, 2)).toBe(true);
  });
  it('false si ya expiró', () => {
    expect(isPorVencer('2026-06-28T11:00:00Z', now)).toBe(false);
  });
});
