/** Helpers puros de stock EID (manga_animales). PRD D4/D5 — no mezclar con libreta. */

export const ESTADOS_STOCK = ["activo", "sin_ubicar"] as const;
export const ESTADOS_BAJA = ["vendido", "muerto", "transferido", "baja"] as const;

export type EstadoAnimalStock = (typeof ESTADOS_STOCK)[number];
export type EstadoAnimalBaja = (typeof ESTADOS_BAJA)[number];
export type EstadoAnimal = EstadoAnimalStock | EstadoAnimalBaja;

export function enStock(estado: string): boolean {
  return (ESTADOS_STOCK as readonly string[]).includes(estado);
}

export function resolveEstadoAlta(potreroId: string | null | undefined): "activo" | "sin_ubicar" {
  return potreroId ? "activo" : "sin_ubicar";
}

export type AnimalStockRow = {
  categoria: string | null;
  estado: string;
  potrero_id?: string | null;
};

const SIN_CATEGORIA = "Sin categoría";

export function countByCategoria(animales: AnimalStockRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of animales) {
    if (!enStock(a.estado)) continue;
    const key = a.categoria?.trim() || SIN_CATEGORIA;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export function countByPotrero(
  animales: Pick<AnimalStockRow, "potrero_id" | "estado">[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of animales) {
    if (!enStock(a.estado)) continue;
    if (!a.potrero_id) continue;
    out[a.potrero_id] = (out[a.potrero_id] ?? 0) + 1;
  }
  return out;
}

export function countSinUbicar(animales: Pick<AnimalStockRow, "estado">[]): number {
  return animales.filter((a) => a.estado === "sin_ubicar").length;
}

export function countEnStock(animales: Pick<AnimalStockRow, "estado">[]): number {
  return animales.filter((a) => enStock(a.estado)).length;
}
