import { describe, it, expect, vi } from "vitest";
import { guard } from "../src/guard";
import { createSessionStore } from "../src/session/store";
import { createFlowStore } from "../src/session/flows";
import { ApiError } from "../src/errors";

function fakeCtx(chatId: number) {
  return { chat: { id: chatId }, reply: vi.fn(async () => {}) };
}

describe("guard", () => {
  it("sin sesión: pide /login y no ejecuta run", async () => {
    const sessions = createSessionStore();
    const flows = createFlowStore();
    const ctx = fakeCtx(1);
    const run = vi.fn();
    await guard(ctx as never, sessions, flows, run);
    expect(run).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/login/i));
  });

  it("con sesión: ejecuta run y responde su texto", async () => {
    const sessions = createSessionStore();
    const flows = createFlowStore();
    sessions.set(1, { token: "t", username: "u", userId: "9" });
    const ctx = fakeCtx(1);
    await guard(ctx as never, sessions, flows, async () => "hola");
    expect(ctx.reply).toHaveBeenCalledWith("hola");
  });

  it("ApiError 401: limpia la sesión y responde el mensaje", async () => {
    const sessions = createSessionStore();
    const flows = createFlowStore();
    sessions.set(1, { token: "t", username: "u", userId: "9" });
    const ctx = fakeCtx(1);
    await guard(ctx as never, sessions, flows, async () => {
      throw new ApiError(401, "Tu sesión expiró. Usá /login de nuevo.");
    });
    expect(sessions.get(1)).toBeUndefined();
    expect(ctx.reply).toHaveBeenCalledWith("Tu sesión expiró. Usá /login de nuevo.");
  });

  it("limpia cualquier flujo pendiente al ejecutar un comando", async () => {
    const sessions = createSessionStore();
    const flows = createFlowStore();
    sessions.set(1, { token: "t", username: "u", userId: "9" });
    flows.set(1, { kind: "login", step: "username" });
    const ctx = fakeCtx(1);
    await guard(ctx as never, sessions, flows, async () => "ok");
    expect(flows.get(1)).toBeUndefined();
  });
});
