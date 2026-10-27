import type { ModuleId } from "./registry";
import { MODULE_REGISTRY } from "./registry";

/** Módulos que no se pueden apagar desde settings (shell mínimo). */
export const LOCKED_MODULE_IDS: readonly ModuleId[] = ["inicio"];

/**
 * Módulos que el productor puede sumar/quitar en "Mi campo".
 * Orden = registry. Excluye `inicio` (siempre on).
 */
export function configurableModuleIds(): ModuleId[] {
  return MODULE_REGISTRY.map((m) => m.id).filter(
    (id) => !LOCKED_MODULE_IDS.includes(id)
  );
}

/** ¿Se puede toggleear este id en UI? */
export function isModuleToggleable(id: string): boolean {
  return configurableModuleIds().includes(id as ModuleId);
}

/**
 * Aplica on/off preservando orden de registry y garantizando `inicio`.
 * Ignora ids desconocidos.
 */
export function applyModuleToggle(
  current: readonly string[],
  moduleId: string,
  enabled: boolean
): string[] {
  const known = new Set(MODULE_REGISTRY.map((m) => m.id));
  if (!known.has(moduleId as ModuleId)) {
    return normalizeModulesEnabled(current);
  }
  if (LOCKED_MODULE_IDS.includes(moduleId as ModuleId)) {
    return normalizeModulesEnabled(current);
  }

  const set = new Set(
    current.filter((id): id is ModuleId => known.has(id as ModuleId))
  );
  if (enabled) set.add(moduleId as ModuleId);
  else set.delete(moduleId as ModuleId);

  return normalizeModulesEnabled([...set]);
}

/** Siempre incluye inicio; orden registry; drop unknown. */
export function normalizeModulesEnabled(ids: readonly string[]): string[] {
  const known = new Set(MODULE_REGISTRY.map((m) => m.id));
  const set = new Set(
    ids.filter((id): id is ModuleId => known.has(id as ModuleId))
  );
  for (const locked of LOCKED_MODULE_IDS) set.add(locked);

  return MODULE_REGISTRY.map((m) => m.id).filter((id) => set.has(id));
}

/**
 * Si se prenden módulos de ganadería/agrícola/huevos, alinea `rubros`
 * (sin borrar rubros que el user ya tenía).
 */
export function rubrosForModules(
  modules: readonly string[],
  currentRubros: readonly string[] = []
): string[] {
  const set = new Set(currentRubros.filter(Boolean));
  const has = (id: string) => modules.includes(id);

  if (
    has("manga") ||
    has("hacienda") ||
    has("potreros") ||
    has("senasa")
  ) {
    set.add("ganaderia");
  }
  if (has("agricola")) set.add("agricola");
  if (has("produccion_huevos")) set.add("huevos");

  const order = ["ganaderia", "agricola", "huevos", "core"] as const;
  const knownOrder = new Set<string>(order);
  const ordered: string[] = order.filter((r) => set.has(r));
  for (const r of set) {
    if (!knownOrder.has(r)) ordered.push(r);
  }
  return ordered.length > 0 ? ordered : ["ganaderia"];
}
