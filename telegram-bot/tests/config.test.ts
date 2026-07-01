import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("lanza si falta TELEGRAM_BOT_TOKEN", () => {
    expect(() => loadConfig({})).toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it("usa BACKEND_URL por defecto cuando no está seteado", () => {
    const cfg = loadConfig({ TELEGRAM_BOT_TOKEN: "abc" });
    expect(cfg).toEqual({ botToken: "abc", backendUrl: "http://localhost:8080" });
  });

  it("respeta BACKEND_URL cuando está seteado", () => {
    const cfg = loadConfig({ TELEGRAM_BOT_TOKEN: "abc", BACKEND_URL: "http://backend:8080" });
    expect(cfg.backendUrl).toBe("http://backend:8080");
  });
});
