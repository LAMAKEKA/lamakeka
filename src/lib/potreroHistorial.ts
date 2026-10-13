export type PotreroHistorialEventoTipo =
  | "alta"
  | "cambio_potrero"
  | "venta"
  | "muerte"
  | "transferencia_salida"
  | "otro";

export interface PotreroHistorialSourceEvent {
  id: string;
  tipo: string;
  fecha: string;
  eid: string;
  usuario: string | null;
  datos: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface PotreroHistorialRow {
  id: string;
  potrero: string;
  evento: string;
  fecha: string;
  detalle: string;
  responsable: string;
}

const EVENTO_LABEL: Record<string, string> = {
  alta: "Alta",
  cambio_potrero: "Cambio de potrero",
  venta: "Venta",
  muerte: "Muerte",
  transferencia_salida: "Transferencia",
  otro: "Otro",
};

/** Tipos que afectan ubicación / stock en potrero. */
export const POTRERO_HISTORIAL_TIPOS = [
  "alta",
  "cambio_potrero",
  "venta",
  "muerte",
  "transferencia_salida",
] as const;

function asId(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}

function labelPotrero(
  id: string | null,
  names: ReadonlyMap<string, string>
): string {
  if (!id) return "Sin ubicar";
  return names.get(id) ?? "Potrero";
}

/**
 * Mapea animal_eventos a filas del tab Historial de /potreros.
 * Una fila por evento; potrero display = destino (to) o potrero_id en alta.
 */
export function mapAnimalEventosToPotreroHistorial(
  events: readonly PotreroHistorialSourceEvent[],
  potreroNames: ReadonlyMap<string, string>
): PotreroHistorialRow[] {
  const rows: PotreroHistorialRow[] = [];

  for (const ev of events) {
    if (!(POTRERO_HISTORIAL_TIPOS as readonly string[]).includes(ev.tipo)) {
      continue;
    }

    const datos = ev.datos ?? {};
    const fromId = asId(datos.from);
    const toId = asId(datos.to) ?? asId(datos.potrero_id);
    const eid = ev.eid || "—";

    let potreroId: string | null = null;
    let detalle: string;

    if (ev.tipo === "cambio_potrero") {
      potreroId = toId ?? fromId;
      detalle = `EID ${eid}: ${labelPotrero(fromId, potreroNames)} → ${labelPotrero(toId, potreroNames)}`;
    } else if (ev.tipo === "alta") {
      potreroId = toId ?? asId(datos.potrero_id);
      detalle = `EID ${eid} alta${potreroId ? ` en ${labelPotrero(potreroId, potreroNames)}` : ""}`;
    } else {
      // egresos: mostrar potrero de origen si viene
      potreroId = fromId ?? toId;
      detalle = `EID ${eid} · ${EVENTO_LABEL[ev.tipo] ?? ev.tipo}`;
    }

    rows.push({
      id: ev.id,
      potrero: labelPotrero(potreroId, potreroNames),
      evento: EVENTO_LABEL[ev.tipo] ?? ev.tipo,
      fecha: ev.fecha,
      detalle,
      responsable: ev.usuario?.trim() || "—",
    });
  }

  return rows;
}
