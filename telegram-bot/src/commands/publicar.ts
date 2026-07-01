import type { FiguritasApi } from "../api/figuritas";
import type { Session } from "../session/store";
import type { PendingFlow } from "../session/flows";
import { describirFigurita } from "../format/figuritas";

const MAX_OPCIONES = 50;

export async function iniciarPublicar(
  api: FiguritasApi,
  s: Session,
): Promise<{ reply: string; flow?: PendingFlow }> {
  const page = await api.repetidas(s, MAX_OPCIONES);
  if (page.content.length === 0) {
    return { reply: "No tenés figuritas repetidas para publicar." };
  }
  const lista = page.content.map((f, i) => `${i + 1}. ${describirFigurita(f)}`).join("\n");
  return {
    reply: `Tus figuritas repetidas:\n${lista}\n\n¿Cuál querés publicar? Respondé con el número.`,
    flow: { kind: "publicar", step: "select", opciones: page.content },
  };
}
