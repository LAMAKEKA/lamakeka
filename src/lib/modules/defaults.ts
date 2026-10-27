import type { ModuleId } from "./registry";

/**
 * Pack histórico de La Makeka (campo real).
 * Incluye huevos y el sidebar actual de prod.
 * NO usar como default de un campo genérico nuevo.
 */
export const MAKEKA_LEGACY_MODULES: ModuleId[] = [
  "inicio",
  "manga",
  "hacienda",
  "potreros",
  "senasa",
  "produccion_huevos",
  "insumos",
  "finanzas",
  "reportes",
  "tareas",
];

/** Lab multi-rubro shell — subset demo (Task 9 seed). Sin secrets. */
export const PLATFORM_DEMO_MODULES: ModuleId[] = [
  "inicio",
  "hacienda",
  "manga",
  "potreros",
  "agricola",
  "insumos",
  "finanzas",
  "reportes",
  "tareas",
];

/** Ganadería genérica (PRD §5.4) — sin huevos ni agrícola. */
export const GANADERO_GENERIC_MODULES: ModuleId[] = [
  "inicio",
  "manga",
  "hacienda",
  "potreros",
  "senasa",
  "insumos",
  "finanzas",
  "reportes",
  "tareas",
];

/** Agrícola genérico. */
export const AGRICOLA_GENERIC_MODULES: ModuleId[] = [
  "inicio",
  "agricola",
  "insumos",
  "finanzas",
  "reportes",
  "tareas",
];

/** Mixto = ganadería genérica + agrícola (sin huevos). */
export const MIXTO_GENERIC_MODULES: ModuleId[] = [
  "inicio",
  "manga",
  "hacienda",
  "potreros",
  "senasa",
  "agricola",
  "insumos",
  "finanzas",
  "reportes",
  "tareas",
];

/**
 * Defaults de módulos para un establecimiento NUEVO / genérico por `tipo`.
 * Makeka real no pasa por acá si ya tiene `modules_enabled` en DB.
 */
export function defaultModulesForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): ModuleId[] {
  switch (tipo) {
    case "agricola":
      return [...AGRICOLA_GENERIC_MODULES];
    case "mixto":
      return [...MIXTO_GENERIC_MODULES];
    case "ganadero":
    default:
      return [...GANADERO_GENERIC_MODULES];
  }
}

export function defaultRubrosForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): string[] {
  switch (tipo) {
    case "agricola":
      return ["agricola"];
    case "mixto":
      return ["ganaderia", "agricola"];
    case "ganadero":
    default:
      return ["ganaderia"];
  }
}

export function defaultTaglineForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): string {
  if (tipo === "agricola") return "AI · Agrícola";
  if (tipo === "mixto") return "AI · Mixto";
  return "AI · Ganadera";
}

/** Logo de producto (chrome). El nombre del campo va en nombre_display. */
export function defaultLogoUrl(): string {
  return "/logo-makeka.png";
}

/** ¿Parece el tenant Makeka real (no un campo genérico)? */
export function looksLikeMakekaTenant(input: {
  nombre?: string | null;
  nombreDisplay?: string | null;
  slug?: string | null;
}): boolean {
  const blob = [input.slug, input.nombre, input.nombreDisplay]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes("makeka") || blob.includes("mateca");
}
