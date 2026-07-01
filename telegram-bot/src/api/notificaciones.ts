import type { ApiClient } from "./client";
import type { PagedResponse, NotificacionDTO } from "./types";
import type { Session } from "../session/store";

export interface NotificacionesApi {
  porUsuario(s: Session): Promise<PagedResponse<NotificacionDTO>>;
}

export function createNotificacionesApi(client: ApiClient): NotificacionesApi {
  return {
    porUsuario: (s) =>
      client.getJson(`/api/notificaciones/usuario/${encodeURIComponent(s.userId)}?page=0&size=10`, s.token),
  };
}
