import { describe, it, expect, vi } from "vitest";
import { createFiguritasApi } from "../../src/api/figuritas";
import type { ApiClient } from "../../src/api/client";

const session = { token: "T", username: "maxi", userId: "u1" };

function clientSpy(): ApiClient {
  return {
    getJson: vi.fn(async () => ({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true })),
    postJson: vi.fn(),
    postText: vi.fn(),
  };
}

describe("FiguritasApi", () => {
  it("coleccion pega a /api/usuarios/{username}/figuritas con el token", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).coleccion(session);
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/maxi/figuritas?page=0&size=10", "T");
  });

  it("faltantes pega al endpoint de faltantes", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).faltantes(session);
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/maxi/figuritas/faltantes?page=0&size=10", "T");
  });

  it("repetidas admite un size custom", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).repetidas(session, 50);
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/maxi/figuritas/repetidas?page=0&size=50", "T");
  });

  it("catalogo usa el userId como caller y pasa el search", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).catalogo(session, "messi");
    expect(client.getJson).toHaveBeenCalledWith("/api/figuritas?usuarioId=u1&search=messi&page=0&size=10", "T");
  });
});
