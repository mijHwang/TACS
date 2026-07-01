import { describe, it, expect, vi } from "vitest";
import { subastasReply, iniciarOfertar } from "../../src/commands/subastas";
import type { SubastasApi } from "../../src/api/subastas";
import type { SubastaResponseDTO } from "../../src/api/types";

const s = { token: "T", username: "maxi", userId: "u1" };
function page(content: SubastaResponseDTO[]) {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, last: true };
}
const su: SubastaResponseDTO = {
  id: "s1", usuarioId: null, usuarioUsername: "d",
  figuritaId: "f", figuritaNumero: 9, figuritaJugadorNombre: "Álvarez",
  figuritaSeleccionNombre: null, figuritaEquipoNombre: null, figuritaCategoriaNombre: null,
  estado: "EN_CURSO", duracion: 2, horaInicio: null, horaFin: "2026-07-01T20:30:00",
  ofertasCount: 0, liderId: null, liderUsername: null, liderFiguritasNombres: null,
};

describe("comandos de subastas", () => {
  it("subastasReply informa cuando no hay activas", async () => {
    const api: SubastasApi = { activas: vi.fn(async () => page([])), ofertar: vi.fn() };
    expect(await subastasReply(api, s)).toMatch(/no hay subastas activas/i);
  });

  it("iniciarOfertar arma el flujo elegirSubasta", async () => {
    const api: SubastasApi = { activas: vi.fn(async () => page([su])), ofertar: vi.fn() };
    const res = await iniciarOfertar(api, s);
    expect(res.reply).toContain("1. #9 Álvarez");
    expect(res.flow).toEqual({ kind: "ofertar", step: "elegirSubasta", subastas: [su] });
  });

  it("iniciarOfertar sin activas no arma flujo", async () => {
    const api: SubastasApi = { activas: vi.fn(async () => page([])), ofertar: vi.fn() };
    expect((await iniciarOfertar(api, s)).flow).toBeUndefined();
  });
});
