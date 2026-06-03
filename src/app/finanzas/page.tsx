"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, DollarSign, Plus, X, Loader2, AlertCircle, Download, MoreHorizontal, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDraggable } from "@/lib/useDraggable";
import { AuditDrawer } from "@/components/audit-drawer";
import { exportToExcel, todayISO, slugifyName } from "@/lib/exportExcel";

// ─── Types ────────────────────────────────────────────────────────────────────

type Moneda = "ARS" | "USD";
type IVA = "con" | "sin";

interface Gasto {
  id: string;
  concepto: string;
  categoria: string;
  tipo: "ingreso" | "gasto";
  monto: number;
  fecha: string;
  created_by: string | null;
}

const CATEGORIAS_GASTO = [
  "Alimentación", "Sanidad", "Combustible", "Administración",
  "Estructuras", "Mano de obra", "Otros",
];

const CATEGORIAS_INGRESO = [
  "Venta de hacienda", "Arrendamiento", "Subsidios", "Servicios", "Otros",
];

const CAT_COLORS: Record<string, string> = {
  "Alimentación":       "#16a34a",
  "Sanidad":            "#2563eb",
  "Combustible":        "#d97706",
  "Administración":     "var(--color-cuero)",
  "Estructuras":        "#7c3aed",
  "Mano de obra":       "#0891b2",
  "Venta de hacienda":  "#16a34a",
  "Arrendamiento":      "#2563eb",
  "Otros":              "rgba(26,26,24,0.4)",
};

const MONEDAS: Moneda[] = ["ARS", "USD"];
const IVA_OPTS: { key: IVA; label: string }[] = [
  { key: "con", label: "Con IVA" },
  { key: "sin", label: "Sin IVA" },
];

const USD_RATE = 1000;

const FORM_EMPTY = {
  concepto: "",
  categoria: "Alimentación",
  tipo: "gasto" as "ingreso" | "gasto",
  monto: "",
  fecha: new Date().toISOString().split("T")[0],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmt(n: number, moneda: Moneda): string {
  if (moneda === "USD") return `US$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR")}`;
}

function fmtFull(n: number, moneda: Moneda): string {
  return moneda === "USD"
    ? `US$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${n.toLocaleString("es-AR")}`;
}

function applyFilters(monto: number, moneda: Moneda, iva: IVA): number {
  const ivaFactor = iva === "sin" ? 1 / 1.21 : 1;
  const currFactor = moneda === "USD" ? 1 / USD_RATE : 1;
  return monto * ivaFactor * currFactor;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  establecimientoId: string;
  onClose: () => void;
  onCreated: () => void;
}

function NuevoGastoModal({ establecimientoId, onClose, onCreated }: ModalProps) {
  const [form, setForm] = useState(FORM_EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dragStyle, onDragStart } = useDraggable();

  function set(field: keyof typeof FORM_EMPTY) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  const categorias = form.tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto.trim()) { setError("Ingresá un concepto."); return; }
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) { setError("El monto debe ser mayor a 0."); return; }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("gastos").insert({
      establecimiento_id: establecimientoId,
      concepto: form.concepto.trim(),
      categoria: form.categoria,
      tipo: form.tipo,
      monto,
      fecha: form.fecha,
      created_by: user?.id ?? null,
    });
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(26,26,24,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 20px 60px rgba(26,26,24,0.18)", border: "1px solid rgba(212,197,169,0.5)", ...dragStyle }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" onMouseDown={onDragStart} style={{ cursor: "grab" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Nuevo Movimiento</h2>
          <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tipo toggle */}
          <div>
            <label className="form-label">Tipo</label>
            <div className="flex gap-2">
              {(["gasto", "ingreso"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { set("tipo")(t); set("categoria")(t === "ingreso" ? CATEGORIAS_INGRESO[0] : CATEGORIAS_GASTO[0]); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: form.tipo === t ? (t === "gasto" ? "rgba(220,38,38,0.07)" : "rgba(22,163,74,0.09)") : "transparent",
                    color: form.tipo === t ? (t === "gasto" ? "#dc2626" : "#16a34a") : "rgba(26,26,24,0.4)",
                    border: `1.5px solid ${form.tipo === t ? (t === "gasto" ? "#dc2626" : "#16a34a") : "rgba(212,197,169,0.6)"}`,
                  }}>
                  {t === "gasto" ? "Gasto" : "Ingreso"}
                </button>
              ))}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="form-label">Concepto</label>
            <input type="text" value={form.concepto} onChange={(e) => set("concepto")(e.target.value)} placeholder="Ej: Compra de rollos de pasto"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="form-label">Categoría</label>
            <select value={form.categoria} onChange={(e) => set("categoria")(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}>
              {categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Monto (ARS)</label>
              <input type="number" min="0" step="0.01" value={form.monto} onChange={(e) => set("monto")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="form-label">Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => set("fecha")(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
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

// ─── SVG Charts ───────────────────────────────────────────────────────────────

function DonutChart({ categorias }: { categorias: { nombre: string; color: string; porcentaje: number }[] }) {
  const r = 60; const cx = 84; const cy = 84;
  const circum = 2 * Math.PI * r;
  let offset = 0;
  const slices = categorias.map((cat) => {
    const dashArray = (cat.porcentaje / 100) * circum;
    const dashOffset = circum - offset;
    offset += dashArray;
    return { ...cat, dashArray, dashOffset };
  });
  return (
    <svg width={168} height={168} viewBox="0 0 168 168">
      {slices.map((slice, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={slice.color} strokeWidth={22}
          strokeDasharray={`${slice.dashArray} ${circum - slice.dashArray}`}
          strokeDashoffset={slice.dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={48} fill="#ffffff" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinanzasPage() {
  const [moneda, setMoneda] = useState<Moneda>("ARS");
  const [iva, setIva] = useState<IVA>("con");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split("T")[0]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [establecimientoNombre, setEstablecimientoNombre] = useState("");
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [auditId, setAuditId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function close() { setOpenMenuId(null); }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: estab } = await supabase.from("establecimientos").select("id, nombre").eq("user_id", user.id).single();
    if (!estab) return;
    setEstablecimientoId(estab.id);
    setEstablecimientoNombre(estab.nombre ?? "");
    const { data } = await supabase.from("gastos").select("*").eq("establecimiento_id", estab.id)
      .gte("fecha", fechaDesde).lte("fecha", fechaHasta).order("fecha", { ascending: false });
    setGastos(data ?? []);

    const ids = [...new Set((data ?? []).map((r) => r.created_by).filter(Boolean))] as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => { map[p.id] = p.full_name || p.email || "—"; });
      setProfilesMap(map);
    }

    setLoading(false);
  }, [fechaDesde, fechaHasta]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived stats
  const soloGastos = gastos.filter((g) => g.tipo === "gasto");
  const soloIngresos = gastos.filter((g) => g.tipo === "ingreso");

  const totalGastos = soloGastos.reduce((s, g) => s + applyFilters(g.monto, moneda, iva), 0);
  const totalIngresos = soloIngresos.reduce((s, g) => s + applyFilters(g.monto, moneda, iva), 0);
  const saldo = totalIngresos - totalGastos;

  // Categorías de gastos para donut
  const catMap: Record<string, number> = {};
  soloGastos.forEach((g) => { catMap[g.categoria] = (catMap[g.categoria] ?? 0) + g.monto; });
  const catTotal = Object.values(catMap).reduce((s, v) => s + v, 0);
  const categoriasChart = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, monto]) => ({
      nombre,
      monto: applyFilters(monto, moneda, iva),
      color: CAT_COLORS[nombre] ?? "rgba(26,26,24,0.3)",
      porcentaje: catTotal > 0 ? Math.round((monto / catTotal) * 100) : 0,
    }));

  function exportar() {
    const rows = gastos.map((g) => ({
      "Fecha": fmtFecha(g.fecha),
      "Concepto": g.concepto,
      "Categoría": g.categoria,
      "Tipo": g.tipo === "ingreso" ? "Ingreso" : "Gasto",
      "Monto (ARS)": g.monto,
    }));
    const totalIngresos = gastos.filter((g) => g.tipo === "ingreso").reduce((s, g) => s + g.monto, 0);
    const totalEgresos = gastos.filter((g) => g.tipo === "gasto").reduce((s, g) => s + g.monto, 0);
    rows.push({ "Fecha": "", "Concepto": "TOTAL INGRESOS", "Categoría": "", "Tipo": "", "Monto (ARS)": totalIngresos } as typeof rows[0]);
    rows.push({ "Fecha": "", "Concepto": "TOTAL GASTOS", "Categoría": "", "Tipo": "", "Monto (ARS)": totalEgresos } as typeof rows[0]);
    rows.push({ "Fecha": "", "Concepto": "SALDO NETO", "Categoría": "", "Tipo": "", "Monto (ARS)": totalIngresos - totalEgresos } as typeof rows[0]);
    const slug = slugifyName(establecimientoNombre);
    exportToExcel(rows, "Finanzas", `${slug}_Finanzas_${todayISO()}.xlsx`);
  }

  return (
    <>
      {showModal && establecimientoId && (
        <NuevoGastoModal establecimientoId={establecimientoId} onClose={() => setShowModal(false)} onCreated={fetchData} />
      )}
      {auditId && <AuditDrawer tabla="gastos" registroId={auditId} onClose={() => setAuditId(null)} />}

      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Gestión</p>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Finanzas</h1>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }} />
              <span className="text-sm" style={{ color: "rgba(26,26,24,0.35)" }}>—</span>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }} />
              {[
                { opts: MONEDAS.map((m) => ({ key: m, label: m })), value: moneda, set: (v: string) => setMoneda(v as Moneda) },
                { opts: IVA_OPTS.map(({ key, label }) => ({ key, label })), value: iva, set: (v: string) => setIva(v as IVA) },
              ].map(({ opts, value, set: setter }, gi) => (
                <div key={gi} className="flex items-center p-1 rounded-xl gap-1" style={{ backgroundColor: "rgba(212,197,169,0.25)" }}>
                  {opts.map(({ key, label }) => (
                    <button key={key} onClick={() => setter(key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ backgroundColor: value === key ? "#ffffff" : "transparent", color: value === key ? "var(--color-tierra)" : "rgba(26,26,24,0.45)", boxShadow: value === key ? "0 1px 3px rgba(26,26,24,0.10)" : "none" }}>
                      {label}
                    </button>
                  ))}
                </div>
              ))}
              {!loading && gastos.length > 0 && (
                <button onClick={exportar} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>
                  <Download size={15} strokeWidth={2} />Exportar
                </button>
              )}
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--color-campo)" }}>
                <Plus size={16} strokeWidth={2.5} />Nuevo Movimiento
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Ingresos", value: totalIngresos, icon: TrendingUp,  color: "#16a34a", bg: "rgba(22,163,74,0.09)"  },
                  { label: "Gastos",   value: totalGastos,   icon: TrendingDown, color: "#dc2626", bg: "rgba(220,38,38,0.07)"  },
                  { label: "Saldo",    value: saldo,          icon: DollarSign,  color: saldo >= 0 ? "#16a34a" : "#dc2626", bg: saldo >= 0 ? "rgba(22,163,74,0.09)" : "rgba(220,38,38,0.07)" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.45)" }}>{label}</p>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                        <Icon size={16} style={{ color }} strokeWidth={1.8} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold" style={{ color, fontFamily: "var(--font-playfair), Georgia, serif" }}>
                      {gastos.length === 0 ? (moneda === "USD" ? "US$ 0" : "$0") : fmt(Math.abs(value), moneda)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.35)" }}>{fmtFecha(fechaDesde)} — {fmtFecha(fechaHasta)} · {iva === "con" ? "con IVA" : "sin IVA"}</p>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              {gastos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
                  <DollarSign size={32} style={{ color: "rgba(26,26,24,0.2)" }} strokeWidth={1.4} className="mb-3" />
                  <p className="text-sm font-medium mb-1" style={{ color: "rgba(26,26,24,0.45)" }}>Sin movimientos registrados</p>
                  <p className="text-xs mb-5" style={{ color: "rgba(26,26,24,0.3)" }}>Cargá tu primer gasto o ingreso</p>
                  <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
                    <Plus size={16} />Nuevo Movimiento
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Categorías */}
                    <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                      <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Categorías de gastos</h3>
                      {categoriasChart.length === 0 ? (
                        <p className="text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>Sin gastos registrados.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {categoriasChart.map((cat) => (
                            <div key={cat.nombre}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                  <span className="text-sm" style={{ color: "var(--color-tierra)" }}>{cat.nombre}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold" style={{ color: "var(--color-tierra)" }}>{cat.porcentaje}%</span>
                                  <span className="text-xs ml-1.5" style={{ color: "rgba(26,26,24,0.38)" }}>{fmt(cat.monto, moneda)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(212,197,169,0.35)" }}>
                                <div className="h-full rounded-full" style={{ width: `${cat.porcentaje}%`, backgroundColor: cat.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Donut */}
                    <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                      <h3 className="text-base font-semibold self-start" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Distribución</h3>
                      {categoriasChart.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>Sin datos</p>
                        </div>
                      ) : (
                        <>
                          <DonutChart categorias={categoriasChart} />
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
                            {categoriasChart.map((cat) => (
                              <div key={cat.nombre} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="text-[11px]" style={{ color: "rgba(26,26,24,0.55)" }}>{cat.nombre}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tabla movimientos */}
                  <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                    <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(212,197,169,0.4)" }}>
                      <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Gastos e Ingresos</h3>
                      <span className="text-xs" style={{ color: "rgba(26,26,24,0.38)" }}>{gastos.length} movimientos</span>
                    </div>
                    <div className="table-wrap">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.35)" }}>
                          {["Fecha", "Concepto", "Categoría", "Tipo", "Monto", "Registrado por", ""].map((col) => (
                            <th key={col} className="px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.5)" }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gastos.map((mov, idx) => (
                          <tr key={mov.id}
                            style={{ borderBottom: idx < gastos.length - 1 ? "1px solid rgba(212,197,169,0.22)" : "none" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(240,237,230,0.35)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}>
                            <td className="px-6 py-3.5 text-sm tabular-nums" style={{ color: "rgba(26,26,24,0.5)" }}>{fmtFecha(mov.fecha)}</td>
                            <td className="px-6 py-3.5 text-sm font-medium" style={{ color: "var(--color-tierra)" }}>{mov.concepto}</td>
                            <td className="px-6 py-3.5">
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: mov.tipo === "ingreso" ? "rgba(22,163,74,0.09)" : "rgba(212,197,169,0.3)", color: mov.tipo === "ingreso" ? "#16a34a" : "var(--color-cuero)" }}>
                                {mov.categoria}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: mov.tipo === "ingreso" ? "rgba(22,163,74,0.09)" : "rgba(220,38,38,0.07)", color: mov.tipo === "ingreso" ? "#16a34a" : "#dc2626" }}>
                                {mov.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-sm font-bold tabular-nums" style={{ color: mov.tipo === "ingreso" ? "#16a34a" : "#dc2626" }}>
                                {mov.tipo === "ingreso" ? "+" : "-"}{fmtFull(applyFilters(mov.monto, moneda, iva), moneda)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-sm" style={{ color: "rgba(26,26,24,0.5)" }}>
                              {mov.created_by ? (profilesMap[mov.created_by] ?? "—") : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="relative inline-block">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === mov.id ? null : mov.id); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto"
                                  style={{ color: "rgba(26,26,24,0.3)", backgroundColor: "transparent" }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-tierra)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(26,26,24,0.3)"; }}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {openMenuId === mov.id && (
                                  <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-1"
                                    style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 20px rgba(26,26,24,0.14)", border: "1px solid rgba(212,197,169,0.5)", minWidth: 140 }}>
                                    <button onClick={(e) => { e.stopPropagation(); setAuditId(mov.id); setOpenMenuId(null); }}
                                      className="w-full px-4 py-2 text-sm text-left flex items-center gap-2" style={{ color: "rgba(26,26,24,0.6)" }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.2)"; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                                      <Clock size={13} />Ver historial
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
