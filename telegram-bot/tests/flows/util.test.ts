import { describe, it, expect } from "vitest";
import { parseIndices } from "../../src/flows/util";

describe("parseIndices", () => {
  it("parsea una lista válida y deduplica preservando orden", () => {
    expect(parseIndices("1, 3, 3", 5)).toEqual([1, 3]);
  });
  it("devuelve [] si hay un índice fuera de rango", () => {
    expect(parseIndices("1,6", 5)).toEqual([]);
  });
  it("devuelve [] si hay texto no numérico", () => {
    expect(parseIndices("1,x", 5)).toEqual([]);
  });
  it("devuelve [] con tokens con basura pegada (no solo dígitos)", () => {
    expect(parseIndices("1abc,2", 5)).toEqual([]);
    expect(parseIndices("2.9", 5)).toEqual([]);
    expect(parseIndices("1e3", 5)).toEqual([]);
  });
  it("devuelve [] con string vacío", () => {
    expect(parseIndices("", 5)).toEqual([]);
  });
});
