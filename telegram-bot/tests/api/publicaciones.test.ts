import { describe, it, expect, vi } from "vitest";
import { createPublicacionesApi } from "../../src/api/publicaciones";
import type { ApiClient } from "../../src/api/client";

const s = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true };

function client(): ApiClient {
  return { getJson: vi.fn(async () => emptyPage), postJson: vi.fn(async () => ({})), postText: vi.fn(), put: vi.fn() };
}

describe("PublicacionesApi", () => {
  it("publicar hace POST con usuarioId/figuritaBaseId/cantidad", async () => {
    const c = client();
    await createPublicacionesApi(c).publicar(s, "b7", 2);
    expect(c.postJson).toHaveBeenCalledWith(
      "/api/publicaciones",
      { usuarioId: "u1", figuritaBaseId: "b7", cantidad: 2 },
      "T",
    );
  });

  it("disponibles pega a /disponibles/{userId} con size", async () => {
    const c = client();
    await createPublicacionesApi(c).disponibles(s, 30);
    expect(c.getJson).toHaveBeenCalledWith("/api/publicaciones/disponibles/u1?page=0&size=30", "T");
  });
});
