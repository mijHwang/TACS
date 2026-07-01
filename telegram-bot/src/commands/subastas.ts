import type { SubastasApi } from "../api/subastas";
import type { Session } from "../session/store";
import type { PendingFlow } from "../session/flows";
import { listaSubastas, describirSubasta } from "../format/subastas";

export async function subastasReply(api: SubastasApi, s: Session): Promise<string> {
  return listaSubastas(await api.activas(s), "No hay subastas activas en este momento.");
}

export async function iniciarOfertar(
  api: SubastasApi,
  s: Session,
): Promise<{ reply: string; flow?: PendingFlow }> {
  const page = await api.activas(s);
  if (page.content.length === 0) {
    return { reply: "No hay subastas activas para ofertar." };
  }
  const lista = page.content.map((su, i) => `${i + 1}. ${describirSubasta(su)}`).join("\n");
  return {
    reply: `Subastas activas:\n${lista}\n\n¿En cuál querés ofertar? Respondé con el número.`,
    flow: { kind: "ofertar", step: "elegirSubasta", subastas: page.content },
  };
}
