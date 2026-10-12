import type { ModuleId } from "./registry";

/** = sidebar Makeka ganadero actual (sin whatsapp secondary) */
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

export function defaultModulesForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): ModuleId[] {
  switch (tipo) {
    case "agricola":
      return [
        "inicio",
        "agricola",
        "insumos",
        "finanzas",
        "reportes",
        "tareas",
      ];
    case "mixto":
      return [
        "inicio",
        "manga",
        "hacienda",
        "potreros",
        "senasa",
        "agricola",
        "produccion_huevos",
        "insumos",
        "finanzas",
        "reportes",
        "tareas",
      ];
    case "ganadero":
    default:
      return [...MAKEKA_LEGACY_MODULES];
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
