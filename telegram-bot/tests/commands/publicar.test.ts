import { describe, it, expect, vi } from "vitest";
import { iniciarPublicar } from "../../src/commands/publicar";
import type { FiguritasApi } from "../../src/api/figuritas";
import type { FiguritaResponseDTO } from "../../src/api/types";

const session = { token: "T", username: "maxi", userId: "u1" };
const fig: FiguritaResponseDTO = {
  id: "f1", numero: 7, figuritaBaseId: "b7", count: 3,
  jugadorNombre: "Messi", seleccionNombre: "Argentina",
  equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};

function api(page: { content: FiguritaResponseDTO[]; last: boolean; totalElements: number }): FiguritasApi {
  return {
    coleccion: vi.fn(), faltantes: vi.fn(), catalogo: vi.fn(),
    repetidas: vi.fn(async () => ({ ...page, page: 0, size: 50, totalPages: 1 })),
  };
}

describe("iniciarPublicar", () => {
  it("sin repetidas: mensaje y sin flujo", async () => {
    const res = await iniciarPublicar(api({ content: [], last: true, totalElements: 0 }), session);
    expect(res.flow).toBeUndefined();
    expect(res.reply).toMatch(/no tenés figuritas repetidas/i);
  });

  it("con repetidas: lista numerada y arranca el flujo en 'select'", async () => {
    const res = await iniciarPublicar(api({ content: [fig], last: true, totalElements: 1 }), session);
    expect(res.reply).toContain("1. #7 · Messi (Argentina) ×3");
    expect(res.flow).toEqual({ kind: "publicar", step: "select", opciones: [fig] });
  });
});
