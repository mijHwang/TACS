import type { Context } from "grammy";
import { ApiError } from "./errors";
import type { SessionStore, Session } from "./session/store";
import type { FlowStore, PendingFlow } from "./session/flows";

/**
 * Ejecuta `run` solo si hay sesión; formatea errores de la API de forma amable.
 * Limpia cualquier flujo conversacional pendiente: al mandar un comando el usuario
 * abandona el flujo en curso (evita que el próximo texto lo consuma un flujo viejo).
 */
export async function guard(
  ctx: Context,
  sessions: SessionStore,
  flows: FlowStore,
  run: (session: Session) => Promise<string>,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;
  flows.clear(chatId);

  const session = sessions.get(chatId);
  if (!session) {
    await ctx.reply("Necesitás iniciar sesión. Usá /login.");
    return;
  }

  try {
    const texto = await run(session);
    await ctx.reply(texto);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) sessions.clear(chatId);
    await ctx.reply(e instanceof ApiError ? e.message : "Ocurrió un error inesperado.");
  }
}

/**
 * Arranca un flujo conversacional desde un comando: abandona cualquier flujo previo,
 * requiere sesión, llama al `starter` (que trae datos y arma el primer mensaje + el
 * flujo pendiente) y lo guarda. Reutilizado por /publicar, /proponer y /ofertar.
 */
export async function startFlow(
  ctx: Context,
  sessions: SessionStore,
  flows: FlowStore,
  starter: (session: Session) => Promise<{ reply: string; flow?: PendingFlow }>,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;
  flows.clear(chatId);

  const session = sessions.get(chatId);
  if (!session) {
    await ctx.reply("Necesitás iniciar sesión. Usá /login.");
    return;
  }

  try {
    const { reply, flow } = await starter(session);
    if (flow) flows.set(chatId, flow);
    await ctx.reply(reply);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) sessions.clear(chatId);
    await ctx.reply(e instanceof ApiError ? e.message : "Ocurrió un error inesperado.");
  }
}
