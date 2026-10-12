import { describe, it, expect } from "vitest";
import {
  mapEstablecimientoRow,
  applyDemoEmailFallback,
  normalizeTipo,
} from "./resolveTenant";
import { PLATFORM_DEMO_EMAIL, isPlatformDemoEmail } from "./platformDemo";
import { defaultModulesForTipo, MAKEKA_LEGACY_MODULES } from "@/lib/modules/defaults";

const base = {
  id: "est-1",
  nombre: "La Makeka",
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
  it("defaults logo tagline display modules for ganadero empty modules", () => {
    const t = mapEstablecimientoRow(base);
    expect(t.logoUrl).toBe("/logo-makeka.png");
    expect(t.tagline).toBe("AI · Ganadera");
    expect(t.nombreDisplay).toBe("La Makeka");
    expect(t.modulesEnabled).toEqual([...MAKEKA_LEGACY_MODULES]);
    expect(t.rubros).toEqual(["ganaderia"]);
    expect(t.isPlatformDemo).toBe(false);
  });

  it("honors non-empty modules_enabled and display fields", () => {
    const t = mapEstablecimientoRow({
      ...base,
      nombre_display: "Makeka Display",
      logo_url: "/custom.png",
      tagline: "Custom",
      modules_enabled: ["inicio", "agricola"],
      rubros: ["agricola"],
      is_platform_demo: true,
      brand_theme: { primary: "#123", nested: { x: 1 } as unknown as string },
    });
    expect(t.nombreDisplay).toBe("Makeka Display");
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
    const t = mapEstablecimientoRow(base);
    const out = applyDemoEmailFallback(t, PLATFORM_DEMO_EMAIL);
    expect(out?.isPlatformDemo).toBe(false);
    expect(out?.modulesEnabled).toEqual(t.modulesEnabled);
  });
});
