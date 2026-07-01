import type { ApiClient } from "./client";
import type { PagedResponse, SubastaResponseDTO } from "./types";
import type { Session } from "../session/store";

export interface SubastasApi {
  activas(s: Session): Promise<PagedResponse<SubastaResponseDTO>>;
  ofertar(s: Session, subastaId: string, figuritaIds: string[]): Promise<unknown>;
}

export function createSubastasApi(client: ApiClient): SubastasApi {
  const enc = encodeURIComponent;
  return {
    activas: (s) => client.getJson(`/api/subastas?estado=EN_CURSO&page=0&size=10`, s.token),
    ofertar: (s, subastaId, figuritaIds) =>
      client.postJson(`/api/subastas/${enc(subastaId)}/ofertar`, { usuarioId: s.userId, figuritaIds }, s.token),
  };
}
