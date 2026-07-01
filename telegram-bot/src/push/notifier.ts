import type { Bot } from "grammy";
import type { SessionStore } from "../session/store";
import type { NotificacionesApi } from "../api/notificaciones";
import type { NotificacionDTO } from "../api/types";

/**
 * Decide qué notificaciones empujar y marca las vistas. En la primera pasada de
 * un chat (`primeraVez`) solo hace baseline (marca las existentes como vistas sin
 * empujar) para no spamear el historial; después empuja solo las nuevas no leídas.
 * Muta `vistos`.
 */
export function seleccionarPush(
  content: NotificacionDTO[],
  vistos: Set<string>,
  primeraVez: boolean,
): NotificacionDTO[] {
  const push: NotificacionDTO[] = [];
  for (const n of content) {
    if (vistos.has(n.id)) continue;
    vistos.add(n.id);
    if (!primeraVez && !n.leida) push.push(n);
  }
  return push;
}

export interface NotifierDeps {
  bot: Bot;
  sessions: SessionStore;
  notificaciones: NotificacionesApi;
  intervalMs: number;
}

/** Arranca el poller de notificaciones. Devuelve una función para detenerlo. */
export function startNotifier(deps: NotifierDeps): () => void {
  const vistosPorChat = new Map<number, Set<string>>();
  const timer = setInterval(() => {
    void tick(deps, vistosPorChat);
  }, deps.intervalMs);
  return () => clearInterval(timer);
}

async function tick(deps: NotifierDeps, vistosPorChat: Map<number, Set<string>>): Promise<void> {
  const entries = deps.sessions.entries();

  // Purga el estado de chats que ya no tienen sesión (logout / 401): evita fuga de memoria.
  const activos = new Set(entries.map(([id]) => id));
  for (const id of [...vistosPorChat.keys()]) {
    if (!activos.has(id)) vistosPorChat.delete(id);
  }

  for (const [chatId, session] of entries) {
    try {
      const page = await deps.notificaciones.porUsuario(session);
      const primeraVez = !vistosPorChat.has(chatId);
      const vistos = vistosPorChat.get(chatId) ?? new Set<string>();
      const nuevas = seleccionarPush(page.content, vistos, primeraVez);
      // Acota `vistos` a lo que sigue en la ventana paginada: un id que salió de la
      // ventana no se vuelve a traer, así que no hace falta recordarlo (evita crecer sin fin).
      const idsAhora = new Set(page.content.map((n) => n.id));
      for (const id of [...vistos]) {
        if (!idsAhora.has(id)) vistos.delete(id);
      }
      vistosPorChat.set(chatId, vistos);
      for (const n of nuevas) {
        const cuerpo = n.mensaje ? `\n${n.mensaje}` : "";
        await deps.bot.api.sendMessage(chatId, `🔔 ${n.titulo ?? n.tipo ?? "Notificación"}${cuerpo}`);
      }
    } catch {
      // Errores por-usuario (sesión vencida, backend caído): el próximo tick reintenta.
    }
  }
}
