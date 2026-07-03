import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PagedResponse } from '../services/api';
import type { FiguritaBaseDTO } from './useFiguritas';
import { useMaestro } from './useMaestro';

const getMock = vi.fn();
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, default: { get: (...a: unknown[]) => getMock(...a) } };
});

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const base = (id: string): FiguritaBaseDTO => ({
  id, numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
});
const page = (content: FiguritaBaseDTO[]): PagedResponse<FiguritaBaseDTO> =>
  ({ content, page: 0, size: 10, totalElements: 1, totalPages: 1, last: true });

describe('useMaestro', () => {
  beforeEach(() => getMock.mockReset());

  it('pega a /api/figuritas-base/search con search+excludeOwnedBy', async () => {
    getMock.mockResolvedValueOnce({ data: page([base('b1')]) });
    const { result } = renderHook(
      () => useMaestro({ page: 0, search: 'mes', excludeOwnedBy: 'u9' }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMock).toHaveBeenCalledWith(
      '/api/figuritas-base/search',
      { params: { size: 10, page: 0, search: 'mes', excludeOwnedBy: 'u9' } },
    );
    expect(result.current.data?.content[0].id).toBe('b1');
  });
});
