import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidEid, normalizeEid } from "@/lib/eid";

export const runtime = "nodejs";

interface ScanBody {
  eid: string;
  clientId: string;
  sessionId?: string | null;
  deviceId?: string | null;
  timestamp?: string | null;
  datos?: Record<string, unknown>;
  usuario?: string | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ found: false, error: "No autenticado" }, { status: 401 });
  }

  let body: ScanBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ found: false, error: "Body inválido" }, { status: 400 });
  }

  const eid = normalizeEid(body.eid ?? "");
  if (!isValidEid(eid)) {
    return NextResponse.json({ found: false, error: "EID inválido" }, { status: 400 });
  }
  if (!body.clientId) {
    return NextResponse.json({ found: false, error: "clientId requerido" }, { status: 400 });
  }

  const { data: estab } = await supabase
    .from("establecimientos")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!estab) {
    return NextResponse.json({ found: false, error: "Sin establecimiento" }, { status: 400 });
  }
  const establecimientoId = estab.id;

  const { data: animal } = await supabase
    .from("manga_animales")
    .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote")
    .eq("establecimiento_id", establecimientoId)
    .eq("eid", eid)
    .maybeSingle();

  const scannedAt = body.timestamp
    ? new Date(body.timestamp).toISOString()
    : new Date().toISOString();
  const fecha = scannedAt.slice(0, 10);
  const datos = body.datos ?? {};

  let registroId: string | null = null;

  const { data: existing } = await supabase
    .from("registros_manga")
    .select("id")
    .eq("establecimiento_id", establecimientoId)
    .eq("client_id", body.clientId)
    .maybeSingle();

  if (existing) {
    registroId = existing.id;
    await supabase
      .from("registros_manga")
      .update({
        datos,
        animal_id: animal?.id ?? null,
        sesion_id: body.sessionId ?? null,
        scanned_at: scannedAt,
        sync_state: "sincronizado",
      })
      .eq("id", existing.id);
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("registros_manga")
      .insert({
        establecimiento_id: establecimientoId,
        eid,
        animal_id: animal?.id ?? null,
        fecha,
        datos,
        usuario: body.usuario ?? user.email ?? null,
        sesion_id: body.sessionId ?? null,
        scanned_at: scannedAt,
        sync_state: "sincronizado",
        client_id: body.clientId,
      })
      .select("id")
      .maybeSingle();

    if (insertErr) {
      const { data: dup } = await supabase
        .from("registros_manga")
        .select("id")
        .eq("establecimiento_id", establecimientoId)
        .eq("client_id", body.clientId)
        .maybeSingle();
      registroId = dup?.id ?? null;
    } else {
      registroId = inserted?.id ?? null;
    }
  }

  return NextResponse.json({
    found: !!animal,
    animal: animal ?? null,
    registroId,
  });
}
