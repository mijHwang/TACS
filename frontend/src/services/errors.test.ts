import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getApiErrorMessage } from './errors';

describe('getApiErrorMessage', () => {
  it('devuelve el message del response cuando es un AxiosError', () => {
    const err = new AxiosError('req failed');
    err.response = { data: { message: 'Oferta inválida' } } as never;
    expect(getApiErrorMessage(err, 'fallback')).toBe('Oferta inválida');
  });

  it('devuelve el fallback cuando no hay message', () => {
    expect(getApiErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
