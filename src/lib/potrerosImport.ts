import { parseXlsxDate } from "@/lib/exportExcel";

export const ESTADOS_POTRERO = ["activo", "descanso", "mantenimiento"] as const;
export type EstadoPotrero = (typeof ESTADOS_POTRERO)[number];

export const POTREROS_COLUMNS: string[] = [
  "Nombre",
  "Hectáreas",
  "Estado",
  "Cabezas",
  "Categoría",
  "Desde",
  "Latitud",
  "Longitud",
];

export const POTREROS_TEMPLATE = {
  Nombre: "Potrero Norte",
  Hectáreas: 120,
  Estado: "activo",
  Cabezas: 40,
  Categoría: "Vacas",
  Desde: "2026-01-15",
  Latitud: -38.1234,
  Longitud: -63.4567,
};

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Lee celda con aliases y match case-insensitive / sin acentos. */
export function cell(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== "") return raw[k];
  }
  const lowerMap = new Map(
    Object.keys(raw).map((k) => [stripAccents(k.toLowerCase()), k])
  );
  for (const k of keys) {
    const hit = lowerMap.get(stripAccents(k.toLowerCase()));
    if (hit && raw[hit] !== undefined && raw[hit] !== null && String(raw[hit]).trim() !== "") {
      return raw[hit];
    }
  }
  return "";
}

export function validatePotreroRow(raw: Record<string, unknown>) {
  const errors: string[] = [];
  const nombre = String(cell(raw, "Nombre", "nombre", "Potrero", "potrero") ?? "").trim();
  if (!nombre) errors.push("Nombre vacío");

  const ha = Number(cell(raw, "Hectáreas", "Hectareas", "hectareas", "Ha", "ha"));
  if (isNaN(ha) || ha <= 0) errors.push("Hectáreas inválidas (> 0)");

  const estadoRaw = String(cell(raw, "Estado", "estado") ?? "activo").trim().toLowerCase();
  if (estadoRaw && !(ESTADOS_POTRERO as readonly string[]).includes(estadoRaw)) {
    errors.push(`Estado inválido: "${estadoRaw}" (activo|descanso|mantenimiento)`);
  }

  const cabezasVal = cell(raw, "Cabezas", "cabezas");
  if (cabezasVal !== "" && cabezasVal !== undefined) {
    const cabezas = Number(cabezasVal);
    if (isNaN(cabezas) || cabezas < 0 || !Number.isInteger(cabezas)) errors.push("Cabezas inválidas");
  }

  const desdeVal = cell(raw, "Desde", "desde", "Fecha", "fecha");
  if (desdeVal !== "" && desdeVal !== undefined) {
    const desde = parseXlsxDate(desdeVal);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) errors.push("Desde inválido (YYYY-MM-DD)");
  }

  const latVal = cell(raw, "Latitud", "latitud", "Lat", "lat");
  if (latVal !== "" && latVal !== undefined) {
    const lat = Number(latVal);
    if (isNaN(lat) || lat < -90 || lat > 90) errors.push("Latitud inválida");
  }
  const lngVal = cell(raw, "Longitud", "longitud", "Lng", "lng", "Lon", "lon");
  if (lngVal !== "" && lngVal !== undefined) {
    const lng = Number(lngVal);
    if (isNaN(lng) || lng < -180 || lng > 180) errors.push("Longitud inválida");
  }

  return { errors };
}

export interface PotreroInsertRow {
  nombre: string;
  hectareas: number;
  estado: EstadoPotrero;
  cabezas: number;
  categoria_animal: string | null;
  desde: string | null;
  latitud: number | null;
  longitud: number | null;
}

export function mapPotreroImportRow(r: Record<string, unknown>): PotreroInsertRow {
  const nombre = String(cell(r, "Nombre", "nombre", "Potrero", "potrero")).trim();
  const ha = Number(cell(r, "Hectáreas", "Hectareas", "hectareas", "Ha", "ha"));
  const estadoRaw = String(cell(r, "Estado", "estado") || "activo").trim().toLowerCase();
  const estado = (ESTADOS_POTRERO as readonly string[]).includes(estadoRaw)
    ? (estadoRaw as EstadoPotrero)
    : "activo";
  const cabezasVal = cell(r, "Cabezas", "cabezas");
  const cabezas =
    cabezasVal === "" || cabezasVal === undefined
      ? 0
      : Math.max(0, Math.trunc(Number(cabezasVal)) || 0);
  const categoria = String(cell(r, "Categoría", "Categoria", "categoria") ?? "").trim() || null;
  const desdeRaw = cell(r, "Desde", "desde", "Fecha", "fecha");
  const desde = desdeRaw === "" || desdeRaw === undefined ? null : parseXlsxDate(desdeRaw) || null;
  const latVal = cell(r, "Latitud", "latitud", "Lat", "lat");
  const lngVal = cell(r, "Longitud", "longitud", "Lng", "lng", "Lon", "lon");
  const latitud =
    latVal === "" || latVal === undefined || isNaN(Number(latVal)) ? null : Number(latVal);
  const longitud =
    lngVal === "" || lngVal === undefined || isNaN(Number(lngVal)) ? null : Number(lngVal);

  return {
    nombre,
    hectareas: ha,
    estado,
    cabezas,
    categoria_animal: categoria,
    desde,
    latitud,
    longitud,
  };
}
