import { describe, expect, it } from "vitest";
import {
  countByCategoria,
  countByPotrero,
  countEnStock,
  countSinUbicar,
  enStock,
  resolveEstadoAlta,
} from "./haciendaStock";

describe("enStock", () => {
  it("activo y sin_ubicar cuentan", () => {
    expect(enStock("activo")).toBe(true);
    expect(enStock("sin_ubicar")).toBe(true);
  });

  it("bajas no cuentan", () => {
    expect(enStock("vendido")).toBe(false);
    expect(enStock("muerto")).toBe(false);
    expect(enStock("transferido")).toBe(false);
    expect(enStock("baja")).toBe(false);
  });
});

describe("resolveEstadoAlta", () => {
  it("con potrero → activo", () => {
    expect(resolveEstadoAlta("uuid-potrero")).toBe("activo");
  });

  it("sin potrero → sin_ubicar", () => {
    expect(resolveEstadoAlta(null)).toBe("sin_ubicar");
    expect(resolveEstadoAlta(undefined)).toBe("sin_ubicar");
    expect(resolveEstadoAlta("")).toBe("sin_ubicar");
  });
});

describe("counts", () => {
  const rows = [
    { categoria: "Vacas", estado: "activo", potrero_id: "p1" },
    { categoria: "Vacas", estado: "activo", potrero_id: "p1" },
    { categoria: "Terneros", estado: "sin_ubicar", potrero_id: null },
    { categoria: null, estado: "activo", potrero_id: "p2" },
    { categoria: "Vacas", estado: "vendido", potrero_id: "p1" },
    { categoria: "  ", estado: "activo", potrero_id: "p2" },
  ];

  it("countEnStock ignora bajas", () => {
    expect(countEnStock(rows)).toBe(5);
  });

  it("countSinUbicar", () => {
    expect(countSinUbicar(rows)).toBe(1);
  });

  it("countByCategoria agrupa solo stock y null → Sin categoría", () => {
    expect(countByCategoria(rows)).toEqual({
      Vacas: 2,
      Terneros: 1,
      "Sin categoría": 2,
    });
  });

  it("countByPotrero ignora sin potrero y bajas", () => {
    expect(countByPotrero(rows)).toEqual({
      p1: 2,
      p2: 2,
    });
  });

  it("lista vacía", () => {
    expect(countByCategoria([])).toEqual({});
    expect(countByPotrero([])).toEqual({});
    expect(countEnStock([])).toBe(0);
    expect(countSinUbicar([])).toBe(0);
  });
});
