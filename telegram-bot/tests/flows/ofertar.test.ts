import { describe, it, expect, vi } from "vitest";
import { handleOfertar } from "../../src/flows/ofertar";
import { createSessionStore } from "../../src/session/store";
import type { FiguritasApi } from "../../src/api/figuritas";
import type { SubastasApi } from "../../src/api/subastas";
import type { SubastaResponseDTO, FiguritaResponseDTO } from "../../src/api/types";

const su: SubastaResponseDTO = {
  id: "s1", usuarioId: null, usuarioUsername: "d",
  figuritaId: "f", figuritaNumero: 9, figuritaJugadorNombre: "Álvarez",
  figuritaSeleccionNombre: null, figuritaEquipoNombre: null, figuritaCategoriaNombre: null,
  estado: "EN_CURSO", duracion: 2, horaInicio: null, horaFin: "2026-07-01T20:30:00",
  ofertasCount: 0, liderId: null, liderUsername: null, liderFiguritasNombres: null,
};
const rep: FiguritaResponseDTO = {
  id: "miFig", numero: 3, figuritaBaseId: "b3", count: 2, jugadorNombre: "Di María",
  seleccionNombre: "Arg", equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};
function repPage(content: FiguritaResponseDTO[]) {
  return { content, page: 0, size: 50, totalElements: content.length, totalPages: 1, last: true };
}
function deps(over: { figuritas?: Partial<FiguritasApi>; subastas?: Partial<SubastasApi> } = {}) {
  const sessions = createSessionStore();
  sessions.set(1, { token: "T", username: "maxi", userId: "u1" });
  const figuritas: FiguritasApi = {
    coleccion: vi.fn(), faltantes: vi.fn(), catalogo: vi.fn(),
    repetidas: vi.fn(async () => repPage([rep])), ...over.figuritas,
  };
  const subastas: SubastasApi = { activas: vi.fn(), ofertar: vi.fn(async () => ({})), ...over.subastas };
  return { sessions, figuritas, subastas };
}

describe("handleOfertar", () => {
  it("elegirSubasta válido pasa a elegirFiguritas", async () => {
    const res = await handleOfertar(
      { kind: "ofertar", step: "elegirSubasta", subastas: [su] }, "1", 1, deps(),
    );
    expect(res.next).toEqual({
      kind: "ofertar", step: "elegirFiguritas", subastaId: "s1", subastaDesc: "#9 Álvarez", ofrecibles: [rep],
    });
  });

  it("elegirFiguritas envía la oferta", async () => {
    const ofertar = vi.fn(async () => ({}));
    const flow = {
      kind: "ofertar", step: "elegirFiguritas", subastaId: "s1", subastaDesc: "#9 Álvarez", ofrecibles: [rep],
    } as const;
    const res = await handleOfertar(flow, "1", 1, deps({ subastas: { ofertar } }));
    expect(ofertar).toHaveBeenCalledWith({ token: "T", username: "maxi", userId: "u1" }, "s1", ["miFig"]);
    expect(res.clear).toBe(true);
    expect(res.replies[0]).toMatch(/oferta enviada/i);
  });

  it("elegirSubasta inválido re-pide", async () => {
    const flow = { kind: "ofertar", step: "elegirSubasta", subastas: [su] } as const;
    const res = await handleOfertar(flow, "9", 1, deps());
    expect(res.next).toEqual(flow);
  });
});
