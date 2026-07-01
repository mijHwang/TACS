import { describe, it, expect, vi } from "vitest";
import { createApiClient } from "../../src/api/client";

function fakeFetch(response: Partial<Response> & { okBody?: unknown; text?: string }) {
  return vi.fn(async () =>
    ({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.okBody,
      text: async () => response.text ?? "",
    }) as unknown as Response,
  );
}

describe("createApiClient", () => {
  it("getJson adjunta el Bearer y arma la URL con baseUrl", async () => {
    const fetchFn = fakeFetch({ okBody: { hola: "mundo" } });
    const client = createApiClient("http://backend:8080", fetchFn as unknown as typeof fetch);

    const res = await client.getJson<{ hola: string }>("/api/x", "TOKEN");

    expect(res).toEqual({ hola: "mundo" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://backend:8080/api/x");
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer TOKEN" });
  });

  it("postText devuelve el body como texto (sin Bearer)", async () => {
    const fetchFn = fakeFetch({ text: "jwt-token-plano" });
    const client = createApiClient("http://b", fetchFn as unknown as typeof fetch);

    const token = await client.postText("/auth/login", { username: "u", password: "p" });

    expect(token).toBe("jwt-token-plano");
    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ "Content-Type": "application/json" });
    expect((init as RequestInit).body).toBe(JSON.stringify({ username: "u", password: "p" }));
  });

  it("mapea 401 a ApiError con status 401", async () => {
    const fetchFn = fakeFetch({ ok: false, status: 401, text: "" });
    const client = createApiClient("http://b", fetchFn as unknown as typeof fetch);

    await expect(client.getJson("/api/x", "T")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
  });

  it("mapea error de red a ApiError status 0", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const client = createApiClient("http://b", fetchFn as unknown as typeof fetch);

    await expect(client.getJson("/api/x", "T")).rejects.toMatchObject({ status: 0 });
  });
});
