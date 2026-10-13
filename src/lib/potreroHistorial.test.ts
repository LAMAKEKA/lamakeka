import { describe, it, expect } from "vitest";
import {
  mapAnimalEventosToPotreroHistorial,
  POTRERO_HISTORIAL_TIPOS,
} from "./potreroHistorial";

const names = new Map([
  ["p1", "Norte"],
  ["p2", "Sur"],
]);

describe("mapAnimalEventosToPotreroHistorial", () => {
  it("maps cambio_potrero with from/to names", () => {
    const rows = mapAnimalEventosToPotreroHistorial(
      [
        {
          id: "e1",
          tipo: "cambio_potrero",
          fecha: "2026-10-01",
          eid: "123",
          usuario: "Juan",
          datos: { from: "p1", to: "p2" },
        },
      ],
      names
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].potrero).toBe("Sur");
    expect(rows[0].evento).toBe("Cambio de potrero");
    expect(rows[0].detalle).toContain("Norte → Sur");
    expect(rows[0].responsable).toBe("Juan");
  });

  it("skips tipos no-location", () => {
    const rows = mapAnimalEventosToPotreroHistorial(
      [
        {
          id: "e2",
          tipo: "cambio_categoria",
          fecha: "2026-10-01",
          eid: "1",
          usuario: null,
          datos: { from: "Vacas", to: "Toros" },
        },
      ],
      names
    );
    expect(rows).toHaveLength(0);
  });

  it("alta sin potrero → Sin ubicar", () => {
    const rows = mapAnimalEventosToPotreroHistorial(
      [
        {
          id: "e3",
          tipo: "alta",
          fecha: "2026-10-02",
          eid: "999",
          usuario: null,
          datos: {},
        },
      ],
      names
    );
    expect(rows[0].potrero).toBe("Sin ubicar");
    expect(rows[0].evento).toBe("Alta");
  });

  it("exports expected tipos", () => {
    expect(POTRERO_HISTORIAL_TIPOS).toContain("cambio_potrero");
    expect(POTRERO_HISTORIAL_TIPOS).toContain("alta");
  });
});
