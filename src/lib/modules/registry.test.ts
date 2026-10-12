import { describe, it, expect } from "vitest";
import { filterModules, MODULE_REGISTRY, getModule } from "./registry";
import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
  MAKEKA_LEGACY_MODULES,
  PLATFORM_DEMO_MODULES,
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
  it("Makeka legacy / ganadero includes manga and hacienda", () => {
    const gan = defaultModulesForTipo("ganadero");
    expect(gan).toContain("manga");
    expect(gan).toContain("hacienda");
    expect(gan).toEqual([...MAKEKA_LEGACY_MODULES]);
  });

  it("agricola default excludes manga", () => {
    expect(defaultModulesForTipo("agricola")).not.toContain("manga");
    expect(defaultModulesForTipo("agricola")).toContain("agricola");
  });

  it("mixto includes manga and agricola", () => {
    const m = defaultModulesForTipo("mixto");
    expect(m).toContain("manga");
    expect(m).toContain("agricola");
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
});
