import { describe, it, expect } from "vitest";
import { seleccionarPush } from "../../src/push/notifier";
import type { NotificacionDTO } from "../../src/api/types";

function notif(id: string, leida: boolean | null = false): NotificacionDTO {
  return { id, tipo: "X", titulo: "t" + id, mensaje: "m", leida, fecha: null, enlace: null };
}

describe("seleccionarPush", () => {
  it("primera vez: baseline, no empuja pero marca como vistas", () => {
    const vistos = new Set<string>();
    const push = seleccionarPush([notif("a"), notif("b")], vistos, true);
    expect(push).toEqual([]);
    expect(vistos.has("a")).toBe(true);
    expect(vistos.has("b")).toBe(true);
  });

  it("después: empuja solo las nuevas no leídas", () => {
    const vistos = new Set(["a"]);
    const push = seleccionarPush([notif("a"), notif("c")], vistos, false);
    expect(push.map((n) => n.id)).toEqual(["c"]);
  });

  it("no empuja las ya leídas (pero las marca vistas)", () => {
    const vistos = new Set<string>();
    const push = seleccionarPush([notif("d", true)], vistos, false);
    expect(push).toEqual([]);
    expect(vistos.has("d")).toBe(true);
  });

  it("no re-empuja las ya vistas", () => {
    const vistos = new Set(["e"]);
    expect(seleccionarPush([notif("e")], vistos, false)).toEqual([]);
  });
});
