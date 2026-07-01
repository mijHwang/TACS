import { describe, it, expect, vi } from "vitest";
import { buscarReply } from "../../src/commands/buscar";
import type { FiguritasApi } from "../../src/api/figuritas";

const session = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

function api(over: Partial<FiguritasApi>): FiguritasApi {
  return { coleccion: vi.fn(), faltantes: vi.fn(), repetidas: vi.fn(), catalogo: vi.fn(), ...over };
}

describe("buscarReply", () => {
  it("menciona el término buscado cuando no hay resultados", async () => {
    const out = await buscarReply(api({ catalogo: vi.fn(async () => emptyPage) }), session, "messi");
    expect(out).toContain("messi");
  });

  it("mensaje genérico cuando no hay búsqueda", async () => {
    const out = await buscarReply(api({ catalogo: vi.fn(async () => emptyPage) }), session, "");
    expect(out).toMatch(/no hay figuritas/i);
  });
});
