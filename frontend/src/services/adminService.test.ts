import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from './adminService';

describe('adminService.seedDemo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('hace POST a /admin/seed-demo y devuelve el resumen', async () => {
    const fakeResult = { usuarios: 12, protagonistaUsername: 'juanca' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => fakeResult,
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await adminService.seedDemo();

    expect(res).toEqual(fakeResult);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/admin/seed-demo');
    expect(init.method).toBe('POST');
  });
});
