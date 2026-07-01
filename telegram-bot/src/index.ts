import { Bot } from "grammy";
import { loadConfig } from "./config";
import { createApiClient } from "./api/client";
import { createSessionStore } from "./session/store";
import { createFlowStore } from "./session/flows";
import { handleLogin } from "./flows/login";
import type { FlowResult } from "./flows/types";

const config = loadConfig();
const client = createApiClient(config.backendUrl);
const sessions = createSessionStore();
const flows = createFlowStore();

const bot = new Bot(config.botToken);

const BIENVENIDA = [
  "🎴 Bot de figuritas TACS",
  "",
  "Comandos:",
  "/login — iniciar sesión",
  "/logout — cerrar sesión",
  "/whoami — ver tu sesión actual",
].join("\n");

bot.command("start", (ctx) => ctx.reply(BIENVENIDA));

bot.command("login", (ctx) => {
  const chatId = ctx.chat!.id;
  flows.set(chatId, { kind: "login", step: "username" });
  return ctx.reply("👤 Ingresá tu usuario:");
});

bot.command("logout", (ctx) => {
  const chatId = ctx.chat!.id;
  sessions.clear(chatId);
  flows.clear(chatId);
  return ctx.reply("Sesión cerrada.");
});

bot.command("whoami", (ctx) => {
  const s = sessions.get(ctx.chat!.id);
  return ctx.reply(s ? `Usuario: ${s.username}\nuserId: ${s.userId}` : "No iniciaste sesión. Usá /login.");
});

// Router de texto libre: solo actúa si hay un flujo pendiente para el chat.
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat!.id;
  const flow = flows.get(chatId);
  if (!flow) return;

  let result: FlowResult;
  if (flow.kind === "login") {
    result = await handleLogin(flow, ctx.message.text, chatId, { client, sessions });
  } else {
    return; // los flujos de publicar se cablean en Fase 2
  }

  if (result.deleteIncoming) await ctx.deleteMessage().catch(() => {});
  if (result.clear) flows.clear(chatId);
  else if (result.next) flows.set(chatId, result.next);
  for (const r of result.replies) await ctx.reply(r);
});

bot.catch((err) => {
  console.error("Error no manejado en el bot:", err.error);
});

bot.start({
  onStart: (info) => console.log(`🤖 Bot @${info.username} iniciado (long polling).`),
});
