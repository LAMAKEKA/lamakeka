import { describe, it, expect } from "vitest";
import {
  cell,
  mapPotreroImportRow,
  validatePotreroRow,
} from "./potrerosImport";

describe("potrerosImport", () => {
  it("cell resuelve aliases y acentos", () => {
    expect(cell({ hectareas: 10 }, "Hectáreas")).toBe(10);
    expect(cell({ Nombre: "Norte" }, "nombre")).toBe("Norte");
    expect(cell({ potrero: "Sur" }, "Nombre", "Potrero")).toBe("Sur");
  });

  it("validatePotreroRow exige nombre y ha > 0", () => {
    expect(validatePotreroRow({}).errors).toEqual(
      expect.arrayContaining(["Nombre vacío", "Hectáreas inválidas (> 0)"])
    );
    expect(
      validatePotreroRow({ Nombre: "A", Hectáreas: 5, Estado: "activo" }).errors
    ).toEqual([]);
  });

  it("validatePotreroRow rechaza estado inválido", () => {
    const r = validatePotreroRow({ Nombre: "A", Hectáreas: 1, Estado: "libre" });
    expect(r.errors[0]).toMatch(/Estado inválido/);
  });

  it("mapPotreroImportRow normaliza fila", () => {
    const row = mapPotreroImportRow({
      nombre: "  Norte  ",
      ha: "",
      hectareas: "12.5",
      estado: "DESCANSO",
      cabezas: "3",
      categoria: "Vacas",
      desde: "15/01/2026",
      lat: "-38.1",
      lon: "-63.2",
    });
    expect(row).toMatchObject({
      nombre: "Norte",
      hectareas: 12.5,
      estado: "descanso",
      cabezas: 3,
      categoria_animal: "Vacas",
      desde: "2026-01-15",
      latitud: -38.1,
      longitud: -63.2,
    });
  });
});
