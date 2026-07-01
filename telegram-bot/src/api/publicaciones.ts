import type { ApiClient } from "./client";
import type { FiguritaPublicadaResponseDTO, PagedResponse } from "./types";
import type { Session } from "../session/store";

export interface PublicacionesApi {
  publicar(s: Session, figuritaBaseId: string, cantidad: number): Promise<FiguritaPublicadaResponseDTO>;
  /** Publicaciones de OTROS usuarios disponibles para intercambio (excluye las propias). */
  disponibles(s: Session, size?: number): Promise<PagedResponse<FiguritaPublicadaResponseDTO>>;
}

export function createPublicacionesApi(client: ApiClient): PublicacionesApi {
  return {
    publicar: (s, figuritaBaseId, cantidad) =>
      client.postJson(
        "/api/publicaciones",
        { usuarioId: s.userId, figuritaBaseId, cantidad },
        s.token,
      ),
    disponibles: (s, size = 20) =>
      client.getJson(
        `/api/publicaciones/disponibles/${encodeURIComponent(s.userId)}?page=0&size=${size}`,
        s.token,
      ),
  };
}
