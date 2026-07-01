import { describe, it, expect } from "vitest";
import { createSessionStore } from "../../src/session/store";

describe("SessionStore", () => {
  it("guarda, recupera y limpia sesiones por chatId", () => {
    const store = createSessionStore();
    const s = { token: "t", username: "u", userId: "1" };

    expect(store.get(10)).toBeUndefined();
    store.set(10, s);
    expect(store.get(10)).toEqual(s);
    store.clear(10);
    expect(store.get(10)).toBeUndefined();
  });

  it("entries() devuelve todas las sesiones activas", () => {
    const store = createSessionStore();
    store.set(1, { token: "a", username: "u1", userId: "1" });
    store.set(2, { token: "b", username: "u2", userId: "2" });
    const entries = store.entries();
    expect(entries).toHaveLength(2);
    expect(entries.map(([id]) => id).sort()).toEqual([1, 2]);
  });
});
