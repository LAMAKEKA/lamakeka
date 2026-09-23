"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  Pencil,
  Clock,
  Beef,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIAS_BOVINOS, MOTIVOS_DECLARACION } from "@/lib/senasa";
import type { MangaAnimal, UpdateAnimalPayload, RegistroManga } from "@/hooks/useSupabaseManga";
import type { PotreroOption } from "@/hooks/usePotreros";
import { enStock } from "@/lib/haciendaStock";

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "var(--color-pampa)",
  color: "var(--color-tierra)",
};

const onFocusIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "var(--color-cuero)";
  e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
};
const onBlurIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "rgba(212,197,169,0.8)";
  e.target.style.boxShadow = "none";
};

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  activo: { bg: "rgba(22,163,74,0.09)", color: "#16a34a", label: "Activo" },
  sin_ubicar: { bg: "rgba(217,119,6,0.10)", color: "#d97706", label: "Sin ubicar" },
  vendido: { bg: "rgba(37,99,235,0.09)", color: "#2563eb", label: "Vendido" },
  muerto: { bg: "rgba(220,38,38,0.07)", color: "#dc2626", label: "Muerto" },
  transferido: { bg: "rgba(107,114,128,0.12)", color: "#6b7280", label: "Transferido" },
  baja: { bg: "rgba(107,114,128,0.12)", color: "#6b7280", label: "Baja" },
};

export interface AnimalEventoRow {
  id: string;
  tipo: string;
  fecha: string;
  datos: Record<string, unknown>;
  usuario: string | null;
  created_at: string;
}

export interface AnimalFichaDrawerProps {
  animal: MangaAnimal;
  establecimientoId: string;
  potreros: PotreroOption[];
  saving: boolean;
  usuario?: string | null;
  onSave: (payload: UpdateAnimalPayload) => Promise<void> | void;
  onClose: () => void;
  onChanged?: () => void;
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    return new Date(iso).toLocaleString("es-AR");
  } catch {
    return iso;
  }
}

function labelEvento(tipo: string) {
  const map: Record<string, string> = {
    alta: "Alta",
    cambio_potrero: "Cambio de potrero",
    cambio_categoria: "Cambio de categoría",
    venta: "Venta",
    muerte: "Muerte",
    transferencia_salida: "Transferencia salida",
    observacion: "Observación",
    peso: "Peso",
    sanidad: "Sanidad",
    prenez: "Preñez",
    otro: "Otro",
  };
  return map[tipo] ?? tipo;
}

export function AnimalFichaDrawer({
  animal,
  establecimientoId,
  potreros,
  saving,
  usuario,
  onSave,
  onClose,
  onChanged,
}: AnimalFichaDrawerProps) {
  const [vid, setVid] = useState(animal.vid ?? "");
  const [raza, setRaza] = useState(animal.raza ?? "");
  const [sexo, setSexo] = useState(animal.sexo ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(animal.fecha_nacimiento ?? "");
  const [lote, setLote] = useState(animal.lote ?? "");
  const [categoria, setCategoria] = useState(animal.categoria ?? "");
  const [potreroId, setPotreroId] = useState(animal.potrero_id ?? "");
  const [fechaAplicacion, setFechaAplicacion] = useState(animal.fecha_aplicacion ?? "");
  const [motivoDeclaracion, setMotivoDeclaracion] = useState(animal.motivo_declaracion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroManga[]>([]);
  const [eventos, setEventos] = useState<AnimalEventoRow[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [egresoBusy, setEgresoBusy] = useState(false);

  const estado = animal.estado ?? "activo";
  const estadoStyle = ESTADO_STYLE[estado] ?? ESTADO_STYLE.activo;

  const loadExtra = useCallback(async () => {
    setLoadingExtra(true);
    const supabase = createClient();
    const [{ data: regs }, { data: evs }] = await Promise.all([
      supabase
        .from("registros_manga")
        .select("id, eid, fecha, datos, usuario, created_at")
        .eq("establecimiento_id", establecimientoId)
        .eq("eid", animal.eid)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("animal_eventos")
        .select("id, tipo, fecha, datos, usuario, created_at")
        .eq("establecimiento_id", establecimientoId)
        .eq("animal_id", animal.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setRegistros((regs as RegistroManga[]) ?? []);
    setEventos((evs as AnimalEventoRow[]) ?? []);
    setLoadingExtra(false);
  }, [animal.eid, animal.id, establecimientoId]);

  useEffect(() => {
    loadExtra();
  }, [loadExtra]);

  // Sync form if animal prop changes (after save/refetch parent)
  useEffect(() => {
    setVid(animal.vid ?? "");
    setRaza(animal.raza ?? "");
    setSexo(animal.sexo ?? "");
    setFechaNacimiento(animal.fecha_nacimiento ?? "");
    setLote(animal.lote ?? "");
    setCategoria(animal.categoria ?? "");
    setPotreroId(animal.potrero_id ?? "");
    setFechaAplicacion(animal.fecha_aplicacion ?? "");
    setMotivoDeclaracion(animal.motivo_declaracion ?? "");
  }, [animal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sexo) {
      setError("Indicá el sexo del animal.");
      return;
    }
    if (!categoria) {
      setError("Indicá la categoría del animal.");
      return;
    }
    setError(null);
    await onSave({
      id: animal.id,
      vid: vid.trim() || null,
      raza: raza.trim() || null,
      sexo: sexo.trim() || null,
      fechaNacimiento: fechaNacimiento || null,
      lote: lote.trim() || null,
      categoria: categoria || null,
      potreroId: potreroId || null,
      fechaAplicacion: fechaAplicacion || null,
      motivoDeclaracion: motivoDeclaracion || null,
      establecimientoId,
      usuario: usuario ?? null,
    });
    await loadExtra();
    onChanged?.();
  }

  async function handleEgreso(nextEstado: "vendido" | "muerto" | "transferido") {
    const labels = { vendido: "venta", muerto: "muerte", transferido: "transferencia" };
    if (!window.confirm(`¿Confirmás marcar este animal como ${labels[nextEstado]}? Sale del stock EID.`)) {
      return;
    }
    setEgresoBusy(true);
    setError(null);
    try {
      await onSave({
        id: animal.id,
        vid: animal.vid,
        raza: animal.raza,
        sexo: animal.sexo,
        fechaNacimiento: animal.fecha_nacimiento,
        lote: animal.lote,
        categoria: animal.categoria,
        potreroId: animal.potrero_id,
        fechaAplicacion: animal.fecha_aplicacion,
        motivoDeclaracion: animal.motivo_declaracion,
        estado: nextEstado,
        establecimientoId,
        usuario: usuario ?? null,
      });
      await loadExtra();
      onChanged?.();
    } finally {
      setEgresoBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(26,26,24,0.45)" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto flex flex-col"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "-12px 0 40px rgba(26,26,24,0.18)",
          borderLeft: "1px solid rgba(212,197,169,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b sticky top-0 z-10"
          style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Beef size={16} style={{ color: "var(--color-campo)" }} />
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(26,26,24,0.38)" }}>
                  Ficha animal
                </p>
              </div>
              <h2
                className="text-lg font-semibold font-mono truncate"
                style={{ color: "var(--color-tierra)", fontFamily: "ui-monospace, monospace" }}
              >
                {animal.eid}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.color }}
                >
                  {estadoStyle.label}
                </span>
                {animal.vid && (
                  <span className="text-xs" style={{ color: "rgba(26,26,24,0.55)" }}>
                    VID {animal.vid}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ color: "rgba(26,26,24,0.45)", border: "1.5px solid rgba(212,197,169,0.8)" }}
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Pencil size={14} style={{ color: "var(--color-campo)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-tierra)" }}>
                Datos
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">VID</label>
                <input
                  type="text"
                  value={vid}
                  onChange={(e) => setVid(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                />
              </div>
              <div>
                <label className="form-label">Sexo *</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Macho">Macho</option>
                  <option value="Hembra">Hembra</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Raza</label>
                <input
                  type="text"
                  value={raza}
                  onChange={(e) => setRaza(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                />
              </div>
              <div>
                <label className="form-label">Nacimiento</label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Categoría *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                >
                  <option value="">Seleccionar...</option>
                  {CATEGORIAS_BOVINOS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Potrero</label>
                <select
                  value={potreroId}
                  onChange={(e) => setPotreroId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                >
                  <option value="">Sin ubicar</option>
                  {potreros.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Lote</label>
              <input
                type="text"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={INPUT_STYLE}
                onFocus={onFocusIn}
                onBlur={onBlurIn}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Fecha aplicación</label>
                <input
                  type="date"
                  value={fechaAplicacion}
                  onChange={(e) => setFechaAplicacion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                />
              </div>
              <div>
                <label className="form-label">Motivo SENASA</label>
                <select
                  value={motivoDeclaracion}
                  onChange={(e) => setMotivoDeclaracion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={INPUT_STYLE}
                  onFocus={onFocusIn}
                  onBlur={onBlurIn}
                >
                  <option value="">Sin motivo</option>
                  {MOTIVOS_DECLARACION.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "rgba(220,38,38,0.06)",
                  color: "#dc2626",
                  border: "1px solid rgba(220,38,38,0.15)",
                }}
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || egresoBusy}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--color-campo)", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Guardar cambios
            </button>
          </form>

          {/* Egresos */}
          {enStock(estado) && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide uppercase" style={{ color: "rgba(26,26,24,0.38)" }}>
                Egreso del stock
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["vendido", "Venta", "#2563eb"],
                    ["muerto", "Muerte", "#dc2626"],
                    ["transferido", "Transfer.", "#6b7280"],
                  ] as const
                ).map(([key, label, color]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={saving || egresoBusy}
                    onClick={() => handleEgreso(key)}
                    className="py-2 rounded-xl text-xs font-semibold"
                    style={{
                      color,
                      border: `1.5px solid ${color}`,
                      backgroundColor: "transparent",
                      opacity: egresoBusy ? 0.6 : 1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: "var(--color-cuero)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-tierra)" }}>
                Eventos y manga
              </h3>
            </div>
            {loadingExtra ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-campo)" }} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {eventos.length === 0 && registros.length === 0 && (
                  <p className="text-sm py-4 text-center" style={{ color: "rgba(26,26,24,0.45)" }}>
                    Sin eventos todavía.
                  </p>
                )}
                {eventos.map((ev) => (
                  <div
                    key={`ev-${ev.id}`}
                    className="rounded-xl px-3 py-2.5 text-sm"
                    style={{ backgroundColor: "rgba(240,237,230,0.7)", border: "1px solid rgba(212,197,169,0.45)" }}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium" style={{ color: "var(--color-tierra)" }}>
                        {labelEvento(ev.tipo)}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "rgba(26,26,24,0.4)" }}>
                        {fmtFecha(ev.fecha)}
                      </span>
                    </div>
                    {ev.usuario && (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.45)" }}>
                        {ev.usuario}
                      </p>
                    )}
                  </div>
                ))}
                {registros.map((r) => (
                  <div
                    key={`reg-${r.id}`}
                    className="rounded-xl px-3 py-2.5 text-sm"
                    style={{ backgroundColor: "rgba(58,74,50,0.06)", border: "1px solid rgba(58,74,50,0.12)" }}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium" style={{ color: "var(--color-campo)" }}>
                        Sesión manga
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "rgba(26,26,24,0.4)" }}>
                        {fmtFecha(r.fecha)}
                      </span>
                    </div>
                    {r.usuario && (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.45)" }}>
                        {r.usuario}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
