import type { NotificacionesApi } from "../api/notificaciones";
import type { Session } from "../session/store";
import { listaNotificaciones } from "../format/figuritas";

export async function notificacionesReply(api: NotificacionesApi, s: Session): Promise<string> {
  return listaNotificaciones(await api.porUsuario(s));
}
