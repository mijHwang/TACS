import { describe, it, expect, vi } from "vitest";
import { handlePublicar } from "../../src/flows/publicar";
import { createSessionStore } from "../../src/session/store";
import { ApiError } from "../../src/errors";
import type { PublicacionesApi } from "../../src/api/publicaciones";
import type { FiguritaResponseDTO } from "../../src/api/types";

const fig: FiguritaResponseDTO = {
  id: "f1", numero: 7, figuritaBaseId: "b7", count: 3,
  jugadorNombre: "Messi", seleccionNombre: "Argentina",
  equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};

function deps(publicar: PublicacionesApi["publicar"]) {
  const sessions = createSessionStore();
  sessions.set(1, { token: "T", username: "maxi", userId: "u1" });
  return { sessions, publicaciones: { publicar } as PublicacionesApi };
}

describe("handlePublicar", () => {
  it("select inválido: re-pide sin cambiar el flujo", async () => {
    const d = deps(vi.fn());
    const flow = { kind: "publicar", step: "select", opciones: [fig] } as const;
    const res = await handlePublicar(flow, "9", 1, d);
    expect(res.next).toEqual(flow);
    expect(res.replies[0]).toMatch(/entre 1 y 1/);
  });

  it("select válido: pasa a pedir cantidad", async () => {
    const d = deps(vi.fn());
    const res = await handlePublicar({ kind: "publicar", step: "select", opciones: [fig] }, "1", 1, d);
    expect(res.next).toEqual({ kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" });
  });

  it("cantidad inválida: re-pide", async () => {
    const d = deps(vi.fn());
    const flow = { kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" } as const;
    const res = await handlePublicar(flow, "0", 1, d);
    expect(res.next).toEqual(flow);
    expect(res.replies[0]).toMatch(/mayor a 0/i);
  });

  it("cantidad válida: publica y termina", async () => {
    const publicar = vi.fn(async () => ({}) as never);
    const d = deps(publicar);
    const res = await handlePublicar(
      { kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" },
      "2", 1, d,
    );
    expect(publicar).toHaveBeenCalledWith({ token: "T", username: "maxi", userId: "u1" }, "b7", 2);
    expect(res.clear).toBe(true);
    expect(res.replies[0]).toMatch(/publicaste/i);
  });

  it("error 400 del backend: muestra el motivo y termina", async () => {
    const publicar = vi.fn(async () => {
      throw new ApiError(400, "Cantidad supera las repetidas disponibles.");
    });
    const d = deps(publicar);
    const res = await handlePublicar(
      { kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" },
      "99", 1, d,
    );
    expect(res.clear).toBe(true);
    expect(res.replies[0]).toContain("Cantidad supera");
  });
});
