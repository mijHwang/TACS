import { describe, it, expect, vi } from "vitest";
import { handleLogin } from "../../src/flows/login";
import { createSessionStore } from "../../src/session/store";
import { ApiError } from "../../src/errors";
import type { ApiClient } from "../../src/api/client";

const clientOk: ApiClient = {
  postText: vi.fn(async () => "jwt-xyz"),
  getJson: vi.fn(async () => ({ id: "42", username: "maxi" })),
  postJson: vi.fn(),
};

describe("handleLogin", () => {
  it("paso username: pide la contraseña y avanza el flujo", async () => {
    const sessions = createSessionStore();
    const res = await handleLogin(
      { kind: "login", step: "username" },
      "maxi",
      100,
      { client: clientOk, sessions },
    );
    expect(res.next).toEqual({ kind: "login", step: "password", username: "maxi" });
    expect(res.replies[0]).toMatch(/contraseña/i);
  });

  it("paso password: crea la sesión, borra el mensaje y termina", async () => {
    const sessions = createSessionStore();
    const res = await handleLogin(
      { kind: "login", step: "password", username: "maxi" },
      "secreta",
      100,
      { client: clientOk, sessions },
    );
    expect(res.clear).toBe(true);
    expect(res.deleteIncoming).toBe(true);
    expect(sessions.get(100)).toEqual({ token: "jwt-xyz", username: "maxi", userId: "42" });
    expect(res.replies[0]).toMatch(/sesión iniciada/i);
  });

  it("paso password con credenciales inválidas: mensaje de error y termina sin sesión", async () => {
    const sessions = createSessionStore();
    const clientErr: ApiClient = {
      postText: vi.fn(async () => {
        throw new ApiError(401, "Tu sesión expiró. Usá /login de nuevo.");
      }),
      getJson: vi.fn(),
      postJson: vi.fn(),
    };
    const res = await handleLogin(
      { kind: "login", step: "password", username: "maxi" },
      "mala",
      100,
      { client: clientErr, sessions },
    );
    expect(res.clear).toBe(true);
    expect(sessions.get(100)).toBeUndefined();
    expect(res.replies[0]).toMatch(/incorrectos/i);
  });
});
