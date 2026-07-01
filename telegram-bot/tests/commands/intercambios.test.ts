import { describe, it, expect, vi } from "vitest";
import { solicitudesReply, aceptarReply, rechazarReply, iniciarProponer } from "../../src/commands/intercambios";
import type { IntercambiosApi } from "../../src/api/intercambios";
import type { PublicacionesApi } from "../../src/api/publicaciones";
import type { SolicitudDTO, FiguritaPublicadaResponseDTO } from "../../src/api/types";

const s = { token: "T", username: "maxi", userId: "u1" };
function page<T>(content: T[]) {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, last: true };
}
function intApi(over: Partial<IntercambiosApi>): IntercambiosApi {
  return {
    recibidas: vi.fn(async () => page<SolicitudDTO>([])),
    enviadas: vi.fn(async () => page<SolicitudDTO>([])),
    aceptar: vi.fn(async () => {}),
    rechazar: vi.fn(async () => {}),
    proponer: vi.fn(),
    ...over,
  };
}
const sol: SolicitudDTO = {
  id: "sol9", estado: "PENDIENTE", destinatarioUsername: "yo",
  usuario: { username: "otro" }, figuritasOfrecidas: [],
};

describe("comandos de intercambios", () => {
  it("solicitudesReply arma recibidas y enviadas", async () => {
    const out = await solicitudesReply(intApi({}), s);
    expect(out).toContain("📥 Recibidas");
    expect(out).toContain("📤 Enviadas");
  });

  it("aceptarReply valida un número no entero", async () => {
    expect(await aceptarReply(intApi({}), s, Number.NaN)).toMatch(/indicá el número/i);
  });

  it("aceptarReply avisa si está fuera de rango", async () => {
    const out = await aceptarReply(intApi({ recibidas: vi.fn(async () => page<SolicitudDTO>([])) }), s, 2);
    expect(out).toMatch(/no hay una solicitud recibida #2/i);
  });

  it("aceptarReply actúa sobre la n-ésima recibida", async () => {
    const aceptar = vi.fn(async () => {});
    const out = await aceptarReply(intApi({ recibidas: vi.fn(async () => page([sol])), aceptar }), s, 1);
    expect(aceptar).toHaveBeenCalledWith(s, "sol9");
    expect(out).toMatch(/aceptaste la solicitud #1/i);
  });

  it("rechazarReply llama a rechazar", async () => {
    const rechazar = vi.fn(async () => {});
    const out = await rechazarReply(intApi({ recibidas: vi.fn(async () => page([sol])), rechazar }), s, 1);
    expect(rechazar).toHaveBeenCalledWith(s, "sol9");
    expect(out).toMatch(/rechazaste/i);
  });

  it("iniciarProponer sin disponibles no arma flujo", async () => {
    const pubApi: PublicacionesApi = { publicar: vi.fn(), disponibles: vi.fn(async () => page<FiguritaPublicadaResponseDTO>([])) };
    const res = await iniciarProponer(pubApi, s);
    expect(res.flow).toBeUndefined();
    expect(res.reply).toMatch(/no hay figuritas publicadas/i);
  });

  it("iniciarProponer con disponibles arma flujo elegirObjetivo", async () => {
    const pub: FiguritaPublicadaResponseDTO = {
      id: "p1", figuritaBaseId: "b", figuritaNumero: 7, figuritaJugadorNombre: "Messi",
      figuritaSeleccionNombre: "", figuritaEquipoNombre: "", figuritaCategoriaNombre: "",
      figuritaIds: ["fig1"], cantidad: 2, usuarioId: "o1", usuarioUsername: "otro",
      fechaPublicacion: "", estado: "DISPONIBLE",
    };
    const pubApi: PublicacionesApi = { publicar: vi.fn(), disponibles: vi.fn(async () => page([pub])) };
    const res = await iniciarProponer(pubApi, s);
    expect(res.reply).toContain("1. #7 · Messi — de @otro ×2");
    expect(res.flow).toEqual({ kind: "proponer", step: "elegirObjetivo", objetivos: [pub] });
  });
});
