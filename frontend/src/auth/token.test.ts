import { describe, it, expect } from 'vitest';
import { decodeToken, isTokenExpired } from './token';

// helper: arma un JWT no firmado con el payload dado (base64url)
function makeToken(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

describe('decodeToken', () => {
  it('extrae sub y roles de un token válido', () => {
    const t = makeToken({ sub: 'ana', roles: ['ROLE_ADMIN'] });
    expect(decodeToken(t)).toEqual({ sub: 'ana', roles: ['ROLE_ADMIN'] });
  });
  it('devuelve null ante un token corrupto', () => {
    expect(decodeToken('no-es-un-jwt')).toBeNull();
    expect(decodeToken('a.b')).toBeNull();
  });
  it('roles default a [] si falta', () => {
    expect(decodeToken(makeToken({ sub: 'x' }))).toEqual({ sub: 'x', roles: [] });
  });
});

describe('isTokenExpired', () => {
  it('true si exp ya pasó', () => {
    expect(isTokenExpired(makeToken({ sub: 'x', exp: 1 }))).toBe(true);
  });
  it('false si exp es futuro lejano', () => {
    expect(isTokenExpired(makeToken({ sub: 'x', exp: 4102444800 }))).toBe(false);
  });
  it('false (no bloquea) si no hay exp o el token es inválido', () => {
    expect(isTokenExpired(makeToken({ sub: 'x' }))).toBe(false);
    expect(isTokenExpired('basura')).toBe(false);
  });
});
