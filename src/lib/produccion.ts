export const HUEVOS_POR_MAPLE = 30;

export const TIPOS_MOVIMIENTO_GALLINA = ["alta", "muerte", "venta"] as const;
export type TipoMovimientoGallina = (typeof TIPOS_MOVIMIENTO_GALLINA)[number];

export function maplesToHuevos(maples: number): number {
  return maples * HUEVOS_POR_MAPLE;
}

export function parseEnteroNoNegativo(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

export function daysInclusive(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${hasta}T00:00:00`);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export function calcularPostura(huevosPuestos: number, plantel: number, dias: number): number | null {
  if (plantel <= 0 || dias <= 0) return null;
  return huevosPuestos / plantel / dias;
}

export function calcularPlantelInicial(
  plantelActual: number,
  altas: number,
  muertes: number,
  ventas: number,
): number {
  return plantelActual + muertes + ventas - altas;
}

export function calcularMortalidad(muertes: number, plantelInicial: number): number | null {
  if (plantelInicial <= 0) return null;
  return muertes / plantelInicial;
}

export function nuevaCantidad(
  actual: number,
  tipo: TipoMovimientoGallina,
  n: number,
): number | null {
  const next = tipo === "alta" ? actual + n : actual - n;
  return next < 0 ? null : next;
}
