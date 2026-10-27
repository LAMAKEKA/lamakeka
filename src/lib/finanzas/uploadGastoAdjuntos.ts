import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADJUNTO_MAX_BYTES,
  extOf,
  prepareGastoAttachments,
  type PreparedAttachment,
} from "./compressAttachment";

export const GASTO_ADJUNTOS_BUCKET = "gasto-adjuntos";
export const SIGNED_URL_TTL_SEC = 60 * 30; // 30 min

export type GastoAdjuntoRow = {
  id: string;
  establecimiento_id: string;
  gasto_id: string;
  storage_path: string;
  nombre_original: string;
  mime: string;
  bytes: number;
  bytes_original: number | null;
  created_by: string | null;
  created_at: string;
};

function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function storageExt(file: File, originalName: string): string {
  const fromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  if (file.type && fromMime[file.type]) return fromMime[file.type];
  const e = extOf(file.name) || extOf(originalName);
  return e || "bin";
}

/**
 * Sube N archivos ya preparados y inserta filas en gasto_adjuntos.
 * Best-effort: si uno falla a mitad, devuelve error + ids subidos (caller puede avisar).
 */
export async function uploadPreparedGastoAdjuntos(
  supabase: SupabaseClient,
  opts: {
    establecimientoId: string;
    gastoId: string;
    userId: string | null;
    prepared: PreparedAttachment[];
  }
): Promise<{ rows: GastoAdjuntoRow[]; error: string | null }> {
  const { establecimientoId, gastoId, userId, prepared } = opts;
  const rows: GastoAdjuntoRow[] = [];

  for (const p of prepared) {
    if (p.file.size > ADJUNTO_MAX_BYTES) {
      return {
        rows,
        error: `"${p.originalName}" supera el límite post-compresión.`,
      };
    }

    const ext = storageExt(p.file, p.originalName);
    const path = `${establecimientoId}/${gastoId}/${safeUuid()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(GASTO_ADJUNTOS_BUCKET)
      .upload(path, p.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: p.file.type || "application/octet-stream",
      });

    if (upErr) {
      const msg = upErr.message || "No se pudo subir el archivo.";
      if (/bucket|not found|row-level|policy|403|401/i.test(msg)) {
        return {
          rows,
          error:
            "No se pudo subir el adjunto (Storage). ¿Aplicaste la migración gasto-adjuntos / bucket privado?",
        };
      }
      return { rows, error: `${p.originalName}: ${msg}` };
    }

    const { data, error: dbErr } = await supabase
      .from("gasto_adjuntos")
      .insert({
        establecimiento_id: establecimientoId,
        gasto_id: gastoId,
        storage_path: path,
        nombre_original: p.originalName,
        mime: p.file.type || "application/octet-stream",
        bytes: p.finalBytes,
        bytes_original: p.originalBytes,
        created_by: userId,
      })
      .select(
        "id, establecimiento_id, gasto_id, storage_path, nombre_original, mime, bytes, bytes_original, created_by, created_at"
      )
      .single();

    if (dbErr || !data) {
      // cleanup storage best-effort
      await supabase.storage.from(GASTO_ADJUNTOS_BUCKET).remove([path]);
      return {
        rows,
        error:
          dbErr?.message ||
          "Archivo subido pero no se guardó el registro. ¿Existe la tabla gasto_adjuntos en cloud?",
      };
    }

    rows.push(data as GastoAdjuntoRow);
  }

  return { rows, error: null };
}

/** Prepare + upload en un paso desde File[]. */
export async function uploadGastoAdjuntosFromFiles(
  supabase: SupabaseClient,
  opts: {
    establecimientoId: string;
    gastoId: string;
    userId: string | null;
    files: File[];
  }
): Promise<{
  rows: GastoAdjuntoRow[];
  prepared: PreparedAttachment[];
  error: string | null;
}> {
  const { prepared, error: prepErr } = await prepareGastoAttachments(opts.files);
  if (prepErr) return { rows: [], prepared: [], error: prepErr };
  if (prepared.length === 0) return { rows: [], prepared: [], error: null };

  const { rows, error } = await uploadPreparedGastoAdjuntos(supabase, {
    establecimientoId: opts.establecimientoId,
    gastoId: opts.gastoId,
    userId: opts.userId,
    prepared,
  });
  return { rows, prepared, error };
}

export async function listGastoAdjuntos(
  supabase: SupabaseClient,
  gastoIds: string[]
): Promise<GastoAdjuntoRow[]> {
  if (gastoIds.length === 0) return [];
  const { data, error } = await supabase
    .from("gasto_adjuntos")
    .select(
      "id, establecimiento_id, gasto_id, storage_path, nombre_original, mime, bytes, bytes_original, created_by, created_at"
    )
    .in("gasto_id", gastoIds)
    .order("created_at", { ascending: true });
  if (error) {
    // tabla aún no en cloud → silencioso
    if (/42P01|PGRST205|does not exist|schema cache/i.test(error.message)) return [];
    console.error("[gasto_adjuntos] list", error.message);
    return [];
  }
  return (data ?? []) as GastoAdjuntoRow[];
}

export async function createAdjuntoSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn = SIGNED_URL_TTL_SEC
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from(GASTO_ADJUNTOS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) {
    return { error: error?.message || "No se pudo generar el link." };
  }
  return { url: data.signedUrl };
}

export async function deleteGastoAdjunto(
  supabase: SupabaseClient,
  row: Pick<GastoAdjuntoRow, "id" | "storage_path">
): Promise<string | null> {
  const { error: dbErr } = await supabase.from("gasto_adjuntos").delete().eq("id", row.id);
  if (dbErr) return dbErr.message;
  await supabase.storage.from(GASTO_ADJUNTOS_BUCKET).remove([row.storage_path]);
  return null;
}
