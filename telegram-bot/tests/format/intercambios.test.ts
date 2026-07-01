import { describe, it, expect } from "vitest";
import { listaRecibidas, listaEnviadas } from "../../src/format/intercambios";
import type { PagedResponse, SolicitudDTO } from "../../src/api/types";

function page(content: SolicitudDTO[]): PagedResponse<SolicitudDTO> {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, last: true };
}

describe("format/intercambios", () => {
  it("recibidas muestra estado, solicitante y cantidad ofrecida", () => {
    const sol: SolicitudDTO = {
      id: "1", estado: "PENDIENTE", destinatarioUsername: "yo",
      usuario: { username: "otro" }, figuritasOfrecidas: [{}, {}],
    };
    expect(listaRecibidas(page([sol]), "vacío")).toContain("1. [PENDIENTE] de @otro · ofrece 2 figurita(s)");
  });

  it("enviadas muestra el destinatario", () => {
    const sol: SolicitudDTO = {
      id: "1", estado: "ACEPTADO", destinatarioUsername: "otro",
      usuario: { username: "yo" }, figuritasOfrecidas: [{}],
    };
    expect(listaEnviadas(page([sol]), "vacío")).toContain("para @otro");
  });

  it("usa el título vacío cuando no hay solicitudes", () => {
    expect(listaRecibidas(page([]), "nada")).toBe("nada");
  });
});
