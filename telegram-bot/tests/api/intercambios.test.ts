import { describe, it, expect, vi } from "vitest";
import { createIntercambiosApi } from "../../src/api/intercambios";
import type { ApiClient } from "../../src/api/client";

const s = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

function client(): ApiClient {
  return {
    getJson: vi.fn(async () => emptyPage),
    postJson: vi.fn(async () => ({})),
    postText: vi.fn(),
    put: vi.fn(async () => {}),
  };
}

describe("IntercambiosApi", () => {
  it("recibidas pega al endpoint con el userId", async () => {
    const c = client();
    await createIntercambiosApi(c).recibidas(s);
    expect(c.getJson).toHaveBeenCalledWith("/api/solicitudes-intercambio/recibidas/u1?page=0&size=10", "T");
  });

  it("enviadas pega al endpoint con el userId", async () => {
    const c = client();
    await createIntercambiosApi(c).enviadas(s);
    expect(c.getJson).toHaveBeenCalledWith("/api/solicitudes-intercambio/enviadas/u1?page=0&size=10", "T");
  });

  it("aceptar hace PUT /{id}/aceptar", async () => {
    const c = client();
    await createIntercambiosApi(c).aceptar(s, "abc");
    expect(c.put).toHaveBeenCalledWith("/api/solicitudes-intercambio/abc/aceptar", "T");
  });

  it("rechazar hace PUT /{id}/rechazar", async () => {
    const c = client();
    await createIntercambiosApi(c).rechazar(s, "abc");
    expect(c.put).toHaveBeenCalledWith("/api/solicitudes-intercambio/abc/rechazar", "T");
  });

  it("proponer hace POST con figuritaId y figuritasOfrecidas", async () => {
    const c = client();
    await createIntercambiosApi(c).proponer(s, "f1", ["o1", "o2"]);
    expect(c.postJson).toHaveBeenCalledWith(
      "/api/solicitudes-intercambio",
      { usuarioId: "u1", figuritaId: "f1", figuritasOfrecidas: ["o1", "o2"] },
      "T",
    );
  });
});
