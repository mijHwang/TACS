import type { PendingFlow } from "../session/flows";

export interface FlowResult {
  /** Mensajes a responder, en orden. */
  replies: string[];
  /** Si true, borrar el mensaje entrante del usuario (ej. la contraseña). */
  deleteIncoming?: boolean;
  /** Próximo estado del flujo (continúa). */
  next?: PendingFlow;
  /** Si true, terminar el flujo (limpiarlo). */
  clear?: boolean;
}
