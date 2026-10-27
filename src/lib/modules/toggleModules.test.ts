import { describe, it, expect } from "vitest";
import {
  applyModuleToggle,
  configurableModuleIds,
  isModuleToggleable,
  normalizeModulesEnabled,
  rubrosForModules,
  LOCKED_MODULE_IDS,
} from "./toggleModules";

describe("toggleModules", () => {
  it("inicio is locked and not toggleable", () => {
    expect(LOCKED_MODULE_IDS).toContain("inicio");
    expect(isModuleToggleable("inicio")).toBe(false);
    expect(configurableModuleIds()).not.toContain("inicio");
    expect(configurableModuleIds()).toContain("produccion_huevos");
    expect(configurableModuleIds()).toContain("agricola");
  });

  it("applyModuleToggle enables huevos without dropping manga", () => {
    const next = applyModuleToggle(
      ["inicio", "manga", "hacienda"],
      "produccion_huevos",
      true
    );
    expect(next).toContain("inicio");
    expect(next).toContain("manga");
    expect(next).toContain("produccion_huevos");
    // registry order
    expect(next.indexOf("manga")).toBeLessThan(next.indexOf("produccion_huevos"));
  });

  it("applyModuleToggle disables agricola", () => {
    const next = applyModuleToggle(
      ["inicio", "agricola", "insumos"],
      "agricola",
      false
    );
    expect(next).not.toContain("agricola");
    expect(next).toContain("inicio");
    expect(next).toContain("insumos");
  });

  it("cannot turn off inicio", () => {
    const next = applyModuleToggle(["inicio", "manga"], "inicio", false);
    expect(next).toContain("inicio");
  });

  it("normalizeModulesEnabled drops unknown and keeps inicio", () => {
    expect(normalizeModulesEnabled(["nope", "manga"])).toEqual([
      "inicio",
      "manga",
    ]);
  });

  it("rubrosForModules adds ganaderia/agricola/huevos from modules", () => {
    expect(
      rubrosForModules(["inicio", "manga", "produccion_huevos"], [])
    ).toEqual(["ganaderia", "huevos"]);
    expect(rubrosForModules(["inicio", "agricola"], ["ganaderia"])).toEqual([
      "ganaderia",
      "agricola",
    ]);
  });
});
