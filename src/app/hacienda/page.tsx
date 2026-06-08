"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, MoreHorizontal, Beef, X, Loader2, AlertCircle, Download, Upload, Filter, Clock, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { exportToExcel, todayISO, slugifyName, parseXlsxDate } from "@/lib/exportExcel";
import { ImportModal } from "@/components/import-modal";
import { useDraggable } from "@/lib/useDraggable";
import { logAudit } from "@/lib/auditLog";
import { AuditDrawer } from "@/components/audit-drawer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Animal {
  id: string;
  categoria: string;
  potrero: string;
  cantidad: number;
  fecha: string;
  responsable: string;
  tipo: string | null;
  created_by: string | null;
  deleted?: boolean;
}

interface Prenez {
  id: string;
  potrero: string;
  categoria: string;
  fecha_diagnostico: string;
  total_diagnosticadas: number;
  prenadas: number;
  vacias: number;
  dudosas: number;
  fecha_parto_estimada: string | null;
  observaciones: string | null;
}

interface Filtros {
  tipos: TipoMovimiento[];
  categorias: string[];
  potrero: string;
  fechaDesde: string;
  fechaHasta: string;
  responsable: string;
  registradoPor: string;
}

type TipoMovimiento = "Ingreso" | "Venta" | "Muerte" | "Transferencia salida";

const TIPOS_MOVIMIENTO: TipoMovimiento[] = ["Ingreso", "Venta", "Muerte", "Transferencia salida"];

const TIPO_COLORS: Record<TipoMovimiento, { bg: string; color: string }> = {
  "Ingreso":              { bg: "rgba(22,163,74,0.09)",   color: "#16a34a" },
  "Venta":                { bg: "rgba(37,99,235,0.09)",    color: "#2563eb" },
  "Muerte":               { bg: "rgba(220,38,38,0.07)",    color: "#dc2626" },
  "Transferencia salida": { bg: "rgba(107,114,128,0.12)",  color: "#6b7280" },
};

const TIPOS_EGRESO = new Set<string>(["Venta", "Muerte", "Transferencia salida"]);

const CATEGORIAS = ["Terneros", "Terneras", "Novillos", "Novillitos", "Vacas", "Vaquillonas", "Toros"] as const;

const CATEGORIA_COLORS: Record<string, { bg: string; color: string }> = {
  Terneros:    { bg: "rgba(37,99,235,0.08)",   color: "#2563eb" },
  Terneras:    { bg: "rgba(37,99,235,0.08)",   color: "#2563eb" },
  Novillos:    { bg: "rgba(58,74,50,0.10)",    color: "var(--color-campo)" },
  Novillitos:  { bg: "rgba(58,74,50,0.10)",    color: "var(--color-campo)" },
  Vacas:       { bg: "rgba(139,78,42,0.10)",   color: "var(--color-cuero)" },
  Vaquillonas: { bg: "rgba(217,119,6,0.10)",   color: "#d97706" },
  Toros:       { bg: "rgba(220,38,38,0.07)",   color: "#dc2626" },
};

const TABS = [
  { key: "todos",     label: "Todos" },
  { key: "mis-datos", label: "Mis Datos" },
];

const FORM_EMPTY = {
  categoria: "Terneros" as typeof CATEGORIAS[number],
  potrero: "",
  cantidad: "",
  fecha: new Date().toISOString().split("T")[0],
  responsable: "",
  tipo: "Ingreso" as TipoMovimiento,
  monto_venta: "",
};

const DIAG_EMPTY = {
  potrero: "",
  categoria: "Vacas",
  fecha_diagnostico: new Date().toISOString().split("T")[0],
  total_diagnosticadas: "",
  prenadas: "",
  dudosas: "0",
  fecha_parto_estimada: "",
  observaciones: "",
};

const FILTROS_EMPTY: Filtros = {
  tipos: [],
  categorias: [],
  potrero: "",
  fechaDesde: "",
  fechaHasta: "",
  responsable: "",
  registradoPor: "",
};

// ─── Import config ────────────────────────────────────────────────────────────

const HACIENDA_COLUMNS = ["Categoría", "Potrero", "Cantidad", "Fecha", "Responsable"];
const HACIENDA_TEMPLATE = {
  "Categoría": "Terneros",
  "Potrero": "Potrero Norte",
  "Cantidad": 50,
  "Fecha": "2026-06-01",
  "Responsable": "Juan López",
};

function validateHaciendaRow(raw: Record<string, unknown>) {
  const errors: string[] = [];
  const categoria = String(raw["Categoría"] ?? "").trim();
  if (!(CATEGORIAS as readonly string[]).includes(categoria)) errors.push(`Categoría inválida: "${categoria}"`);
  const potrero = String(raw["Potrero"] ?? "").trim();
  if (!potrero) errors.push("Potrero vacío");
  const cantidad = Number(raw["Cantidad"]);
  if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) errors.push("Cantidad inválida");
  const fecha = parseXlsxDate(raw["Fecha"]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push("Fecha inválida (usar YYYY-MM-DD)");
  const responsable = String(raw["Responsable"] ?? "").trim();
  if (!responsable) errors.push("Responsable vacío");
  return { errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function pctColor(pct: number): string {
  return pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoriaChip({ categoria }: { categoria: string }) {
  const s = CATEGORIA_COLORS[categoria] ?? { bg: "rgba(212,197,169,0.3)", color: "var(--color-cuero)" };
  return <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{categoria}</span>;
}

function TipoChip({ tipo }: { tipo: string }) {
  const s = TIPO_COLORS[tipo as TipoMovimiento] ?? { bg: "rgba(212,197,169,0.3)", color: "var(--color-cuero)" };
  return <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{tipo}</span>;
}

// ─── NuevoAnimalModal ─────────────────────────────────────────────────────────

interface AnimalModalProps {
  establecimientoId: string;
  onClose: () => void;
  onCreated: () => void;
  editData?: Animal;
  potreros: string[];
}

function NuevoAnimalModal({ establecimientoId, onClose, onCreated, editData, potreros }: AnimalModalProps) {
  const [form, setForm] = useState(
    editData
      ? { categoria: editData.categoria as typeof CATEGORIAS[number], potrero: editData.potrero, cantidad: String(editData.cantidad), fecha: editData.fecha, responsable: editData.responsable, tipo: (editData.tipo ?? "Ingreso") as TipoMovimiento, monto_venta: "" }
      : FORM_EMPTY
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dragStyle, onDragStart } = useDraggable();

  function set(field: keyof typeof FORM_EMPTY) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.potrero.trim() || !form.responsable.trim()) { setError("Completá todos los campos."); return; }
    const cant = parseInt(form.cantidad);
    if (isNaN(cant) || cant <= 0) { setError("La cantidad debe ser mayor a 0."); return; }

    let montoVenta: number | null = null;
    if (form.tipo === "Venta" && !editData) {
      montoVenta = parseFloat(form.monto_venta);
      if (isNaN(montoVenta) || montoVenta <= 0) { setError("Ingresá el monto total de la venta."); return; }
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (editData) {
      const { data: current } = await supabase.from("animales")
        .select("categoria, potrero, cantidad, fecha, responsable, tipo")
        .eq("id", editData.id).single();

      const updateData = { categoria: form.categoria, potrero: form.potrero.trim(), cantidad: cant, fecha: form.fecha, responsable: form.responsable.trim(), tipo: form.tipo };

      const { error: dbError } = await supabase.from("animales").update(updateData).eq("id", editData.id);
      if (dbError) { setError(dbError.message); setLoading(false); return; }

      if (current && user) {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
        await logAudit({
          supabase, tabla: "animales", registroId: editData.id,
          datosAnteriores: current as Record<string, unknown>,
          datosNuevos: updateData as unknown as Record<string, unknown>,
          userId: user.id,
          userName: profile?.full_name || profile?.email || user.email || "Usuario",
        });
      }
      onCreated(); onClose(); return;
    }

    const { error: dbError } = await supabase.from("animales").insert({
      establecimiento_id: establecimientoId,
      categoria: form.categoria,
      potrero: form.potrero.trim(),
      cantidad: cant,
      fecha: form.fecha,
      responsable: form.responsable.trim(),
      tipo: form.tipo,
      created_by: user?.id ?? null,
    });
    if (dbError) { setError(dbError.message); setLoading(false); return; }

    if (form.tipo === "Venta" && montoVenta) {
      await supabase.from("gastos").insert({
        establecimiento_id: establecimientoId,
        concepto: `Venta de ${form.categoria} — ${form.potrero.trim()}`,
        categoria: "Venta de hacienda",
        tipo: "ingreso",
        monto: montoVenta,
        fecha: form.fecha,
        created_by: user?.id ?? null,
      });
    }
    onCreated(); onClose();
  }

  const INPUT_STYLE = { border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:px-4" style={{ backgroundColor: "rgba(26,26,24,0.45)" }} onClick={onClose}>
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 20px 60px rgba(26,26,24,0.18)", border: "1px solid rgba(212,197,169,0.5)", ...dragStyle }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" onMouseDown={onDragStart} style={{ cursor: "grab" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
            {editData ? "Editar Registro" : "Nuevo Dato de Hacienda"}
          </h2>
          <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_MOVIMIENTO.map((t) => {
                const isSelected = form.tipo === t;
                const st = TIPO_COLORS[t];
                return (
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, tipo: t, monto_venta: "" }))}
                    className="py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ backgroundColor: isSelected ? st.bg : "transparent", color: isSelected ? st.color : "rgba(26,26,24,0.4)", border: `1.5px solid ${isSelected ? st.color : "rgba(212,197,169,0.6)"}` }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="form-label">Categoría</label>
            <select value={form.categoria} onChange={(e) => set("categoria")(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; }}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Potrero</label>
            <select value={form.potrero} onChange={(e) => set("potrero")(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur}>
              <option value="">Seleccionar potrero...</option>
              {potreros.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Cantidad</label>
              <input type="number" min="1" value={form.cantidad} onChange={(e) => set("cantidad")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="form-label">Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => set("fecha")(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div>
            <label className="form-label">Responsable</label>
            <input type="text" value={form.responsable} onChange={(e) => set("responsable")(e.target.value)} placeholder="Nombre del responsable"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
          </div>
          {form.tipo === "Venta" && !editData && (
            <div>
              <label className="form-label">Monto total de la venta (ARS)</label>
              <input type="number" min="0" step="0.01" value={form.monto_venta} onChange={(e) => set("monto_venta")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid #2563eb", backgroundColor: "rgba(37,99,235,0.04)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                onBlur={(e) => { e.target.style.boxShadow = "none"; }} />
              <p className="text-xs mt-1.5" style={{ color: "rgba(37,99,235,0.7)" }}>Se registrará automáticamente como ingreso en Finanzas.</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
              <AlertCircle size={15} className="shrink-0" />{error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: "var(--color-campo)", opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Loader2 size={15} className="animate-spin" />Guardando...</> : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── NuevoDiagnosticoModal ────────────────────────────────────────────────────

interface DiagModalProps {
  establecimientoId: string;
  potreros: string[];
  onClose: () => void;
  onCreated: () => void;
}

function NuevoDiagnosticoModal({ establecimientoId, potreros, onClose, onCreated }: DiagModalProps) {
  const [form, setForm] = useState(DIAG_EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dragStyle, onDragStart } = useDraggable();

  function set(field: keyof typeof DIAG_EMPTY) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  const total = parseInt(form.total_diagnosticadas) || 0;
  const prenadas = parseInt(form.prenadas) || 0;
  const dudosas = parseInt(form.dudosas) || 0;
  const vacias = Math.max(0, total - prenadas - dudosas);
  const pct = total > 0 ? Math.round((prenadas / total) * 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.potrero.trim()) { setError("Ingresá el potrero."); return; }
    if (total <= 0) { setError("Total debe ser mayor a 0."); return; }
    if (prenadas > total || prenadas + dudosas > total) { setError("Preñadas + dudosas no puede superar el total."); return; }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user!.id).single();
    const userName = profile?.full_name || profile?.email || user?.email || "Usuario";

    const { error: dbError } = await supabase.from("prenez").insert({
      establecimiento_id: establecimientoId,
      potrero: form.potrero.trim(),
      categoria: form.categoria,
      fecha_diagnostico: form.fecha_diagnostico,
      total_diagnosticadas: total,
      prenadas,
      vacias,
      dudosas,
      fecha_parto_estimada: form.fecha_parto_estimada || null,
      observaciones: form.observaciones.trim() || null,
      created_by: user?.id ?? null,
      created_by_nombre: userName,
    });
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    onCreated(); onClose();
  }

  const INPUT_STYLE = { border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:px-4" style={{ backgroundColor: "rgba(26,26,24,0.45)" }} onClick={onClose}>
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 20px 60px rgba(26,26,24,0.18)", border: "1px solid rgba(212,197,169,0.5)", ...dragStyle }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" onMouseDown={onDragStart} style={{ cursor: "grab" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Nuevo Diagnóstico de Preñez</h2>
          <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Potrero</label>
            <input list="potreros-list" type="text" value={form.potrero} onChange={(e) => set("potrero")(e.target.value)} placeholder="Nombre del potrero"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            <datalist id="potreros-list">{potreros.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div>
            <label className="form-label">Categoría</label>
            <div className="flex gap-2">
              {(["Vacas", "Vaquillonas"] as const).map((c) => {
                const isSelected = form.categoria === c;
                const st = CATEGORIA_COLORS[c];
                return (
                  <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, categoria: c }))}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ backgroundColor: isSelected ? st.bg : "transparent", color: isSelected ? st.color : "rgba(26,26,24,0.4)", border: `1.5px solid ${isSelected ? st.color : "rgba(212,197,169,0.6)"}` }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="form-label">Fecha diagnóstico</label>
            <input type="date" value={form.fecha_diagnostico} onChange={(e) => set("fecha_diagnostico")(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Total</label>
              <input type="number" min="1" value={form.total_diagnosticadas} onChange={(e) => set("total_diagnosticadas")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="form-label">Preñadas</label>
              <input type="number" min="0" value={form.prenadas} onChange={(e) => set("prenadas")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="form-label">Dudosas</label>
              <input type="number" min="0" value={form.dudosas} onChange={(e) => set("dudosas")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          {total > 0 && (
            <div className="flex gap-4 px-4 py-3 rounded-xl" style={{ backgroundColor: "rgba(212,197,169,0.15)", border: "1px solid rgba(212,197,169,0.4)" }}>
              <div className="text-center flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>Vacías</p>
                <p className="text-xl font-bold" style={{ color: vacias < 0 ? "#dc2626" : "var(--color-tierra)" }}>{vacias < 0 ? "!" : vacias}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>% Preñez</p>
                <p className="text-xl font-bold" style={{ color: pctColor(pct) }}>{pct}%</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Parto estimado <span style={{ color: "rgba(26,26,24,0.35)", fontWeight: 400 }}>(opc.)</span></label>
              <input type="date" value={form.fecha_parto_estimada} onChange={(e) => set("fecha_parto_estimada")(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="form-label">Observaciones <span style={{ color: "rgba(26,26,24,0.35)", fontWeight: 400 }}>(opc.)</span></label>
              <input type="text" value={form.observaciones} onChange={(e) => set("observaciones")(e.target.value)} placeholder="..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
              <AlertCircle size={15} className="shrink-0" />{error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: "var(--color-campo)", opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Loader2 size={15} className="animate-spin" />Guardando...</> : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HaciendaPage() {
  const [seccion, setSeccion] = useState<"animales" | "prenez">("animales");
  const [activeTab, setActiveTab] = useState<"todos" | "mis-datos">("todos");
  const [search, setSearch] = useState("");
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [establecimientoNombre, setEstablecimientoNombre] = useState("");
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [auditRecord, setAuditRecord] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_EMPTY);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [prenez, setPrenez] = useState<Prenez[]>([]);
  const [loadingPrenez, setLoadingPrenez] = useState(false);
  const [prenezLoaded, setPrenezLoaded] = useState(false);
  const [showModalPrenez, setShowModalPrenez] = useState(false);
  const [potrerosFromDB, setPotrerosFromDB] = useState<string[]>([]);

  useEffect(() => {
    if (!openMenuId) return;
    function close() { setOpenMenuId(null); }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const displayName = (user.user_metadata?.nombre && user.user_metadata?.apellido)
      ? `${user.user_metadata.nombre} ${user.user_metadata.apellido}`
      : user.email ?? "";
    setUserName(displayName);
    const { data: estab } = await supabase.from("establecimientos").select("id, nombre").limit(1).single();
    if (!estab) return;
    setEstablecimientoId(estab.id);
    setEstablecimientoNombre(estab.nombre ?? "");
    const { data } = await supabase.from("animales")
      .select("id, categoria, potrero, cantidad, fecha, responsable, tipo, created_by")
      .eq("establecimiento_id", estab.id)
      .eq("deleted", false)
      .order("created_at", { ascending: false });
    setAnimales(data ?? []);
    const { data: potrerosData } = await supabase.from("potreros").select("nombre").eq("establecimiento_id", estab.id).order("nombre");
    setPotrerosFromDB((potrerosData ?? []).map((p) => p.nombre));
    const ids = [...new Set((data ?? []).map((r) => r.created_by).filter(Boolean))] as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => { map[p.id] = p.full_name || p.email || "—"; });
      setProfilesMap(map);
    }
    setLoading(false);
  }, []);

  const loadPrenezData = useCallback(async () => {
    if (!establecimientoId) return;
    setLoadingPrenez(true);
    const supabase = createClient();
    const { data } = await supabase.from("prenez")
      .select("*")
      .eq("establecimiento_id", establecimientoId)
      .order("fecha_diagnostico", { ascending: false });
    setPrenez(data ?? []);
    setPrenezLoaded(true);
    setLoadingPrenez(false);
  }, [establecimientoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (seccion === "prenez" && establecimientoId && !prenezLoaded) loadPrenezData();
  }, [seccion, establecimientoId, prenezLoaded, loadPrenezData]);


  const baseData = activeTab === "mis-datos"
    ? animales.filter((r) => r.responsable.toLowerCase().includes(userName.split(" ")[0].toLowerCase()))
    : animales;

  const filtered = baseData.filter((r) => {
    if (search && ![r.categoria, r.potrero, r.responsable].some((v) => v.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filtros.tipos.length > 0 && !filtros.tipos.includes((r.tipo ?? "Ingreso") as TipoMovimiento)) return false;
    if (filtros.categorias.length > 0 && !filtros.categorias.includes(r.categoria)) return false;
    if (filtros.potrero && r.potrero !== filtros.potrero) return false;
    if (filtros.fechaDesde && r.fecha < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && r.fecha > filtros.fechaHasta) return false;
    if (filtros.responsable && !r.responsable.toLowerCase().includes(filtros.responsable.toLowerCase())) return false;
    if (filtros.registradoPor && r.created_by !== filtros.registradoPor) return false;
    return true;
  });

  const totalCabezas = filtered.reduce((s, r) => s + (TIPOS_EGRESO.has(r.tipo ?? "Ingreso") ? -r.cantidad : r.cantidad), 0);
  const hasActiveFilters = filtros.tipos.length > 0 || filtros.categorias.length > 0 || !!filtros.potrero || !!filtros.fechaDesde || !!filtros.fechaHasta || !!filtros.responsable || !!filtros.registradoPor;
  const filterCount = filtros.tipos.length + filtros.categorias.length + [filtros.potrero, filtros.fechaDesde, filtros.fechaHasta, filtros.responsable, filtros.registradoPor].filter(Boolean).length;

  const activeChips = [
    ...filtros.tipos.map((t) => ({ key: `t-${t}`, label: t, clear: () => setFiltros((f) => ({ ...f, tipos: f.tipos.filter((x) => x !== t) })) })),
    ...filtros.categorias.map((c) => ({ key: `c-${c}`, label: c, clear: () => setFiltros((f) => ({ ...f, categorias: f.categorias.filter((x) => x !== c) })) })),
    filtros.potrero ? { key: "pot", label: `Potrero: ${filtros.potrero}`, clear: () => setFiltros((f) => ({ ...f, potrero: "" })) } : null,
    filtros.fechaDesde ? { key: "desde", label: `Desde: ${filtros.fechaDesde}`, clear: () => setFiltros((f) => ({ ...f, fechaDesde: "" })) } : null,
    filtros.fechaHasta ? { key: "hasta", label: `Hasta: ${filtros.fechaHasta}`, clear: () => setFiltros((f) => ({ ...f, fechaHasta: "" })) } : null,
    filtros.responsable ? { key: "resp", label: `Resp: ${filtros.responsable}`, clear: () => setFiltros((f) => ({ ...f, responsable: "" })) } : null,
    filtros.registradoPor ? { key: "rp", label: `Reg: ${profilesMap[filtros.registradoPor] ?? "—"}`, clear: () => setFiltros((f) => ({ ...f, registradoPor: "" })) } : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const prenezByCat = prenez.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = { total: 0, prenadas: 0 };
    acc[p.categoria].total += p.total_diagnosticadas;
    acc[p.categoria].prenadas += p.prenadas;
    return acc;
  }, {} as Record<string, { total: number; prenadas: number }>);
  const prenezStats = Object.entries(prenezByCat)
    .map(([cat, d]) => ({ cat, pct: d.total > 0 ? Math.round((d.prenadas / d.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  function exportar() {
    const rows = filtered.map((a) => ({ "Tipo": a.tipo ?? "Ingreso", "Categoría": a.categoria, "Potrero": a.potrero, "Cantidad": a.cantidad, "Fecha": fmtFecha(a.fecha), "Responsable": a.responsable }));
    exportToExcel(rows, "Hacienda", `${slugifyName(establecimientoNombre)}_Hacienda_${todayISO()}.xlsx`);
  }

  async function handleImport(validRows: Record<string, unknown>[]) {
    if (!establecimientoId) throw new Error("No se encontró el establecimiento.");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("animales").insert(validRows.map((r) => ({
      establecimiento_id: establecimientoId,
      categoria: String(r["Categoría"]).trim(),
      potrero: String(r["Potrero"]).trim(),
      cantidad: Number(r["Cantidad"]),
      fecha: parseXlsxDate(r["Fecha"]),
      responsable: String(r["Responsable"]).trim(),
      created_by: user?.id ?? null,
    })));
    if (error) throw new Error(error.message);
    fetchData();
  }

  const SELECT_STYLE = { border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "#ffffff", color: "var(--color-tierra)" };

  return (
    <>
      {(showModal || editAnimal !== null) && establecimientoId && (
        <NuevoAnimalModal establecimientoId={establecimientoId}
          onClose={() => { setShowModal(false); setEditAnimal(null); }}
          onCreated={fetchData} editData={editAnimal ?? undefined}
          potreros={potrerosFromDB} />
      )}
      {showModalPrenez && establecimientoId && (
        <NuevoDiagnosticoModal establecimientoId={establecimientoId} potreros={potrerosFromDB}
          onClose={() => setShowModalPrenez(false)}
          onCreated={() => setPrenezLoaded(false)} />
      )}
      {showImportModal && (
        <ImportModal title="Importar Hacienda" columns={HACIENDA_COLUMNS} templateFilename="Plantilla_Hacienda.xlsx"
          templateExample={HACIENDA_TEMPLATE} validateRow={validateHaciendaRow}
          onConfirm={handleImport} onClose={() => setShowImportModal(false)} />
      )}
      {auditRecord && <AuditDrawer tabla="animales" registroId={auditRecord} onClose={() => setAuditRecord(null)} />}

      <div className="flex flex-col min-h-full">
        <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Gestión</p>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Animales</h1>
            </div>
            <div className="flex items-center gap-2">
              {seccion === "animales" ? (
                <>
                  {!loading && <button onClick={() => setShowImportModal(true)} className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}><Upload size={15} strokeWidth={2} />Importar</button>}
                  {!loading && animales.length > 0 && <button onClick={exportar} className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}><Download size={15} strokeWidth={2} />Exportar</button>}
                  <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--color-campo)" }}><Plus size={16} strokeWidth={2.5} /><span className="hidden sm:inline">Nuevo Dato</span><span className="sm:hidden">Nuevo</span></button>
                </>
              ) : (
                <button onClick={() => setShowModalPrenez(true)} className="flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--color-campo)" }}><Plus size={16} strokeWidth={2.5} /><span className="hidden sm:inline">Nuevo Diagnóstico</span><span className="sm:hidden">Nuevo</span></button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 flex flex-col gap-4">
          {/* Section tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "rgba(212,197,169,0.25)" }}>
            {([{ key: "animales", label: "Animales", icon: Beef }, { key: "prenez", label: "Preñez", icon: Stethoscope }] as const).map(({ key, label, icon: Icon }) => {
              const isActive = seccion === key;
              return (
                <button key={key} onClick={() => setSeccion(key)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: isActive ? "#ffffff" : "transparent", color: isActive ? "var(--color-tierra)" : "rgba(26,26,24,0.45)", boxShadow: isActive ? "0 1px 3px rgba(26,26,24,0.10)" : "none" }}>
                  <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />{label}
                </button>
              );
            })}
          </div>

          {/* ── ANIMALES ── */}
          {seccion === "animales" && (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: "rgba(212,197,169,0.25)" }}>
                    {TABS.map(({ key, label }) => {
                      const isActive = activeTab === key;
                      return (
                        <button key={key} onClick={() => setActiveTab(key as "todos" | "mis-datos")}
                          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{ backgroundColor: isActive ? "#ffffff" : "transparent", color: isActive ? "var(--color-tierra)" : "rgba(26,26,24,0.45)", boxShadow: isActive ? "0 1px 3px rgba(26,26,24,0.10)" : "none" }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(26,26,24,0.35)" }} />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "#ffffff", color: "var(--color-tierra)" }}
                      onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }} />
                  </div>
                  <button onClick={() => setShowFilterPanel((p) => !p)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ border: `1.5px solid ${hasActiveFilters || showFilterPanel ? "var(--color-campo)" : "rgba(212,197,169,0.8)"}`, color: hasActiveFilters || showFilterPanel ? "var(--color-campo)" : "var(--color-tierra)", backgroundColor: hasActiveFilters || showFilterPanel ? "rgba(58,74,50,0.06)" : "transparent" }}>
                    <Filter size={14} strokeWidth={2} />Filtros
                    {filterCount > 0 && <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: "var(--color-campo)" }}>{filterCount}</span>}
                  </button>
                  {!loading && filtered.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0" style={{ backgroundColor: "rgba(58,74,50,0.08)", color: "var(--color-campo)" }}>
                      <Beef size={15} strokeWidth={1.8} /><span>{totalCabezas.toLocaleString("es-AR")} cabezas</span>
                    </div>
                  )}
                </div>

                {showFilterPanel && (
                  <div className="rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ backgroundColor: "rgba(240,237,230,0.6)", border: "1px solid rgba(212,197,169,0.5)" }}>
                    <div>
                      <p className="form-label mb-2">Tipo</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TIPOS_MOVIMIENTO.map((t) => {
                          const act = filtros.tipos.includes(t);
                          const st = TIPO_COLORS[t];
                          return (
                            <button key={t} onClick={() => setFiltros((f) => ({ ...f, tipos: act ? f.tipos.filter((x) => x !== t) : [...f.tipos, t] }))}
                              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                              style={{ backgroundColor: act ? st.bg : "rgba(255,255,255,0.8)", color: act ? st.color : "rgba(26,26,24,0.55)", border: `1.5px solid ${act ? st.color : "rgba(212,197,169,0.6)"}` }}>
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="form-label mb-2">Categoría</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIAS.map((c) => {
                          const act = filtros.categorias.includes(c);
                          const st = CATEGORIA_COLORS[c];
                          return (
                            <button key={c} onClick={() => setFiltros((f) => ({ ...f, categorias: act ? f.categorias.filter((x) => x !== c) : [...f.categorias, c] }))}
                              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                              style={{ backgroundColor: act ? st.bg : "rgba(255,255,255,0.8)", color: act ? st.color : "rgba(26,26,24,0.55)", border: `1.5px solid ${act ? st.color : "rgba(212,197,169,0.6)"}` }}>
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="form-label mb-1.5">Potrero</p>
                      <select value={filtros.potrero} onChange={(e) => setFiltros((f) => ({ ...f, potrero: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={SELECT_STYLE}>
                        <option value="">Todos</option>
                        {potrerosFromDB.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="form-label mb-1.5">Rango de fechas</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={filtros.fechaDesde} onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={SELECT_STYLE} />
                        <input type="date" value={filtros.fechaHasta} onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={SELECT_STYLE} />
                      </div>
                    </div>
                    <div>
                      <p className="form-label mb-1.5">Responsable</p>
                      <input type="text" value={filtros.responsable} onChange={(e) => setFiltros((f) => ({ ...f, responsable: e.target.value }))} placeholder="Buscar..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={SELECT_STYLE} />
                    </div>
                    {Object.keys(profilesMap).length > 0 && (
                      <div>
                        <p className="form-label mb-1.5">Registrado por</p>
                        <select value={filtros.registradoPor} onChange={(e) => setFiltros((f) => ({ ...f, registradoPor: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={SELECT_STYLE}>
                          <option value="">Todos</option>
                          {Object.entries(profilesMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {activeChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeChips.map((chip) => (
                      <span key={chip.key} className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "rgba(58,74,50,0.1)", color: "var(--color-campo)", border: "1px solid rgba(58,74,50,0.2)" }}>
                        {chip.label}
                        <button onClick={chip.clear} className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(58,74,50,0.15)" }}>
                          <X size={9} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                    <button onClick={() => setFiltros(FILTROS_EMPTY)} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ color: "#dc2626", backgroundColor: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}>
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 3px rgba(26,26,24,0.06)", border: "1px solid rgba(212,197,169,0.5)" }}>
                {loading ? (
                  <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(58,74,50,0.08)" }}>
                      <Beef size={28} style={{ color: "var(--color-campo)" }} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>{hasActiveFilters ? "Sin resultados" : "Sin registros"}</h3>
                    <p className="text-sm mb-6 max-w-xs" style={{ color: "rgba(26,26,24,0.45)" }}>{hasActiveFilters ? "Ningún registro cumple los filtros activos." : "Empezá registrando tu primer lote."}</p>
                    {!hasActiveFilters && <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}><Plus size={16} />Nuevo Dato</button>}
                  </div>
                ) : (
                  <div className="table-wrap">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                        {[
                          { label: "Tipo", hide: false },
                          { label: "Categoría", hide: false },
                          { label: "Potrero", hide: false },
                          { label: "Cantidad", hide: false },
                          { label: "Fecha", hide: true },
                          { label: "Responsable", hide: false },
                          { label: "Registrado por", hide: true },
                          { label: "", hide: false },
                        ].map(({ label, hide }) => (
                          <th key={label} className={`px-6 py-3.5 text-left text-xs font-semibold tracking-wider uppercase${hide ? " col-mobile-hidden" : ""}`} style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.5)" }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, idx) => {
                        const isEgreso = TIPOS_EGRESO.has(row.tipo ?? "Ingreso");
                        return (
                          <tr key={row.id}
                            style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(212,197,169,0.25)" : "none" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(240,237,230,0.4)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}>
                            <td className="px-6 py-4"><TipoChip tipo={row.tipo ?? "Ingreso"} /></td>
                            <td className="px-6 py-4"><CategoriaChip categoria={row.categoria} /></td>
                            <td className="px-6 py-4 text-sm font-medium" style={{ color: "var(--color-tierra)" }}>{row.potrero}</td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold tabular-nums" style={{ color: isEgreso ? "#dc2626" : "var(--color-campo)" }}>{isEgreso ? "-" : "+"}{row.cantidad.toLocaleString("es-AR")}</span>
                              <span className="text-xs ml-1" style={{ color: "rgba(26,26,24,0.35)" }}>cab.</span>
                            </td>
                            <td className="px-6 py-4 text-sm tabular-nums col-mobile-hidden" style={{ color: "rgba(26,26,24,0.55)" }}>{fmtFecha(row.fecha)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ backgroundColor: "var(--color-cuero)" }}>
                                  {row.responsable.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </div>
                                <span className="text-sm" style={{ color: "var(--color-tierra)" }}>{row.responsable}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm col-mobile-hidden" style={{ color: "rgba(26,26,24,0.5)" }}>{row.created_by ? (profilesMap[row.created_by] ?? "—") : "—"}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="relative inline-block">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === row.id ? null : row.id); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto"
                                  style={{ color: openMenuId === row.id ? "var(--color-tierra)" : "rgba(26,26,24,0.3)", backgroundColor: openMenuId === row.id ? "rgba(212,197,169,0.3)" : "transparent" }}
                                  onMouseEnter={(e) => { if (openMenuId !== row.id) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-tierra)"; } }}
                                  onMouseLeave={(e) => { if (openMenuId !== row.id) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(26,26,24,0.3)"; } }}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {openMenuId === row.id && (
                                  <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-1"
                                    style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 20px rgba(26,26,24,0.14)", border: "1px solid rgba(212,197,169,0.5)", minWidth: 148 }}>
                                    <button onClick={(e) => { e.stopPropagation(); setEditAnimal(row); setOpenMenuId(null); }}
                                      className="w-full px-4 py-2 text-sm text-left" style={{ color: "var(--color-tierra)" }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.2)"; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                                      Editar
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setAuditRecord(row.id); setOpenMenuId(null); }}
                                      className="w-full px-4 py-2 text-sm text-left flex items-center gap-2" style={{ color: "rgba(26,26,24,0.6)" }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.2)"; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                                      <Clock size={13} />Ver historial
                                    </button>
                                    <hr style={{ borderColor: "rgba(212,197,169,0.4)", margin: "4px 0" }} />
                                    <button onClick={async (e) => { e.stopPropagation(); setOpenMenuId(null); if (!confirm("¿Eliminar este registro? Se conservará en el historial de auditoría.")) return; await createClient().from("animales").update({ deleted: true }).eq("id", row.id); await fetchData(); }}
                                      className="w-full px-4 py-2 text-sm text-left" style={{ color: "#dc2626" }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(220,38,38,0.06)"; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
              {!loading && filtered.length > 0 && (
                <p className="text-xs" style={{ color: "rgba(26,26,24,0.35)" }}>
                  {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · {totalCabezas.toLocaleString("es-AR")} cabezas neto
                </p>
              )}
            </>
          )}

          {/* ── PREÑEZ ── */}
          {seccion === "prenez" && (
            <>
              {loadingPrenez ? (
                <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} /></div>
              ) : prenez.length === 0 ? (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
                  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(58,74,50,0.08)" }}>
                      <Stethoscope size={28} style={{ color: "var(--color-campo)" }} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Sin diagnósticos</h3>
                    <p className="text-sm mb-6" style={{ color: "rgba(26,26,24,0.45)" }}>Registrá el primer diagnóstico de preñez.</p>
                    <button onClick={() => setShowModalPrenez(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}><Plus size={16} />Nuevo Diagnóstico</button>
                  </div>
                </div>
              ) : (
                <>
                  {prenezStats.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {prenezStats.map(({ cat, pct }) => (
                        <div key={cat} className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                          <p className="text-xs font-medium mb-1" style={{ color: "rgba(26,26,24,0.45)" }}>{cat}</p>
                          <p className="text-2xl font-bold" style={{ color: pctColor(pct), fontFamily: "var(--font-playfair), Georgia, serif" }}>{pct}%</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.35)" }}>% preñez</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                    <div className="table-wrap">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                          {["Fecha", "Potrero", "Categoría", "Total", "Preñadas", "Vacías", "% Preñez", "Parto est.", "Obs."].map((col) => (
                            <th key={col} className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.5)" }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prenez.map((p, idx) => {
                          const pct = p.total_diagnosticadas > 0 ? Math.round((p.prenadas / p.total_diagnosticadas) * 100) : 0;
                          return (
                            <tr key={p.id}
                              style={{ borderBottom: idx < prenez.length - 1 ? "1px solid rgba(212,197,169,0.22)" : "none" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(240,237,230,0.35)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}>
                              <td className="px-5 py-3.5 text-sm tabular-nums" style={{ color: "rgba(26,26,24,0.55)" }}>{fmtFecha(p.fecha_diagnostico)}</td>
                              <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--color-tierra)" }}>{p.potrero}</td>
                              <td className="px-5 py-3.5"><CategoriaChip categoria={p.categoria} /></td>
                              <td className="px-5 py-3.5 text-sm tabular-nums font-semibold" style={{ color: "var(--color-tierra)" }}>{p.total_diagnosticadas}</td>
                              <td className="px-5 py-3.5 text-sm tabular-nums" style={{ color: "#16a34a" }}>{p.prenadas}</td>
                              <td className="px-5 py-3.5 text-sm tabular-nums" style={{ color: "#dc2626" }}>{p.vacias}</td>
                              <td className="px-5 py-3.5"><span className="text-sm font-bold" style={{ color: pctColor(pct) }}>{pct}%</span></td>
                              <td className="px-5 py-3.5 text-sm tabular-nums" style={{ color: "rgba(26,26,24,0.5)" }}>{p.fecha_parto_estimada ? fmtFecha(p.fecha_parto_estimada) : "—"}</td>
                              <td className="px-5 py-3.5 text-xs max-w-[100px] truncate" style={{ color: "rgba(26,26,24,0.45)" }}>{p.observaciones ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "rgba(26,26,24,0.35)" }}>{prenez.length} diagnóstico{prenez.length !== 1 ? "s" : ""}</p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
