import { describe, it, expect, vi } from "vitest";
import { authenticate } from "../../src/api/auth";
import type { ApiClient } from "../../src/api/client";

function clientMock(over: Partial<ApiClient>): ApiClient {
  return {
    getJson: vi.fn(),
    postJson: vi.fn(),
    postText: vi.fn(),
    ...over,
  };
}

describe("authenticate", () => {
  it("loguea, resuelve el userId por username y arma la Session", async () => {
    const client = clientMock({
      postText: vi.fn(async () => "  jwt-abc  "),
      getJson: vi.fn(async () => ({ id: "665f", username: "maxi" })),
    });

    const session = await authenticate(client, "maxi", "secreta");

    expect(session).toEqual({ token: "jwt-abc", username: "maxi", userId: "665f" });
    expect(client.postText).toHaveBeenCalledWith("/auth/login", { username: "maxi", password: "secreta" });
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/by-username/maxi", "jwt-abc");
  });

  it("propaga el error si el login falla", async () => {
    const client = clientMock({
      postText: vi.fn(async () => {
        throw new Error("401");
      }),
    });
    await expect(authenticate(client, "x", "y")).rejects.toThrow();
  });
});
