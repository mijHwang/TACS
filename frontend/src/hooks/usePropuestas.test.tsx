import '@testing-library/jest-dom';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { usePropuestasRecibidas, usePropuestasEnviadas } from './usePropuestas';

// Mock the shared axios instance used by the hooks.
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    default: { get: vi.fn() },
  };
});

import api from '../services/api';
const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

const paged = (ids: string[]) => ({
  data: {
    content: ids.map((id) => ({ id, estado: 'PENDIENTE' })),
    page: 0,
    size: 10,
    totalElements: ids.length,
    totalPages: 1,
    last: true,
  },
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('usePropuestas (paginado)', () => {
  beforeEach(() => mockedGet.mockReset());

  it('usePropuestasRecibidas pide page/size y devuelve el PagedResponse', async () => {
    mockedGet.mockResolvedValueOnce(paged(['s1', 's2']));
    const { result } = renderHook(() => usePropuestasRecibidas('u1', 2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith(
      '/api/solicitudes-intercambio/recibidas/u1',
      { params: { page: 2, size: 10 } },
    );
    expect(result.current.data?.content.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(result.current.data?.totalPages).toBe(1);
  });

  it('usePropuestasEnviadas pide page/size y devuelve el PagedResponse', async () => {
    mockedGet.mockResolvedValueOnce(paged(['e1']));
    const { result } = renderHook(() => usePropuestasEnviadas('u9', 0), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith(
      '/api/solicitudes-intercambio/enviadas/u9',
      { params: { page: 0, size: 10 } },
    );
    expect(result.current.data?.content.map((s) => s.id)).toEqual(['e1']);
    expect(result.current.data?.last).toBe(true);
  });

  it('no llama a la API cuando no hay userId', () => {
    renderHook(() => usePropuestasRecibidas(undefined), { wrapper });
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
