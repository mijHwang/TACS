import type { ApiClient } from "./client";
import type { PagedResponse, SolicitudDTO } from "./types";
import type { Session } from "../session/store";

export interface IntercambiosApi {
  recibidas(s: Session): Promise<PagedResponse<SolicitudDTO>>;
  enviadas(s: Session): Promise<PagedResponse<SolicitudDTO>>;
  aceptar(s: Session, id: string): Promise<void>;
  rechazar(s: Session, id: string): Promise<void>;
  proponer(s: Session, figuritaId: string, figuritasOfrecidas: string[]): Promise<unknown>;
}

export function createIntercambiosApi(client: ApiClient): IntercambiosApi {
  const enc = encodeURIComponent;
  const base = "/api/solicitudes-intercambio";
  return {
    recibidas: (s) => client.getJson(`${base}/recibidas/${enc(s.userId)}?page=0&size=10`, s.token),
    enviadas: (s) => client.getJson(`${base}/enviadas/${enc(s.userId)}?page=0&size=10`, s.token),
    aceptar: (s, id) => client.put(`${base}/${enc(id)}/aceptar`, s.token),
    rechazar: (s, id) => client.put(`${base}/${enc(id)}/rechazar`, s.token),
    proponer: (s, figuritaId, figuritasOfrecidas) =>
      client.postJson(base, { usuarioId: s.userId, figuritaId, figuritasOfrecidas }, s.token),
  };
}
