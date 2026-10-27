import { describe, it, expect } from "vitest";
import { filterModules, MODULE_REGISTRY, getModule } from "./registry";
import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
  MAKEKA_LEGACY_MODULES,
  GANADERO_GENERIC_MODULES,
  PLATFORM_DEMO_MODULES,
  looksLikeMakekaTenant,
} from "./defaults";

describe("filterModules", () => {
  it("returns only enabled modules in registry order", () => {
    const ids = filterModules(["inicio", "hacienda", "nope"]).map((m) => m.id);
    expect(ids).toEqual(["inicio", "hacienda"]);
  });

  it("preserves registry order even if enabled is shuffled", () => {
    const ids = filterModules(["senasa", "inicio", "manga"]).map((m) => m.id);
    expect(ids).toEqual(["inicio", "manga", "senasa"]);
  });

  it("includeSecondary false skips secondary slot by default", () => {
    const ids = filterModules(["inicio", "whatsapp"]).map((m) => m.id);
    expect(ids).toEqual(["inicio"]);
  });

  it("includeSecondary true keeps whatsapp if enabled", () => {
    const ids = filterModules(["inicio", "whatsapp"], {
      includeSecondary: true,
    }).map((m) => m.id);
    expect(ids).toEqual(["inicio", "whatsapp"]);
  });
});

describe("getModule", () => {
  it("finds manga", () => {
    expect(getModule("manga")?.href).toBe("/manga");
  });
});

describe("defaults", () => {
  it("ganadero genérico = PRD §5.4 sin huevos (no MAKEKA_LEGACY)", () => {
    const gan = defaultModulesForTipo("ganadero");
    expect(gan).toContain("manga");
    expect(gan).toContain("hacienda");
    expect(gan).not.toContain("produccion_huevos");
    expect(gan).not.toContain("agricola");
    expect(gan).toEqual([...GANADERO_GENERIC_MODULES]);
    expect(gan).not.toEqual([...MAKEKA_LEGACY_MODULES]);
  });

  it("MAKEKA_LEGACY still has huevos for real Makeka pack", () => {
    expect(MAKEKA_LEGACY_MODULES).toContain("produccion_huevos");
    expect(MAKEKA_LEGACY_MODULES).toContain("manga");
  });

  it("agricola default excludes manga", () => {
    expect(defaultModulesForTipo("agricola")).not.toContain("manga");
    expect(defaultModulesForTipo("agricola")).toContain("agricola");
  });

  it("mixto includes manga and agricola, no huevos", () => {
    const m = defaultModulesForTipo("mixto");
    expect(m).toContain("manga");
    expect(m).toContain("agricola");
    expect(m).not.toContain("produccion_huevos");
  });

  it("defaultRubrosForTipo matches tipo", () => {
    expect(defaultRubrosForTipo("ganadero")).toEqual(["ganaderia"]);
    expect(defaultRubrosForTipo("agricola")).toEqual(["agricola"]);
    expect(defaultRubrosForTipo("mixto")).toEqual(["ganaderia", "agricola"]);
  });

  it("platform demo is non-empty proper subset of registry ids", () => {
    expect(PLATFORM_DEMO_MODULES.length).toBeGreaterThan(0);
    expect(MODULE_REGISTRY.length).toBeGreaterThan(PLATFORM_DEMO_MODULES.length);
    for (const id of PLATFORM_DEMO_MODULES) {
      expect(MODULE_REGISTRY.some((m) => m.id === id)).toBe(true);
    }
  });

  it("every MAKEKA_LEGACY id exists in registry", () => {
    for (const id of MAKEKA_LEGACY_MODULES) {
      expect(getModule(id)).toBeTruthy();
    }
  });

  it("looksLikeMakekaTenant detects Makeka/Mateca names", () => {
    expect(looksLikeMakekaTenant({ nombre: "La Makeka" })).toBe(true);
    expect(looksLikeMakekaTenant({ nombreDisplay: "Mateca Sur" })).toBe(true);
    expect(looksLikeMakekaTenant({ nombre: "Campo San José" })).toBe(false);
  });
});
