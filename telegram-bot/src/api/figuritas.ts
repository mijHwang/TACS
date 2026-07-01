import type { ApiClient } from "./client";
import type { PagedResponse, FiguritaResponseDTO, FiguritaBaseDTO } from "./types";
import type { Session } from "../session/store";

export interface FiguritasApi {
  coleccion(s: Session): Promise<PagedResponse<FiguritaResponseDTO>>;
  faltantes(s: Session): Promise<PagedResponse<FiguritaBaseDTO>>;
  repetidas(s: Session, size?: number): Promise<PagedResponse<FiguritaResponseDTO>>;
  catalogo(s: Session, search: string): Promise<PagedResponse<FiguritaResponseDTO>>;
}

export function createFiguritasApi(client: ApiClient): FiguritasApi {
  const enc = encodeURIComponent;
  return {
    coleccion: (s) => client.getJson(`/api/usuarios/${enc(s.username)}/figuritas?page=0&size=10`, s.token),
    faltantes: (s) => client.getJson(`/api/usuarios/${enc(s.username)}/figuritas/faltantes?page=0&size=10`, s.token),
    repetidas: (s, size = 10) =>
      client.getJson(`/api/usuarios/${enc(s.username)}/figuritas/repetidas?page=0&size=${size}`, s.token),
    catalogo: (s, search) =>
      client.getJson(`/api/figuritas?usuarioId=${enc(s.userId)}&search=${enc(search)}&page=0&size=10`, s.token),
  };
}
