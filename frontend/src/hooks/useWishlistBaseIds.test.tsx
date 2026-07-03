import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWishlistBaseIds } from './useWishlistBaseIds';

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

describe('useWishlistBaseIds', () => {
  beforeEach(() => getMock.mockReset());

  it('recorre las páginas y junta los ids en un Set', async () => {
    getMock
      .mockResolvedValueOnce({ data: { content: [{ id: 'b1' }, { id: 'b2' }], last: false } })
      .mockResolvedValueOnce({ data: { content: [{ id: 'b3' }], last: true } });
    const { result } = renderHook(() => useWishlistBaseIds('sofi'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(result.current.data?.has('b1')).toBe(true);
    expect(result.current.data?.has('b3')).toBe(true);
    expect(result.current.data?.size).toBe(3);
  });
});
