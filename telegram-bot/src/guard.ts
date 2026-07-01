import type { Context } from "grammy";
import { ApiError } from "./errors";
import type { SessionStore, Session } from "./session/store";

/** Ejecuta `run` solo si hay sesión; formatea errores de la API de forma amable. */
export async function guard(
  ctx: Context,
  sessions: SessionStore,
  run: (session: Session) => Promise<string>,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

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
