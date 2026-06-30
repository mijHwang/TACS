import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PagedResponse } from '../services/api';
import { useCatalogoFiguritas } from './useCatalogoFiguritas';
import type { FiguritaResponseDTO } from './useFiguritas';

const getMock = vi.fn();
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, default: { get: (...args: unknown[]) => getMock(...args) } };
});

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const fig = (id: string): FiguritaResponseDTO => ({
  id, figuritaBaseId: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', count: 1, ownerId: 'u9', ownerName: 'sofi', imagenUrl: null,
});

const page = (content: FiguritaResponseDTO[], pageNum: number): PagedResponse<FiguritaResponseDTO> => ({
  content, page: pageNum, size: 10, totalElements: 25, totalPages: 3, last: pageNum === 2,
});

describe('useCatalogoFiguritas', () => {
  beforeEach(() => { getMock.mockReset(); });

  it('manda page/size y los filtros como params, y devuelve el PagedResponse', async () => {
    getMock.mockResolvedValueOnce({ data: page([fig('f1')], 0) });

    const { result } = renderHook(
      () => useCatalogoFiguritas({ page: 0, usuarioId: 'me', search: 'mes' }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMock).toHaveBeenCalledWith(
      '/api/figuritas',
      { params: { size: 10, page: 0, usuarioId: 'me', search: 'mes' } },
    );
    expect(result.current.data?.content[0].id).toBe('f1');
    expect(result.current.data?.totalPages).toBe(3);
  });

  it('keyea en los params: cambiar de página dispara otra consulta', async () => {
    getMock
      .mockResolvedValueOnce({ data: page([fig('f1')], 0) })
      .mockResolvedValueOnce({ data: page([fig('f2')], 1) });

    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useCatalogoFiguritas({ page: p }),
      { wrapper: wrapper(), initialProps: { p: 0 } },
    );
    await waitFor(() => expect(result.current.data?.content[0].id).toBe('f1'));

    rerender({ p: 1 });
    await waitFor(() => expect(result.current.data?.content[0].id).toBe('f2'));

    expect(getMock).toHaveBeenLastCalledWith(
      '/api/figuritas',
      { params: { size: 10, page: 1 } },
    );
  });
});
