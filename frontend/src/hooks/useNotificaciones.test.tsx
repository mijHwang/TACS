import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PagedResponse } from '../services/api';
import { useNotificaciones, type Notificacion } from './useNotificaciones';

// Mock del cliente axios: sólo necesitamos api.get.
const getMock = vi.fn();
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    default: { get: (...args: unknown[]) => getMock(...args) },
  };
});

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const notif = (id: string): Notificacion => ({
  id, tipo: 'subasta', titulo: 'T', mensaje: 'M', leida: false,
  fecha: '2026-06-28T11:00:00Z', enlace: '',
});

const page = (content: Notificacion[], pageNum: number): PagedResponse<Notificacion> => ({
  content, page: pageNum, size: 10, totalElements: 25, totalPages: 3, last: pageNum === 2,
});

describe('useNotificaciones', () => {
  beforeEach(() => { getMock.mockReset(); });

  it('pide ?page&size y devuelve el PagedResponse sin remapear', async () => {
    getMock.mockResolvedValueOnce({ data: page([notif('n1')], 0) });

    const { result } = renderHook(() => useNotificaciones('u1', 0), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith(
      '/api/notificaciones/usuario/u1',
      { params: { page: 0, size: 10 } },
    );
    expect(result.current.data?.content).toHaveLength(1);
    expect(result.current.data?.content[0].id).toBe('n1');
    expect(result.current.data?.totalElements).toBe(25);
    expect(result.current.data?.totalPages).toBe(3);
    expect(result.current.data?.last).toBe(false);
  });

  it('keyea en la página: cambiar page dispara otra consulta', async () => {
    getMock
      .mockResolvedValueOnce({ data: page([notif('n1')], 0) })
      .mockResolvedValueOnce({ data: page([notif('n2')], 1) });

    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useNotificaciones('u1', p),
      { wrapper: wrapper(), initialProps: { p: 0 } },
    );
    await waitFor(() => expect(result.current.data?.content[0].id).toBe('n1'));

    rerender({ p: 1 });
    await waitFor(() => expect(result.current.data?.content[0].id).toBe('n2'));

    expect(getMock).toHaveBeenLastCalledWith(
      '/api/notificaciones/usuario/u1',
      { params: { page: 1, size: 10 } },
    );
  });

  it('no consulta sin userId', () => {
    renderHook(() => useNotificaciones(undefined), { wrapper: wrapper() });
    expect(getMock).not.toHaveBeenCalled();
  });
});
