import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api, { apiFetch, setUnauthorizedHandler } from './api';

describe('manejo de 401 desacoplado', () => {
  beforeEach(() => { localStorage.setItem('token', 'x'); });
  afterEach(() => { setUnauthorizedHandler(null); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('AXIOS: ante 401 limpia el token y llama al handler (sin window.location)', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    // adapter custom que rechaza con un error tipo-axios con response.status 401
    api.defaults.adapter = vi.fn().mockRejectedValue({ response: { status: 401 } });

    await api.get('/api/whatever').catch(() => {});

    expect(handler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('apiFetch: ante 401 limpia el token y llama al handler', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await apiFetch('/whatever').catch(() => {});

    expect(handler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
  });
});
