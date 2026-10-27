import { describe, it, expect } from "vitest";
import {
  buildEstablecimientoInsert,
  toLegacyEstablecimientoInsert,
  isUniqueViolation,
} from "./buildEstablecimientoInsert";
import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
  GANADERO_GENERIC_MODULES,
  PLATFORM_DEMO_MODULES,
} from "@/lib/modules/defaults";
import { PLATFORM_DEMO_EMAIL } from "./platformDemo";

const base = {
  nombre: "  Campo San José  ",
  ubicacion: "  Córdoba  ",
  userId: "user-1",
  email: "owner@example.com",
};

describe("buildEstablecimientoInsert", () => {
  it("ganadero genérico → modules sin huevos + nombre del campo (no Makeka brand)", () => {
    const p = buildEstablecimientoInsert({ ...base, tipo: "ganadero" });
    expect(p.nombre).toBe("Campo San José");
    expect(p.ubicacion).toBe("Córdoba");
    expect(p.tipo).toBe("ganadero");
    expect(p.user_id).toBe("user-1");
    expect(p.nombre_display).toBe("Campo San José");
    expect(p.logo_url).toBe("/logo-makeka.png");
    expect(p.brand_theme).toBeNull();
    expect(p.tagline).toBe("AI · Ganadera");
    expect(p.modules_enabled).toEqual([...GANADERO_GENERIC_MODULES]);
    expect(p.modules_enabled).not.toContain("produccion_huevos");
    expect(p.rubros).toEqual(defaultRubrosForTipo("ganadero"));
    expect(p.is_platform_demo).toBe(false);
  });

  it("acepta logo vacío sin default Makeka", () => {
    const p = buildEstablecimientoInsert({
      ...base,
      tipo: "ganadero",
      logoUrl: "",
    });
    expect(p.logo_url).toBe("");
  });

  it("acepta logoUrl y brandTheme custom", () => {
    const p = buildEstablecimientoInsert({
      ...base,
      tipo: "ganadero",
      logoUrl: "https://cdn.example/logo.png",
      brandTheme: { campo: "#1e3a5f", cuero: "#c45c26" },
    });
    expect(p.logo_url).toBe("https://cdn.example/logo.png");
    expect(p.brand_theme).toEqual({ campo: "#1E3A5F", cuero: "#C45C26" });
  });

  it("agricola → sin manga + tagline Agrícola", () => {
    const p = buildEstablecimientoInsert({ ...base, tipo: "agricola" });
    expect(p.tagline).toBe("AI · Agrícola");
    expect(p.modules_enabled).toEqual([...defaultModulesForTipo("agricola")]);
    expect(p.modules_enabled).not.toContain("manga");
    expect(p.rubros).toEqual(["agricola"]);
  });

  it("mixto → ganadería + agrícola modules", () => {
    const p = buildEstablecimientoInsert({ ...base, tipo: "mixto" });
    expect(p.tagline).toBe("AI · Mixto");
    expect(p.modules_enabled).toEqual([...defaultModulesForTipo("mixto")]);
    expect(p.modules_enabled).toContain("manga");
    expect(p.modules_enabled).toContain("agricola");
    expect(p.modules_enabled).not.toContain("produccion_huevos");
    expect(p.rubros).toEqual(["ganaderia", "agricola"]);
  });

  it("demo email → is_platform_demo + PLATFORM_DEMO_MODULES", () => {
    const p = buildEstablecimientoInsert({
      ...base,
      tipo: "ganadero",
      email: "  TestPrueba@Gmail.com  ",
    });
    expect(p.is_platform_demo).toBe(true);
    expect(p.modules_enabled).toEqual([...PLATFORM_DEMO_MODULES]);
    expect(p.tagline).toBe("Plataforma multi-rubro");
    expect(PLATFORM_DEMO_EMAIL).toBe("testprueba@gmail.com");
  });
});

describe("toLegacyEstablecimientoInsert", () => {
  it("strips platform cols", () => {
    const full = buildEstablecimientoInsert({ ...base, tipo: "mixto" });
    expect(toLegacyEstablecimientoInsert(full)).toEqual({
      nombre: full.nombre,
      ubicacion: full.ubicacion,
      tipo: full.tipo,
      user_id: full.user_id,
    });
  });
});

describe("isUniqueViolation", () => {
  it("detects 23505 and message patterns", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ message: "duplicate key value" })).toBe(true);
    expect(isUniqueViolation({ message: "unique constraint" })).toBe(true);
    expect(isUniqueViolation({ code: "42703", message: "column" })).toBe(false);
  });
});
