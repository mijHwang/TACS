import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMisCantidades } from './useMisCantidades';

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

describe('useMisCantidades', () => {
  beforeEach(() => getMock.mockReset());

  it('arma el mapa baseId→count desde la colección', async () => {
    getMock.mockResolvedValueOnce({ data: { content: [
      { figuritaBaseId: 'b1', count: 2 },
      { figuritaBaseId: 'b2', count: 5 },
    ] } });
    const { result } = renderHook(() => useMisCantidades('sofi'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMock).toHaveBeenCalledWith('/api/usuarios/sofi/figuritas', { params: { page: 0, size: 2000 } });
    expect(result.current.data?.get('b1')).toBe(2);
    expect(result.current.data?.get('b2')).toBe(5);
  });

  it('no consulta si no hay username', () => {
    renderHook(() => useMisCantidades(undefined), { wrapper: wrapper() });
    expect(getMock).not.toHaveBeenCalled();
  });
});
