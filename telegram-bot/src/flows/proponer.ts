import { ApiError } from "../errors";
import type { FiguritasApi } from "../api/figuritas";
import type { IntercambiosApi } from "../api/intercambios";
import type { SessionStore } from "../session/store";
import type { PendingFlow } from "../session/flows";
import type { FlowResult } from "./types";
import { describirFigurita } from "../format/figuritas";
import { parseIndices } from "./util";

type ProponerFlow = Extract<PendingFlow, { kind: "proponer" }>;

export async function handleProponer(
  flow: ProponerFlow,
  text: string,
  chatId: number,
  deps: { figuritas: FiguritasApi; intercambios: IntercambiosApi; sessions: SessionStore },
): Promise<FlowResult> {
  const session = deps.sessions.get(chatId);
  if (!session) return { replies: ["Tu sesión expiró. Usá /login."], clear: true };

  if (flow.step === "elegirObjetivo") {
    const idx = Number.parseInt(text.trim(), 10);
    if (!Number.isInteger(idx) || idx < 1 || idx > flow.objetivos.length) {
      return { replies: [`Elegí un número entre 1 y ${flow.objetivos.length}.`], next: flow };
    }
    const obj = flow.objetivos[idx - 1];
    const figuritaId = obj.figuritaIds?.[0];
    if (!figuritaId) {
      return { replies: ["Esa publicación no tiene una figurita disponible. Probá otra."], next: flow };
    }
    try {
      const rep = await deps.figuritas.repetidas(session, 50);
      if (rep.content.length === 0) {
        return { replies: ["No tenés figuritas repetidas para ofrecer."], clear: true };
      }
      const lista = rep.content.map((f, i) => `${i + 1}. ${describirFigurita(f)}`).join("\n");
      const objetivoDesc = `#${obj.figuritaNumero} ${obj.figuritaJugadorNombre}`;
      return {
        replies: [
          `Pediste ${objetivoDesc} (de @${obj.usuarioUsername}).\n\nTus repetidas:\n${lista}\n\n¿Qué ofrecés? Números separados por coma (ej. 1,3).`,
        ],
        next: { kind: "proponer", step: "elegirOfrecidas", figuritaId, objetivoDesc, ofrecibles: rep.content },
      };
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) deps.sessions.clear(chatId);
      return { replies: [e instanceof ApiError ? `❌ ${e.message}` : "❌ Error al cargar tus repetidas."], clear: true };
    }
  }

  // step === "elegirOfrecidas"
  const indices = parseIndices(text, flow.ofrecibles.length);
  if (indices.length === 0) {
    return {
      replies: [`Elegí uno o más números válidos separados por coma (1 a ${flow.ofrecibles.length}).`],
      next: flow,
    };
  }
  const figuritasOfrecidas = indices.map((i) => flow.ofrecibles[i - 1].id);
  try {
    await deps.intercambios.proponer(session, flow.figuritaId, figuritasOfrecidas);
    return {
      replies: [`✅ Propuesta enviada por ${flow.objetivoDesc}, ofreciendo ${figuritasOfrecidas.length} figurita(s).`],
      clear: true,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) deps.sessions.clear(chatId);
    return { replies: [e instanceof ApiError ? `❌ ${e.message}` : "❌ No se pudo enviar la propuesta."], clear: true };
  }
}
