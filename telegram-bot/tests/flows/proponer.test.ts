import { describe, it, expect, vi } from "vitest";
import { handleProponer } from "../../src/flows/proponer";
import { createSessionStore } from "../../src/session/store";
import type { FiguritasApi } from "../../src/api/figuritas";
import type { IntercambiosApi } from "../../src/api/intercambios";
import type { FiguritaPublicadaResponseDTO, FiguritaResponseDTO } from "../../src/api/types";

const pub: FiguritaPublicadaResponseDTO = {
  id: "p1", figuritaBaseId: "b", figuritaNumero: 7, figuritaJugadorNombre: "Messi",
  figuritaSeleccionNombre: "", figuritaEquipoNombre: "", figuritaCategoriaNombre: "",
  figuritaIds: ["figObjetivo"], cantidad: 1, usuarioId: "o1", usuarioUsername: "otro",
  fechaPublicacion: "", estado: "DISPONIBLE",
};
const rep: FiguritaResponseDTO = {
  id: "miFig", numero: 3, figuritaBaseId: "b3", count: 2, jugadorNombre: "Di María",
  seleccionNombre: "Arg", equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};
function repPage(content: FiguritaResponseDTO[]) {
  return { content, page: 0, size: 50, totalElements: content.length, totalPages: 1, last: true };
}
function deps(over: { figuritas?: Partial<FiguritasApi>; intercambios?: Partial<IntercambiosApi> } = {}) {
  const sessions = createSessionStore();
  sessions.set(1, { token: "T", username: "maxi", userId: "u1" });
  const figuritas: FiguritasApi = {
    coleccion: vi.fn(), faltantes: vi.fn(), catalogo: vi.fn(),
    repetidas: vi.fn(async () => repPage([rep])), ...over.figuritas,
  };
  const intercambios: IntercambiosApi = {
    recibidas: vi.fn(), enviadas: vi.fn(), aceptar: vi.fn(), rechazar: vi.fn(),
    proponer: vi.fn(async () => ({})), ...over.intercambios,
  };
  return { sessions, figuritas, intercambios };
}

describe("handleProponer", () => {
  it("elegirObjetivo inválido re-pide sin cambiar el flujo", async () => {
    const flow = { kind: "proponer", step: "elegirObjetivo", objetivos: [pub] } as const;
    const res = await handleProponer(flow, "5", 1, deps());
    expect(res.next).toEqual(flow);
  });

  it("elegirObjetivo válido lista repetidas y pasa a elegirOfrecidas", async () => {
    const res = await handleProponer(
      { kind: "proponer", step: "elegirObjetivo", objetivos: [pub] }, "1", 1, deps(),
    );
    expect(res.next).toEqual({
      kind: "proponer", step: "elegirOfrecidas", figuritaId: "figObjetivo",
      objetivoDesc: "#7 Messi", ofrecibles: [rep],
    });
    expect(res.replies[0]).toContain("1. #3 · Di María");
  });

  it("elegirOfrecidas envía la propuesta con los ids elegidos", async () => {
    const proponer = vi.fn(async () => ({}));
    const flow = {
      kind: "proponer", step: "elegirOfrecidas", figuritaId: "figObjetivo",
      objetivoDesc: "#7 Messi", ofrecibles: [rep],
    } as const;
    const res = await handleProponer(flow, "1", 1, deps({ intercambios: { proponer } }));
    expect(proponer).toHaveBeenCalledWith({ token: "T", username: "maxi", userId: "u1" }, "figObjetivo", ["miFig"]);
    expect(res.clear).toBe(true);
    expect(res.replies[0]).toMatch(/propuesta enviada/i);
  });

  it("elegirOfrecidas con índice inválido re-pide", async () => {
    const flow = {
      kind: "proponer", step: "elegirOfrecidas", figuritaId: "x", objetivoDesc: "y", ofrecibles: [rep],
    } as const;
    const res = await handleProponer(flow, "9", 1, deps());
    expect(res.next).toEqual(flow);
  });
});
