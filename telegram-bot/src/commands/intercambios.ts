import type { IntercambiosApi } from "../api/intercambios";
import type { PublicacionesApi } from "../api/publicaciones";
import type { Session } from "../session/store";
import type { PendingFlow } from "../session/flows";
import { listaRecibidas, listaEnviadas } from "../format/intercambios";

export async function solicitudesReply(api: IntercambiosApi, s: Session): Promise<string> {
  const [rec, env] = await Promise.all([api.recibidas(s), api.enviadas(s)]);
  const recibidas = listaRecibidas(rec, "(no tenés solicitudes recibidas)");
  const enviadas = listaEnviadas(env, "(no enviaste solicitudes)");
  return `📥 Recibidas:\n${recibidas}\n\n📤 Enviadas:\n${enviadas}\n\nUsá /aceptar <n> o /rechazar <n> sobre las recibidas.`;
}

async function actuarSobreRecibida(
  api: IntercambiosApi,
  s: Session,
  n: number,
  accion: "aceptar" | "rechazar",
): Promise<string> {
  if (!Number.isInteger(n) || n < 1) {
    return `Indicá el número de la solicitud, ej. /${accion} 1 (mirá /solicitudes).`;
  }
  const rec = await api.recibidas(s);
  if (n > rec.content.length) {
    return `No hay una solicitud recibida #${n}. Mirá /solicitudes.`;
  }
  const solicitud = rec.content[n - 1];
  if (accion === "aceptar") await api.aceptar(s, solicitud.id);
  else await api.rechazar(s, solicitud.id);
  return accion === "aceptar" ? `✅ Aceptaste la solicitud #${n}.` : `🚫 Rechazaste la solicitud #${n}.`;
}

export function aceptarReply(api: IntercambiosApi, s: Session, n: number): Promise<string> {
  return actuarSobreRecibida(api, s, n, "aceptar");
}

export function rechazarReply(api: IntercambiosApi, s: Session, n: number): Promise<string> {
  return actuarSobreRecibida(api, s, n, "rechazar");
}

export async function iniciarProponer(
  publicaciones: PublicacionesApi,
  s: Session,
): Promise<{ reply: string; flow?: PendingFlow }> {
  const page = await publicaciones.disponibles(s, 30);
  if (page.content.length === 0) {
    return { reply: "No hay figuritas publicadas para intercambio en este momento." };
  }
  const lista = page.content
    .map((p, i) => `${i + 1}. #${p.figuritaNumero} · ${p.figuritaJugadorNombre} — de @${p.usuarioUsername} ×${p.cantidad}`)
    .join("\n");
  return {
    reply: `Figuritas disponibles para pedir:\n${lista}\n\n¿Cuál querés pedir? Respondé con el número.`,
    flow: { kind: "proponer", step: "elegirObjetivo", objetivos: page.content },
  };
}
