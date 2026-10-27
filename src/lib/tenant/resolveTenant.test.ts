import { describe, it, expect } from "vitest";
import {
  mapEstablecimientoRow,
  applyDemoEmailFallback,
  normalizeTipo,
} from "./resolveTenant";
import { PLATFORM_DEMO_EMAIL, isPlatformDemoEmail } from "./platformDemo";
import {
  defaultModulesForTipo,
  MAKEKA_LEGACY_MODULES,
  GANADERO_GENERIC_MODULES,
} from "@/lib/modules/defaults";

const makekaBase = {
  id: "est-1",
  nombre: "La Makeka",
  tipo: "ganadero",
};

const genericBase = {
  id: "est-2",
  nombre: "Campo San José",
  tipo: "ganadero",
};

describe("normalizeTipo", () => {
  it("passes known tipos", () => {
    expect(normalizeTipo("mixto")).toBe("mixto");
  });
  it("unknown → ganadero", () => {
    expect(normalizeTipo("otro")).toBe("ganadero");
  });
});

describe("mapEstablecimientoRow", () => {
  it("Makeka empty modules → MAKEKA_LEGACY pack", () => {
    const t = mapEstablecimientoRow(makekaBase);
    expect(t.logoUrl).toBe("/logo-makeka.png");
    expect(t.tagline).toBe("AI · Ganadera");
    expect(t.nombreDisplay).toBe("La Makeka");
    expect(t.modulesEnabled).toEqual([...MAKEKA_LEGACY_MODULES]);
    expect(t.rubros).toEqual(["ganaderia"]);
    expect(t.isPlatformDemo).toBe(false);
  });

  it("generic ganadero empty modules → GANADERO_GENERIC (no huevos)", () => {
    const t = mapEstablecimientoRow(genericBase);
    expect(t.nombreDisplay).toBe("Campo San José");
    expect(t.modulesEnabled).toEqual([...GANADERO_GENERIC_MODULES]);
    expect(t.modulesEnabled).not.toContain("produccion_huevos");
    expect(t.tagline).toBe("AI · Ganadera");
  });

  it("honors non-empty modules_enabled and display fields", () => {
    const t = mapEstablecimientoRow({
      ...genericBase,
      nombre_display: "San José Display",
      logo_url: "/custom.png",
      tagline: "Custom",
      modules_enabled: ["inicio", "agricola"],
      rubros: ["agricola"],
      is_platform_demo: true,
      brand_theme: { primary: "#123", nested: { x: 1 } as unknown as string },
    });
    expect(t.nombreDisplay).toBe("San José Display");
    expect(t.logoUrl).toBe("/custom.png");
    expect(t.tagline).toBe("Custom");
    expect(t.modulesEnabled).toEqual(["inicio", "agricola"]);
    expect(t.rubros).toEqual(["agricola"]);
    expect(t.isPlatformDemo).toBe(true);
    expect(t.brandTheme).toEqual({ primary: "#123" });
  });

  it("agricola empty modules → defaultModulesForTipo agricola", () => {
    const t = mapEstablecimientoRow({
      id: "a1",
      nombre: "Campo Agri",
      tipo: "agricola",
      modules_enabled: [],
    });
    expect(t.modulesEnabled).toEqual([...defaultModulesForTipo("agricola")]);
    expect(t.modulesEnabled).not.toContain("manga");
    expect(t.tagline).toBe("AI · Agrícola");
  });
});

describe("platform demo email", () => {
  it("constant is lab email only", () => {
    expect(PLATFORM_DEMO_EMAIL).toBe("testprueba@gmail.com");
    expect(isPlatformDemoEmail("TestPrueba@gmail.com")).toBe(true);
    expect(isPlatformDemoEmail("otro@x.com")).toBe(false);
  });

  it("applyDemoEmailFallback null stays null", () => {
    expect(applyDemoEmailFallback(null, PLATFORM_DEMO_EMAIL)).toBeNull();
    expect(applyDemoEmailFallback(null, "x@y.com")).toBeNull();
  });

  it("does not force isPlatformDemo from email alone", () => {
    const t = mapEstablecimientoRow(genericBase);
    const out = applyDemoEmailFallback(t, PLATFORM_DEMO_EMAIL);
    expect(out?.isPlatformDemo).toBe(false);
    expect(out?.modulesEnabled).toEqual(t.modulesEnabled);
  });
});
