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
});
