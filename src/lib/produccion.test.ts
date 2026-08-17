import { describe, it, expect } from "vitest";
import {
  maplesToHuevos,
  parseEnteroNoNegativo,
  daysInclusive,
  calcularPostura,
  calcularPlantelInicial,
  calcularMortalidad,
  nuevaCantidad,
} from "./produccion";

describe("maplesToHuevos", () => {
  it("convierte 0 maples a 0 huevos", () => {
    expect(maplesToHuevos(0)).toBe(0);
  });

  it("convierte 4 maples a 120 huevos", () => {
    expect(maplesToHuevos(4)).toBe(120);
  });
});

describe("parseEnteroNoNegativo", () => {
  it("acepta 0", () => {
    expect(parseEnteroNoNegativo("0")).toBe(0);
  });

  it("acepta enteros positivos", () => {
    expect(parseEnteroNoNegativo("12")).toBe(12);
  });

  it("rechaza vacío", () => {
    expect(parseEnteroNoNegativo("")).toBeNull();
  });

  it("rechaza negativo", () => {
    expect(parseEnteroNoNegativo("-1")).toBeNull();
  });

  it("rechaza decimal", () => {
    expect(parseEnteroNoNegativo("1.5")).toBeNull();
  });
});

describe("daysInclusive", () => {
  it("cuenta un solo día", () => {
    expect(daysInclusive("2026-08-01", "2026-08-01")).toBe(1);
  });

  it("cuenta un mes de 31 días", () => {
    expect(daysInclusive("2026-08-01", "2026-08-31")).toBe(31);
  });
});

describe("calcularPostura", () => {
  it("devuelve null si el plantel es 0", () => {
    expect(calcularPostura(70, 0, 1)).toBeNull();
  });

  it("devuelve null si los días son 0", () => {
    expect(calcularPostura(70, 20, 0)).toBeNull();
  });

  it("calcula 3.5 con 2 maples + 10 merma, 20 gallinas, 1 día", () => {
    expect(calcularPostura(70, 20, 1)).toBe(3.5);
  });
});

describe("calcularPlantelInicial", () => {
  it("reconstruye 95 desde 90 actuales + 5 muertes", () => {
    expect(calcularPlantelInicial(90, 0, 5, 0)).toBe(95);
  });
});

describe("calcularMortalidad", () => {
  it("devuelve null si plantelInicial <= 0", () => {
    expect(calcularMortalidad(5, 0)).toBeNull();
  });

  it("calcula 5/95", () => {
    expect(calcularMortalidad(5, 95)).toBeCloseTo(5 / 95);
  });
});

describe("nuevaCantidad", () => {
  it("suma en alta", () => {
    expect(nuevaCantidad(90, "alta", 10)).toBe(100);
  });

  it("resta en muerte", () => {
    expect(nuevaCantidad(90, "muerte", 5)).toBe(85);
  });

  it("devuelve null si el plantel quedaría negativo", () => {
    expect(nuevaCantidad(3, "venta", 5)).toBeNull();
  });
});
