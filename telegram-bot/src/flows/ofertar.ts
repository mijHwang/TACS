import { ApiError } from "../errors";
import type { FiguritasApi } from "../api/figuritas";
import type { SubastasApi } from "../api/subastas";
import type { SessionStore } from "../session/store";
import type { PendingFlow } from "../session/flows";
import type { FlowResult } from "./types";
import { describirFigurita } from "../format/figuritas";
import { parseIndices } from "./util";

type OfertarFlow = Extract<PendingFlow, { kind: "ofertar" }>;

export async function handleOfertar(
  flow: OfertarFlow,
  text: string,
  chatId: number,
  deps: { figuritas: FiguritasApi; subastas: SubastasApi; sessions: SessionStore },
): Promise<FlowResult> {
  const session = deps.sessions.get(chatId);
  if (!session) return { replies: ["Tu sesión expiró. Usá /login."], clear: true };

  if (flow.step === "elegirSubasta") {
    const idx = Number.parseInt(text.trim(), 10);
    if (!Number.isInteger(idx) || idx < 1 || idx > flow.subastas.length) {
      return { replies: [`Elegí un número entre 1 y ${flow.subastas.length}.`], next: flow };
    }
    const su = flow.subastas[idx - 1];
    try {
      const rep = await deps.figuritas.repetidas(session, 50);
      if (rep.content.length === 0) {
        return { replies: ["No tenés figuritas repetidas para ofertar."], clear: true };
      }
      const lista = rep.content.map((f, i) => `${i + 1}. ${describirFigurita(f)}`).join("\n");
      const subastaDesc = `#${su.figuritaNumero} ${su.figuritaJugadorNombre}`;
      return {
        replies: [
          `Ofertás en ${subastaDesc}.\n\nTus repetidas:\n${lista}\n\n¿Qué figuritas ofrecés? Números separados por coma (ej. 1,3).`,
        ],
        next: { kind: "ofertar", step: "elegirFiguritas", subastaId: su.id, subastaDesc, ofrecibles: rep.content },
      };
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) deps.sessions.clear(chatId);
      return { replies: [e instanceof ApiError ? `❌ ${e.message}` : "❌ Error al cargar tus repetidas."], clear: true };
    }
  }

  // step === "elegirFiguritas"
  const indices = parseIndices(text, flow.ofrecibles.length);
  if (indices.length === 0) {
    return {
      replies: [`Elegí uno o más números válidos separados por coma (1 a ${flow.ofrecibles.length}).`],
      next: flow,
    };
  }
  const figuritaIds = indices.map((i) => flow.ofrecibles[i - 1].id);
  try {
    await deps.subastas.ofertar(session, flow.subastaId, figuritaIds);
    return {
      replies: [`✅ Oferta enviada en ${flow.subastaDesc} con ${figuritaIds.length} figurita(s).`],
      clear: true,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) deps.sessions.clear(chatId);
    return { replies: [e instanceof ApiError ? `❌ ${e.message}` : "❌ No se pudo enviar la oferta."], clear: true };
  }
}
