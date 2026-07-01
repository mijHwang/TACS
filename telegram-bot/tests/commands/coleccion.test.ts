import { describe, it, expect, vi } from "vitest";
import { coleccionReply, faltantesReply, repetidasReply } from "../../src/commands/coleccion";
import type { FiguritasApi } from "../../src/api/figuritas";

const session = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

function api(over: Partial<FiguritasApi>): FiguritasApi {
  return { coleccion: vi.fn(), faltantes: vi.fn(), repetidas: vi.fn(), catalogo: vi.fn(), ...over };
}

describe("comandos de colección", () => {
  it("coleccionReply muestra el mensaje de vacío", async () => {
    const out = await coleccionReply(api({ coleccion: vi.fn(async () => emptyPage) }), session);
    expect(out).toMatch(/vacía/i);
  });

  it("faltantesReply felicita si no falta ninguna", async () => {
    const out = await faltantesReply(api({ faltantes: vi.fn(async () => emptyPage) }), session);
    expect(out).toMatch(/no te falta/i);
  });

  it("repetidasReply informa si no hay repetidas", async () => {
    const out = await repetidasReply(api({ repetidas: vi.fn(async () => emptyPage) }), session);
    expect(out).toMatch(/no tenés figuritas repetidas/i);
  });
});
