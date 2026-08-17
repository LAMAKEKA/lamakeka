import { describe, it, expect } from "vitest";
import { normalizeEid, isValidEid } from "./eid";

describe("normalizeEid", () => {
  it("elimina caracteres no numéricos", () => {
    expect(normalizeEid(" 982 000 123 456 789 ")).toBe("982000123456789");
  });

  it("recorta a 15 dígitos", () => {
    expect(normalizeEid("12345678901234567890")).toBe("123456789012345");
  });

  it("devuelve string vacío si no hay dígitos", () => {
    expect(normalizeEid("abc")).toBe("");
  });
});

describe("isValidEid", () => {
  it("acepta un EID de 15 dígitos", () => {
    expect(isValidEid("982000123456789")).toBe(true);
  });

  it("rechaza un EID corto", () => {
    expect(isValidEid("12345")).toBe(false);
  });

  it("rechaza valores no numéricos", () => {
    expect(isValidEid("abc")).toBe(false);
  });
});
