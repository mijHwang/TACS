import { describe, it, expect, vi } from "vitest";
import { createNotificacionesApi } from "../../src/api/notificaciones";
import { notificacionesReply } from "../../src/commands/notificaciones";
import type { ApiClient } from "../../src/api/client";

const session = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

describe("NotificacionesApi", () => {
  it("porUsuario pega a /api/notificaciones/usuario/{userId}", async () => {
    const client: ApiClient = { getJson: vi.fn(async () => emptyPage), postJson: vi.fn(), postText: vi.fn() };
    await createNotificacionesApi(client).porUsuario(session);
    expect(client.getJson).toHaveBeenCalledWith("/api/notificaciones/usuario/u1?page=0&size=10", "T");
  });

  it("notificacionesReply informa cuando no hay notificaciones", async () => {
    const api = { porUsuario: vi.fn(async () => emptyPage) };
    expect(await notificacionesReply(api, session)).toMatch(/no tenés notificaciones/i);
  });
});
