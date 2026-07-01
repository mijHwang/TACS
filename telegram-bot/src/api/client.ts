import { ApiError } from "../errors";

export interface ApiClient {
  getJson<T>(path: string, token: string): Promise<T>;
  postJson<T>(path: string, body: unknown, token: string): Promise<T>;
  postText(path: string, body: unknown): Promise<string>;
  /** PUT sin body; resuelve en 2xx, lanza ApiError si no. No devuelve el cuerpo. */
  put(path: string, token: string): Promise<void>;
}

export function createApiClient(baseUrl: string, fetchFn: typeof fetch = fetch): ApiClient {
  async function doFetch(path: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetchFn(baseUrl + path, init);
    } catch {
      throw new ApiError(0, "No se pudo conectar con el servidor. Probá de nuevo en un momento.");
    }
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new ApiError(res.status, mensajePorStatus(res.status, detalle));
    }
    return res;
  }

  return {
    async getJson<T>(path: string, token: string): Promise<T> {
      const res = await doFetch(path, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()) as T;
    },
    async postJson<T>(path: string, body: unknown, token: string): Promise<T> {
      const res = await doFetch(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await res.json()) as T;
    },
    async postText(path: string, body: unknown): Promise<string> {
      const res = await doFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await res.text();
    },
    async put(path: string, token: string): Promise<void> {
      await doFetch(path, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    },
  };
}

function mensajePorStatus(status: number, detalle: string): string {
  if (status === 401 || status === 403) return "Tu sesión expiró. Usá /login de nuevo.";
  if (status === 400) return detalle.trim() || "El pedido no es válido.";
  if (status >= 500) return "El servidor no está disponible. Probá de nuevo en un momento.";
  return detalle.trim() || `Error inesperado (${status}).`;
}
