import { describe, it, expect } from "vitest";
import { describirSubasta, listaSubastas } from "../../src/format/subastas";
import type { PagedResponse, SubastaResponseDTO } from "../../src/api/types";

const su: SubastaResponseDTO = {
  id: "s1", usuarioId: null, usuarioUsername: "dueño",
  figuritaId: "f", figuritaNumero: 9, figuritaJugadorNombre: "Álvarez",
  figuritaSeleccionNombre: null, figuritaEquipoNombre: null, figuritaCategoriaNombre: null,
  estado: "EN_CURSO", duracion: 2, horaInicio: null, horaFin: "2026-07-01T20:30:00",
  ofertasCount: 3, liderId: "l", liderUsername: "pepe", liderFiguritasNombres: null,
};

function page(content: SubastaResponseDTO[]): PagedResponse<SubastaResponseDTO> {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, last: true };
}

describe("format/subastas", () => {
  it("describe figurita, ofertas, líder y fin", () => {
    const out = describirSubasta(su);
    expect(out).toContain("#9 Álvarez");
    expect(out).toContain("3 oferta(s)");
    expect(out).toContain("líder @pepe");
    expect(out).toContain("2026-07-01 20:30");
  });

  it("sin líder muestra 'sin ofertas'", () => {
    expect(describirSubasta({ ...su, liderUsername: null, ofertasCount: 0 })).toContain("sin ofertas");
  });

  it("lista numera y usa el título vacío", () => {
    expect(listaSubastas(page([]), "no hay")).toBe("no hay");
    expect(listaSubastas(page([su]), "x")).toContain("1. #9 Álvarez");
  });
});
