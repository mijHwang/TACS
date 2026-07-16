import { Bot } from "grammy";
import express from "express"; // <-- Agregado para Render
import { loadConfig } from "./config";
import { createApiClient } from "./api/client";
import { createSessionStore } from "./session/store";
import { createFlowStore } from "./session/flows";
import { createFiguritasApi } from "./api/figuritas";
import { createPublicacionesApi } from "./api/publicaciones";
import { createNotificacionesApi } from "./api/notificaciones";
import { createIntercambiosApi } from "./api/intercambios";
import { createSubastasApi } from "./api/subastas";
import { routeFlow, type FlowDeps } from "./flows/router";
import { iniciarPublicar } from "./commands/publicar";
import { coleccionReply, faltantesReply, repetidasReply } from "./commands/coleccion";
import { buscarReply } from "./commands/buscar";
import { notificacionesReply } from "./commands/notificaciones";
import { solicitudesReply, aceptarReply, rechazarReply, iniciarProponer } from "./commands/intercambios";
import { subastasReply, iniciarOfertar } from "./commands/subastas";
import { guard, startFlow } from "./guard";
import { startNotifier } from "./push/notifier";

const config = loadConfig();
const client = createApiClient(config.backendUrl);
const sessions = createSessionStore();
const flows = createFlowStore();
const figuritasApi = createFiguritasApi(client);
const publicacionesApi = createPublicacionesApi(client);
const notificacionesApi = createNotificacionesApi(client);
const intercambiosApi = createIntercambiosApi(client);
const subastasApi = createSubastasApi(client);

const flowDeps: FlowDeps = {
  client,
  sessions,
  figuritas: figuritasApi,
  publicaciones: publicacionesApi,
  intercambios: intercambiosApi,
  subastas: subastasApi,
};

const bot = new Bot(config.botToken);

const BIENVENIDA = [
  "🎴 Bot de figuritas TACS",
  "",
  "Sesión:",
  "/login — iniciar sesión   ·   /logout — cerrar sesión   ·   /whoami",
  "",
  "Figuritas:",
  "/buscar <texto> — buscar disponibles",
  "/miscoleccion · /faltantes · /repetidas",
  "/publicar — publicar una repetida",
  "",
  "Intercambios:",
  "/solicitudes — recibidas y enviadas",
  "/proponer — proponer un intercambio",
  "/aceptar <n> · /rechazar <n>",
  "",
  "Subastas:",
  "/subastas — activas   ·   /ofertar — ofertar en una",
  "",
  "/notificaciones — ver tus notificaciones",
].join("\n");

bot.command("start", (ctx) => {
  flows.clear(ctx.chat!.id);
  return ctx.reply(BIENVENIDA);
});

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
  const chatId = ctx.chat!.id;
  flows.clear(chatId);
  const s = sessions.get(chatId);
  return ctx.reply(s ? `Usuario: ${s.username}\nuserId: ${s.userId}` : "No iniciaste sesión. Usá /login.");
});

// Lectura (comandos de un tiro)
bot.command("buscar", (ctx) => guard(ctx, sessions, flows, (s) => buscarReply(figuritasApi, s, ctx.match.trim())));
bot.command("miscoleccion", (ctx) => guard(ctx, sessions, flows, (s) => coleccionReply(figuritasApi, s)));
bot.command("faltantes", (ctx) => guard(ctx, sessions, flows, (s) => faltantesReply(figuritasApi, s)));
bot.command("repetidas", (ctx) => guard(ctx, sessions, flows, (s) => repetidasReply(figuritasApi, s)));
bot.command("notificaciones", (ctx) => guard(ctx, sessions, flows, (s) => notificacionesReply(notificacionesApi, s)));
bot.command("solicitudes", (ctx) => guard(ctx, sessions, flows, (s) => solicitudesReply(intercambiosApi, s)));
bot.command("subastas", (ctx) => guard(ctx, sessions, flows, (s) => subastasReply(subastasApi, s)));
bot.command("aceptar", (ctx) =>
  guard(ctx, sessions, flows, (s) => aceptarReply(intercambiosApi, s, Number.parseInt(ctx.match.trim(), 10))),
);
bot.command("rechazar", (ctx) =>
  guard(ctx, sessions, flows, (s) => rechazarReply(intercambiosApi, s, Number.parseInt(ctx.match.trim(), 10))),
);

// Flujos conversacionales (comandos que arrancan un flujo)
bot.command("publicar", (ctx) => startFlow(ctx, sessions, flows, (s) => iniciarPublicar(figuritasApi, s)));
bot.command("proponer", (ctx) => startFlow(ctx, sessions, flows, (s) => iniciarProponer(publicacionesApi, s)));
bot.command("ofertar", (ctx) => startFlow(ctx, sessions, flows, (s) => iniciarOfertar(subastasApi, s)));

// Router de texto libre: solo actúa si hay un flujo pendiente para el chat.
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat!.id;
  const flow = flows.get(chatId);
  if (!flow) return;

  const result = await routeFlow(flow, ctx.message.text, chatId, flowDeps);

  if (result.deleteIncoming) await ctx.deleteMessage().catch(() => {});
  if (result.clear) flows.clear(chatId);
  else if (result.next) flows.set(chatId, result.next);
  for (const r of result.replies) await ctx.reply(r);
});

bot.catch((err) => {
  console.error("Error no manejado en el bot:", err.error);
});

// Push de notificaciones: poll periódico por sesión activa.
const notifPollMs = Number(process.env.NOTIF_POLL_MS ?? 30000);
startNotifier({ bot, sessions, notificaciones: notificacionesApi, intervalMs: notifPollMs });


// --- TRUCO DE COMPATIBILIDAD CON RENDER (FREE PORT BINDING) ---
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🤖 Bot de Telegram de TACS activo y simulando HTTP service para Render.");
});

app.listen(port, () => {
  console.log(`📡 Servidor Express dummy escuchando en puerto ${port} para evadir timeouts.`);
});
// ---------------------------------------------------------------


bot.start({
  onStart: (info) => console.log(`🤖 Bot @${info.username} iniciado (long polling).`),
});