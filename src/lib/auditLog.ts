import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit({
  supabase,
  tabla,
  registroId,
  datosAnteriores,
  datosNuevos,
  userId,
  userName,
  accion = "UPDATE",
}: {
  supabase: SupabaseClient;
  tabla: string;
  registroId: string;
  datosAnteriores: Record<string, unknown>;
  datosNuevos: Record<string, unknown>;
  userId: string;
  userName: string;
  accion?: string;
}) {
  await supabase.from("audit_log").insert({
    tabla,
    registro_id: registroId,
    datos_anteriores: datosAnteriores,
    datos_nuevos: datosNuevos,
    modificado_por: userId,
    modificado_por_nombre: userName,
    accion,
  });
}
