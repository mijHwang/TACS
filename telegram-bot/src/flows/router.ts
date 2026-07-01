import type { ApiClient } from "../api/client";
import type { SessionStore } from "../session/store";
import type { FiguritasApi } from "../api/figuritas";
import type { PublicacionesApi } from "../api/publicaciones";
import type { IntercambiosApi } from "../api/intercambios";
import type { SubastasApi } from "../api/subastas";
import type { PendingFlow } from "../session/flows";
import type { FlowResult } from "./types";
import { handleLogin } from "./login";
import { handlePublicar } from "./publicar";
import { handleProponer } from "./proponer";
import { handleOfertar } from "./ofertar";

/** Dependencias que necesitan los handlers de flujos. Cada handler toma el subconjunto que usa. */
export interface FlowDeps {
  client: ApiClient;
  sessions: SessionStore;
  figuritas: FiguritasApi;
  publicaciones: PublicacionesApi;
  intercambios: IntercambiosApi;
  subastas: SubastasApi;
}

/** Despacha un mensaje de texto al handler del flujo pendiente según su `kind`. */
export async function routeFlow(
  flow: PendingFlow,
  text: string,
  chatId: number,
  deps: FlowDeps,
): Promise<FlowResult> {
  switch (flow.kind) {
    case "login":
      return handleLogin(flow, text, chatId, deps);
    case "publicar":
      return handlePublicar(flow, text, chatId, deps);
    case "proponer":
      return handleProponer(flow, text, chatId, deps);
    case "ofertar":
      return handleOfertar(flow, text, chatId, deps);
  }
}
