import { describe, it, expect } from "vitest";
import { describirFigurita, listaFiguritas, listaBases, listaNotificaciones } from "../../src/format/figuritas";
import type { PagedResponse, FiguritaResponseDTO, FiguritaBaseDTO, NotificacionDTO } from "../../src/api/types";

function page<T>(content: T[], last = true, total = content.length): PagedResponse<T> {
  return { content, page: 0, size: 10, totalElements: total, totalPages: 1, last };
}

const fig: FiguritaResponseDTO = {
  id: "1", numero: 7, figuritaBaseId: "b1", count: 3,
  jugadorNombre: "Messi", seleccionNombre: "Argentina",
  equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};

describe("format/figuritas", () => {
  it("describirFigurita muestra número, jugador, grupo y cantidad", () => {
    expect(describirFigurita(fig)).toBe("#7 · Messi (Argentina) ×3");
  });

  it("listaFiguritas numera y agrega el total", () => {
    const out = listaFiguritas(page([fig]), "vacío");
    expect(out).toContain("1. #7 · Messi (Argentina) ×3");
    expect(out).toContain("Total: 1");
  });

  it("listaFiguritas usa el título si está vacío", () => {
    expect(listaFiguritas(page([]), "No hay nada")).toBe("No hay nada");
  });

  it("listaFiguritas avisa cuando hay más páginas", () => {
    const out = listaFiguritas(page([fig], false, 25), "vacío");
    expect(out).toMatch(/hay más/i);
    expect(out).toContain("25");
  });

  it("listaBases numera faltantes", () => {
    const base: FiguritaBaseDTO = {
      id: "b1", numero: 10, jugadorNombre: "Di María",
      seleccionNombre: "Argentina", equipoNombre: null, categoriaNombre: null, imagenUrl: null,
    };
    expect(listaBases(page([base]), "vacío")).toContain("1. #10 · Di María (Argentina)");
  });

  it("listaNotificaciones marca leídas/no leídas", () => {
    const n: NotificacionDTO = {
      id: "1", tipo: "OFERTA", titulo: "Nueva oferta", mensaje: "Te ofertaron",
      leida: false, fecha: null, enlace: null,
    };
    const out = listaNotificaciones(page([n]));
    expect(out).toContain("Nueva oferta");
    expect(out).toContain("Te ofertaron");
  });
});
