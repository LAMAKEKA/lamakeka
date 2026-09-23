import type { SupabaseClient } from "@supabase/supabase-js";

export type AnimalEventoTipo =
  | "alta"
  | "cambio_potrero"
  | "cambio_categoria"
  | "venta"
  | "muerte"
  | "transferencia_salida"
  | "observacion"
  | "peso"
  | "sanidad"
  | "prenez"
  | "otro";

export interface InsertAnimalEventoInput {
  establecimientoId: string;
  animalId: string;
  eid: string;
  tipo: AnimalEventoTipo;
  fecha?: string;
  datos?: Record<string, unknown>;
  usuario?: string | null;
  createdBy?: string | null;
  sesionId?: string | null;
  registroMangaId?: string | null;
}

/**
 * Inserta un evento individual. Fallos se loguean y no se relanzan (MVP):
 * el update/create del animal no debe rollbackearse por el timeline.
 */
export async function insertAnimalEvento(
  supabase: SupabaseClient,
  input: InsertAnimalEventoInput
): Promise<boolean> {
  const { error } = await supabase.from("animal_eventos").insert({
    establecimiento_id: input.establecimientoId,
    animal_id: input.animalId,
    eid: input.eid,
    tipo: input.tipo,
    fecha: input.fecha ?? new Date().toISOString().split("T")[0],
    datos: input.datos ?? {},
    usuario: input.usuario ?? null,
    created_by: input.createdBy ?? null,
    sesion_id: input.sesionId ?? null,
    registro_manga_id: input.registroMangaId ?? null,
  });

  if (error) {
    console.error("[animal_eventos]", input.tipo, error.message);
    return false;
  }
  return true;
}
