import { describe, it, expect, vi } from "vitest";
import { createSubastasApi } from "../../src/api/subastas";
import type { ApiClient } from "../../src/api/client";

const s = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

function client(): ApiClient {
  return { getJson: vi.fn(async () => emptyPage), postJson: vi.fn(async () => ({})), postText: vi.fn(), put: vi.fn() };
}

describe("SubastasApi", () => {
  it("activas filtra por estado EN_CURSO", async () => {
    const c = client();
    await createSubastasApi(c).activas(s);
    expect(c.getJson).toHaveBeenCalledWith("/api/subastas?estado=EN_CURSO&page=0&size=10", "T");
  });

  it("ofertar hace POST /{id}/ofertar con usuarioId y figuritaIds", async () => {
    const c = client();
    await createSubastasApi(c).ofertar(s, "sub1", ["f1", "f2"]);
    expect(c.postJson).toHaveBeenCalledWith(
      "/api/subastas/sub1/ofertar",
      { usuarioId: "u1", figuritaIds: ["f1", "f2"] },
      "T",
    );
  });
});
