import { ApiError } from "../errors";
import type { PublicacionesApi } from "../api/publicaciones";
import type { SessionStore } from "../session/store";
import type { PendingFlow } from "../session/flows";
import type { FlowResult } from "./types";

type PublicarFlow = Extract<PendingFlow, { kind: "publicar" }>;

export async function handlePublicar(
  flow: PublicarFlow,
  text: string,
  chatId: number,
  deps: { publicaciones: PublicacionesApi; sessions: SessionStore },
): Promise<FlowResult> {
  if (flow.step === "select") {
    const idx = Number.parseInt(text.trim(), 10);
    if (!Number.isInteger(idx) || idx < 1 || idx > flow.opciones.length) {
      return { replies: [`Elegí un número entre 1 y ${flow.opciones.length}.`], next: flow };
    }
    const elegida = flow.opciones[idx - 1];
    return {
      replies: [`¿Cuántas copias de #${elegida.numero} (${elegida.jugadorNombre ?? "?"}) querés publicar?`],
      next: {
        kind: "publicar",
        step: "cantidad",
        figuritaBaseId: elegida.figuritaBaseId,
        numero: elegida.numero,
        jugador: elegida.jugadorNombre ?? "?",
      },
    };
  }

  // step === "cantidad"
  const cantidad = Number.parseInt(text.trim(), 10);
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { replies: ["Ingresá un número entero mayor a 0."], next: flow };
  }

  const session = deps.sessions.get(chatId);
  if (!session) {
    return { replies: ["Tu sesión expiró. Usá /login."], clear: true };
  }

  try {
    await deps.publicaciones.publicar(session, flow.figuritaBaseId, cantidad);
    return {
      replies: [`✅ Publicaste la figurita #${flow.numero} (${flow.jugador}) ×${cantidad}.`],
      clear: true,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) deps.sessions.clear(chatId);
    return {
      replies: [e instanceof ApiError ? `❌ ${e.message}` : "❌ No se pudo publicar. Probá de nuevo."],
      clear: true,
    };
  }
}
