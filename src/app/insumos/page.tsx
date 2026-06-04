"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Minus, Package, X, Loader2, AlertCircle, Download, Upload, MoreHorizontal, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDraggable } from "@/lib/useDraggable";
import { AuditDrawer } from "@/components/audit-drawer";
import { exportToExcel, todayISO, slugifyName } from "@/lib/exportExcel";
import { ImportModal } from "@/components/import-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Categoria = "ALIMENTO" | "SANIDAD" | "INSUMOS AGRÍCOLAS" | "ESTRUCTURA";

interface Insumo {
  id: string;
  nombre: string;
  categoria: Categoria;
  emoji: string;
  inventario: number;
  unidad: string;
  minimo: number;
  created_by: string | null;
}

const CATEGORIAS: Categoria[] = ["ALIMENTO", "SANIDAD", "INSUMOS AGRÍCOLAS", "ESTRUCTURA"];

const CAT_STYLE: Record<Categoria, { bg: string; color: string; headerBg: string }> = {
  "ALIMENTO":          { bg: "rgba(22,163,74,0.08)",  color: "#16a34a", headerBg: "rgba(22,163,74,0.05)"  },
  "SANIDAD":           { bg: "rgba(37,99,235,0.08)",  color: "#2563eb", headerBg: "rgba(37,99,235,0.04)"  },
  "INSUMOS AGRÍCOLAS": { bg: "rgba(217,119,6,0.10)",  color: "#d97706", headerBg: "rgba(217,119,6,0.05)"  },
  "ESTRUCTURA":        { bg: "rgba(139,78,42,0.10)",  color: "var(--color-cuero)", headerBg: "rgba(139,78,42,0.04)" },
};

const EMOJI_OPTIONS: Record<Categoria, string[]> = {
  "ALIMENTO":          ["🌾", "🌽", "🧂", "🪣", "🌿"],
  "SANIDAD":           ["💉", "🩺", "💊", "🧴", "🩹"],
  "INSUMOS AGRÍCOLAS": ["🌿", "🪣", "⚗️", "🌱", "🌾"],
  "ESTRUCTURA":        ["🔩", "🪵", "⛏️", "🔧", "🧱"],
};

const FORM_EMPTY = {
  nombre: "",
  categoria: "ALIMENTO" as Categoria,
  inventario: "",
  unidad: "",
  minimo: "0",
  emoji: "📦",
};

// ─── Import config ────────────────────────────────────────────────────────────

const INSUMOS_COLUMNS = ["Producto", "Categoría", "Inventario", "Unidad", "Mínimo"];

const INSUMOS_TEMPLATE = {
  "Producto": "Maíz molido",
  "Categoría": "ALIMENTO",
  "Inventario": 500,
  "Unidad": "kg",
  "Mínimo": 100,
};

const CAT_DEFAULT_EMOJI: Record<string, string> = {
  "ALIMENTO": "🌾",
  "SANIDAD": "💉",
  "INSUMOS AGRÍCOLAS": "🌿",
  "ESTRUCTURA": "🔩",
};

function validateInsumoRow(raw: Record<string, unknown>) {
  const errors: string[] = [];
  const nombre = String(raw["Producto"] ?? "").trim();
  if (!nombre) errors.push("Producto vacío");
  const categoria = String(raw["Categoría"] ?? "").trim();
  if (!(CATEGORIAS as readonly string[]).includes(categoria))
    errors.push(`Categoría inválida: "${categoria}"`);
  const inventario = Number(raw["Inventario"]);
  if (isNaN(inventario) || inventario < 0) errors.push("Inventario inválido");
  const unidad = String(raw["Unidad"] ?? "").trim();
  if (!unidad) errors.push("Unidad vacía");
  const minimo = Number(raw["Mínimo"] ?? raw["Minimo"] ?? 0);
  if (isNaN(minimo) || minimo < 0) errors.push("Mínimo inválido");
  return { errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StockBar({ inventario, minimo, maximo }: { inventario: number; minimo: number; maximo: number }) {
  const pct = maximo > 0 ? Math.min(100, Math.round((inventario / maximo) * 100)) : 0;
  const isCritical = inventario <= minimo;
  const color = isCritical ? "#dc2626" : inventario <= minimo * 1.5 ? "#d97706" : "#16a34a";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(212,197,169,0.4)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums shrink-0" style={{ color, minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  establecimientoId: string;
  onClose: () => void;
  onCreated: () => void;
}

function NuevoInsumoModal({ establecimientoId, onClose, onCreated }: ModalProps) {
  const [form, setForm] = useState(FORM_EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dragStyle, onDragStart } = useDraggable();

  function set(field: keyof typeof FORM_EMPTY) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  const emojis = EMOJI_OPTIONS[form.categoria] ?? ["📦"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.unidad.trim()) { setError("Completá nombre y unidad."); return; }
    const inv = parseFloat(form.inventario);
    if (isNaN(inv) || inv < 0) { setError("El inventario debe ser un número válido."); return; }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("insumos").insert({
      establecimiento_id: establecimientoId,
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      inventario: inv,
      unidad: form.unidad.trim(),
      minimo: parseFloat(form.minimo) || 0,
      emoji: form.emoji,
      created_by: user?.id ?? null,
    });
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:px-4" style={{ backgroundColor: "rgba(26,26,24,0.45)" }} onClick={onClose}>
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 20px 60px rgba(26,26,24,0.18)", border: "1px solid rgba(212,197,169,0.5)", ...dragStyle }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" onMouseDown={onDragStart} style={{ cursor: "grab" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Nuevo Insumo</h2>
          <button onClick={onClose} onMouseDown={(e) => e.stopPropagation()} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Categoría */}
          <div>
            <label className="form-label">Categoría</label>
            <select value={form.categoria} onChange={(e) => { set("categoria")(e.target.value); set("emoji")(EMOJI_OPTIONS[e.target.value as Categoria]?.[0] ?? "📦"); }}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="form-label">Nombre</label>
            <input type="text" value={form.nombre} onChange={(e) => set("nombre")(e.target.value)} placeholder="Ej: Sal mineral"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="form-label">Ícono</label>
            <div className="flex gap-2">
              {emojis.map((em) => (
                <button key={em} type="button" onClick={() => set("emoji")(em)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                  style={{ border: `2px solid ${form.emoji === em ? "var(--color-campo)" : "rgba(212,197,169,0.5)"}`, backgroundColor: form.emoji === em ? "rgba(58,74,50,0.07)" : "transparent" }}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Inventario + Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Inventario actual</label>
              <input type="number" min="0" step="0.01" value={form.inventario} onChange={(e) => set("inventario")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="form-label">Unidad</label>
              <input type="text" value={form.unidad} onChange={(e) => set("unidad")(e.target.value)} placeholder="kg, L, u, rol..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Mínimo */}
          <div>
            <label className="form-label">
              Stock mínimo <span style={{ color: "rgba(26,26,24,0.35)", fontWeight: 400 }}>(alerta)</span>
            </label>
            <input type="number" min="0" step="0.01" value={form.minimo} onChange={(e) => set("minimo")(e.target.value)} placeholder="0"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
            />
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

export default function InsumosPage() {
  const [search, setSearch] = useState("");
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [ajustes, setAjustes] = useState<Record<string, number>>({});
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: estab } = await supabase.from("establecimientos").select("id, nombre").limit(1).single();
    if (!estab) return;
    setEstablecimientoId(estab.id);
    setEstablecimientoNombre(estab.nombre ?? "");
    const { data } = await supabase.from("insumos").select("*").eq("establecimiento_id", estab.id).order("categoria").order("nombre");
    setInsumos(data ?? []);

    const ids = [...new Set((data ?? []).map((r) => r.created_by).filter(Boolean))] as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => { map[p.id] = p.full_name || p.email || "—"; });
      setProfilesMap(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function applyAjuste(insumo: Insumo, delta: number) {
    const newVal = Math.max(0, insumo.inventario + delta);
    const supabase = createClient();
    await supabase.from("insumos").update({ inventario: newVal }).eq("id", insumo.id);
    setInsumos((prev) => prev.map((i) => i.id === insumo.id ? { ...i, inventario: newVal } : i));
    setAjustes((prev) => ({ ...prev, [insumo.id]: 0 }));
  }

  const filtered = search
    ? insumos.filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()) || i.categoria.toLowerCase().includes(search.toLowerCase()))
    : insumos;

  const categoriasConDatos = CATEGORIAS.filter((cat) => filtered.some((i) => i.categoria === cat));

  function exportar() {
    const rows = filtered.map((i) => ({
      "Producto": i.nombre,
      "Categoría": i.categoria,
      "Inventario": i.inventario,
      "Unidad": i.unidad,
      "Mínimo": i.minimo,
      "Stock Crítico": i.inventario <= i.minimo ? "Sí" : "No",
    }));
    const slug = slugifyName(establecimientoNombre);
    exportToExcel(rows, "Insumos", `${slug}_Insumos_${todayISO()}.xlsx`);
  }

  async function handleImport(validRows: Record<string, unknown>[]) {
    if (!establecimientoId) throw new Error("No se encontró el establecimiento.");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const toInsert = validRows.map((r) => {
      const categoria = String(r["Categoría"]).trim();
      return {
        establecimiento_id: establecimientoId,
        nombre: String(r["Producto"]).trim(),
        categoria,
        inventario: Number(r["Inventario"]),
        unidad: String(r["Unidad"]).trim(),
        minimo: Number(r["Mínimo"] ?? r["Minimo"] ?? 0),
        emoji: CAT_DEFAULT_EMOJI[categoria] ?? "📦",
        created_by: user?.id ?? null,
      };
    });
    const { error } = await supabase.from("insumos").insert(toInsert);
    if (error) throw new Error(error.message);
    fetchData();
  }

  return (
    <>
      {showModal && establecimientoId && (
        <NuevoInsumoModal establecimientoId={establecimientoId} onClose={() => setShowModal(false)} onCreated={fetchData} />
      )}
      {auditId && <AuditDrawer tabla="insumos" registroId={auditId} onClose={() => setAuditId(null)} />}
      {showImportModal && (
        <ImportModal
          title="Importar Insumos"
          columns={INSUMOS_COLUMNS}
          templateFilename="Plantilla_Insumos.xlsx"
          templateExample={INSUMOS_TEMPLATE}
          validateRow={validateInsumoRow}
          onConfirm={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      <div className="flex flex-col min-h-full">
        <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Gestión</p>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Insumos</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(26,26,24,0.35)" }} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar insumo..."
                  className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)", width: 220 }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              {!loading && (
                <button onClick={() => setShowImportModal(true)} className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>
                  <Upload size={15} strokeWidth={2} />Importar
                </button>
              )}
              {!loading && insumos.length > 0 && (
                <button onClick={exportar} className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>
                  <Download size={15} strokeWidth={2} />Exportar
                </button>
              )}
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--color-campo)" }}>
                <Plus size={16} strokeWidth={2.5} /><span className="hidden sm:inline">Nuevo Insumo</span><span className="sm:hidden">Nuevo</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} />
            </div>
          ) : categoriasConDatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(58,74,50,0.08)" }}>
                <Package size={28} style={{ color: "var(--color-campo)" }} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                {search ? "Sin resultados" : "Sin insumos"}
              </h3>
              <p className="text-sm mb-6" style={{ color: "rgba(26,26,24,0.45)" }}>
                {search ? `No encontramos "${search}"` : "Agregá tu primer insumo para empezar a controlar el stock."}
              </p>
              {!search && (
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
                  <Plus size={16} />Nuevo Insumo
                </button>
              )}
            </div>
          ) : (
            categoriasConDatos.map((cat) => {
              const insumosCat = filtered.filter((i) => i.categoria === cat);
              const style = CAT_STYLE[cat];
              return (
                <div key={cat} className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                  <div className="px-6 py-3 flex items-center gap-3" style={{ backgroundColor: style.headerBg, borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                    <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full" style={{ backgroundColor: style.bg, color: style.color }}>{cat}</span>
                    <span className="text-xs" style={{ color: "rgba(26,26,24,0.38)" }}>{insumosCat.length} {insumosCat.length === 1 ? "producto" : "productos"}</span>
                  </div>
                  <div className="table-wrap">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.3)" }}>
                        {[
                          { label: "Producto",        width: "w-[22%]", hide: false },
                          { label: "Inventario",      width: "w-[18%]", hide: false },
                          { label: "Mínimo",          width: "w-[10%]", hide: false },
                          { label: "Registrar",       width: "w-[16%]", hide: false },
                          { label: "Registrado por",  width: "w-[20%]", hide: true  },
                          { label: "Acciones",        width: "w-[14%]", hide: false },
                        ].map(({ label, width, hide }) => (
                          <th key={label} className={`${width} px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase${hide ? " col-mobile-hidden" : ""}`} style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.3)" }}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {insumosCat.map((ins, idx) => {
                        const isCritical = ins.inventario <= ins.minimo;
                        const adj = ajustes[ins.id] ?? 0;
                        return (
                          <tr key={ins.id}
                            style={{ borderBottom: idx < insumosCat.length - 1 ? "1px solid rgba(212,197,169,0.22)" : "none" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(240,237,230,0.35)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{ins.emoji}</span>
                                <div>
                                  <p className="text-sm font-medium" style={{ color: "var(--color-tierra)" }}>{ins.nombre}</p>
                                  {isCritical && <span className="text-[10px] font-medium" style={{ color: "#dc2626" }}>⚠ Stock bajo mínimo</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1.5">
                                <p className="text-sm font-bold tabular-nums" style={{ color: isCritical ? "#dc2626" : "var(--color-tierra)" }}>
                                  {Number(ins.inventario).toLocaleString("es-AR")} <span className="font-normal text-xs" style={{ color: "rgba(26,26,24,0.38)" }}>{ins.unidad}</span>
                                </p>
                                <StockBar inventario={ins.inventario} minimo={ins.minimo} maximo={Math.max(ins.inventario * 1.5, ins.minimo * 3, 1)} />
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm tabular-nums" style={{ color: "rgba(26,26,24,0.5)" }}>
                              {Number(ins.minimo).toLocaleString("es-AR")} {ins.unidad}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setAjustes((p) => ({ ...p, [ins.id]: (p[ins.id] ?? 0) - 1 }))}
                                  className="w-6 h-6 rounded-md flex items-center justify-center"
                                  style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                                  <Minus size={11} strokeWidth={2.5} />
                                </button>
                                <span className="text-sm font-semibold tabular-nums w-8 text-center" style={{ color: adj !== 0 ? (adj > 0 ? "#16a34a" : "#dc2626") : "rgba(26,26,24,0.4)" }}>
                                  {adj > 0 ? `+${adj}` : adj === 0 ? "0" : adj}
                                </span>
                                <button onClick={() => setAjustes((p) => ({ ...p, [ins.id]: (p[ins.id] ?? 0) + 1 }))}
                                  className="w-6 h-6 rounded-md flex items-center justify-center"
                                  style={{ backgroundColor: "rgba(22,163,74,0.09)", color: "#16a34a" }}>
                                  <Plus size={11} strokeWidth={2.5} />
                                </button>
                                {adj !== 0 && (
                                  <button onClick={() => applyAjuste(ins, adj)}
                                    className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                                    style={{ backgroundColor: "rgba(58,74,50,0.08)", color: "var(--color-campo)" }}>
                                    OK
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm col-mobile-hidden" style={{ color: "rgba(26,26,24,0.5)" }}>
                              {ins.created_by ? (profilesMap[ins.created_by] ?? "—") : "—"}
                            </td>
                            <td className="px-5 py-4">
                              <div className="relative inline-block">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ins.id ? null : ins.id); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                                  style={{ color: "rgba(26,26,24,0.3)", backgroundColor: "transparent" }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-tierra)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(26,26,24,0.3)"; }}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {openMenuId === ins.id && (
                                  <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-1"
                                    style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 20px rgba(26,26,24,0.14)", border: "1px solid rgba(212,197,169,0.5)", minWidth: 140 }}>
                                    <button onClick={(e) => { e.stopPropagation(); setAuditId(ins.id); setOpenMenuId(null); }}
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
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
