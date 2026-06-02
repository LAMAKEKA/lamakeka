"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, MoreHorizontal, Beef, X, Loader2, AlertCircle, Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { exportToExcel, todayISO, slugifyName, parseXlsxDate } from "@/lib/exportExcel";
import { ImportModal } from "@/components/import-modal";

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
}

type TipoMovimiento = "Ingreso" | "Venta" | "Muerte" | "Transferencia salida";

const TIPOS_MOVIMIENTO: TipoMovimiento[] = ["Ingreso", "Venta", "Muerte", "Transferencia salida"];

const TIPO_COLORS: Record<TipoMovimiento, { bg: string; color: string }> = {
  "Ingreso":              { bg: "rgba(22,163,74,0.09)",   color: "#16a34a" },
  "Venta":                { bg: "rgba(37,99,235,0.09)",    color: "#2563eb" },
  "Muerte":               { bg: "rgba(220,38,38,0.07)",    color: "#dc2626" },
  "Transferencia salida": { bg: "rgba(107,114,128,0.12)",  color: "#6b7280" },
};

const CATEGORIAS = ["Terneros", "Novillos", "Vacas", "Vaquillonas", "Toros"] as const;

const CATEGORIA_COLORS: Record<string, { bg: string; color: string }> = {
  Terneros:    { bg: "rgba(37,99,235,0.08)",   color: "#2563eb" },
  Novillos:    { bg: "rgba(58,74,50,0.10)",    color: "var(--color-campo)" },
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
  if (!(CATEGORIAS as readonly string[]).includes(categoria))
    errors.push(`Categoría inválida: "${categoria}"`);
  const potrero = String(raw["Potrero"] ?? "").trim();
  if (!potrero) errors.push("Potrero vacío");
  const cantidad = Number(raw["Cantidad"]);
  if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad))
    errors.push("Cantidad inválida");
  const fecha = parseXlsxDate(raw["Fecha"]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push("Fecha inválida (usar YYYY-MM-DD)");
  const responsable = String(raw["Responsable"] ?? "").trim();
  if (!responsable) errors.push("Responsable vacío");
  return { errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoriaChip({ categoria }: { categoria: string }) {
  const style = CATEGORIA_COLORS[categoria] ?? { bg: "rgba(212,197,169,0.3)", color: "var(--color-cuero)" };
  return (
    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: style.bg, color: style.color }}>
      {categoria}
    </span>
  );
}

function TipoChip({ tipo }: { tipo: string }) {
  const style = TIPO_COLORS[tipo as TipoMovimiento] ?? { bg: "rgba(212,197,169,0.3)", color: "var(--color-cuero)" };
  return (
    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: style.bg, color: style.color }}>
      {tipo}
    </span>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(58,74,50,0.08)" }}>
        <Beef size={28} style={{ color: "var(--color-campo)" }} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Sin registros
      </h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "rgba(26,26,24,0.45)" }}>
        Todavía no cargaste ningún dato de hacienda. Empezá registrando tu primer lote.
      </p>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
        <Plus size={16} />
        Nuevo Dato
      </button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  establecimientoId: string;
  onClose: () => void;
  onCreated: () => void;
}

function NuevoAnimalModal({ establecimientoId, onClose, onCreated }: ModalProps) {
  const [form, setForm] = useState(FORM_EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof FORM_EMPTY) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.potrero.trim() || !form.responsable.trim()) {
      setError("Completá todos los campos.");
      return;
    }
    const cant = parseInt(form.cantidad);
    if (isNaN(cant) || cant <= 0) {
      setError("La cantidad debe ser un número mayor a 0.");
      return;
    }

    let montoVenta: number | null = null;
    if (form.tipo === "Venta") {
      montoVenta = parseFloat(form.monto_venta);
      if (isNaN(montoVenta) || montoVenta <= 0) {
        setError("Ingresá el monto total de la venta.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

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

    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(26,26,24,0.45)" }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 20px 60px rgba(26,26,24,0.18)", border: "1px solid rgba(212,197,169,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
            Nuevo Dato de Hacienda
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tipo de movimiento */}
          <div>
            <label className="form-label">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_MOVIMIENTO.map((t) => {
                const isSelected = form.tipo === t;
                const style = TIPO_COLORS[t];
                return (
                  <button key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, tipo: t, monto_venta: "" }))}
                    className="py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: isSelected ? style.bg : "transparent",
                      color: isSelected ? style.color : "rgba(26,26,24,0.4)",
                      border: `1.5px solid ${isSelected ? style.color : "rgba(212,197,169,0.6)"}`,
                    }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="form-label">Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => set("categoria")(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; }}
            >
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Potrero */}
          <div>
            <label className="form-label">Potrero</label>
            <input
              type="text"
              value={form.potrero}
              onChange={(e) => set("potrero")(e.target.value)}
              placeholder="Ej: Potrero Norte"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Cantidad + Fecha en row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Cantidad</label>
              <input
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(e) => set("cantidad")(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="form-label">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => set("fecha")(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Responsable */}
          <div>
            <label className="form-label">Responsable</label>
            <input
              type="text"
              value={form.responsable}
              onChange={(e) => set("responsable")(e.target.value)}
              placeholder="Nombre del responsable"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Monto venta — solo si tipo = Venta */}
          {form.tipo === "Venta" && (
            <div>
              <label className="form-label">Monto total de la venta (ARS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monto_venta}
                onChange={(e) => set("monto_venta")(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid #2563eb", backgroundColor: "rgba(37,99,235,0.04)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                onBlur={(e) => { e.target.style.boxShadow = "none"; }}
              />
              <p className="text-xs mt-1.5" style={{ color: "rgba(37,99,235,0.7)" }}>
                Se registrará automáticamente como ingreso en Finanzas.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>
              Cancelar
            </button>
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

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const displayName = (user.user_metadata?.nombre && user.user_metadata?.apellido)
      ? `${user.user_metadata.nombre} ${user.user_metadata.apellido}`
      : user.email ?? "";
    setUserName(displayName);

    const { data: estab } = await supabase
      .from("establecimientos")
      .select("id, nombre")
      .eq("user_id", user.id)
      .single();

    if (!estab) return;
    setEstablecimientoId(estab.id);
    setEstablecimientoNombre(estab.nombre ?? "");

    const { data } = await supabase
      .from("animales")
      .select("id, categoria, potrero, cantidad, fecha, responsable, tipo, created_by")
      .eq("establecimiento_id", estab.id)
      .order("created_at", { ascending: false });

    setAnimales(data ?? []);

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

  const baseData = activeTab === "mis-datos"
    ? animales.filter((r) => r.responsable.toLowerCase().includes(userName.split(" ")[0].toLowerCase()))
    : animales;

  const filtered = search
    ? baseData.filter((r) =>
        r.categoria.toLowerCase().includes(search.toLowerCase()) ||
        r.potrero.toLowerCase().includes(search.toLowerCase()) ||
        r.responsable.toLowerCase().includes(search.toLowerCase())
      )
    : baseData;

  const totalCabezas = filtered.reduce((s, r) => s + r.cantidad, 0);

  function exportar() {
    const rows = filtered.map((a) => ({
      "Categoría": a.categoria,
      "Potrero": a.potrero,
      "Cantidad": a.cantidad,
      "Fecha": fmtFecha(a.fecha),
      "Responsable": a.responsable,
    }));
    const slug = slugifyName(establecimientoNombre);
    exportToExcel(rows, "Hacienda", `${slug}_Hacienda_${todayISO()}.xlsx`);
  }

  async function handleImport(validRows: Record<string, unknown>[]) {
    if (!establecimientoId) throw new Error("No se encontró el establecimiento.");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const toInsert = validRows.map((r) => ({
      establecimiento_id: establecimientoId,
      categoria: String(r["Categoría"]).trim(),
      potrero: String(r["Potrero"]).trim(),
      cantidad: Number(r["Cantidad"]),
      fecha: parseXlsxDate(r["Fecha"]),
      responsable: String(r["Responsable"]).trim(),
      created_by: user?.id ?? null,
    }));
    const { error } = await supabase.from("animales").insert(toInsert);
    if (error) throw new Error(error.message);
    fetchData();
  }

  return (
    <>
      {showModal && establecimientoId && (
        <NuevoAnimalModal
          establecimientoId={establecimientoId}
          onClose={() => setShowModal(false)}
          onCreated={fetchData}
        />
      )}
      {showImportModal && (
        <ImportModal
          title="Importar Hacienda"
          columns={HACIENDA_COLUMNS}
          templateFilename="Plantilla_Hacienda.xlsx"
          templateExample={HACIENDA_TEMPLATE}
          validateRow={validateHaciendaRow}
          onConfirm={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Gestión</p>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Animales</h1>
            </div>
            <div className="flex items-center gap-2">
              {!loading && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}
                >
                  <Upload size={15} strokeWidth={2} />
                  Importar
                </button>
              )}
              {!loading && animales.length > 0 && (
                <button
                  onClick={exportar}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}
                >
                  <Download size={15} strokeWidth={2} />
                  Exportar
                </button>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: "var(--color-campo)" }}
              >
                <Plus size={16} strokeWidth={2.5} />
                Nuevo Dato
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6">
          {/* Tabs + Search */}
          <div className="flex items-center justify-between gap-4">
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
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por categoría, potrero..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "#ffffff", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {!loading && filtered.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0" style={{ backgroundColor: "rgba(58,74,50,0.08)", color: "var(--color-campo)" }}>
                <Beef size={15} strokeWidth={1.8} />
                <span>{totalCabezas.toLocaleString("es-AR")} cabezas</span>
              </div>
            )}
          </div>

          {/* Table card */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 3px rgba(26,26,24,0.06), 0 1px 2px rgba(26,26,24,0.04)", border: "1px solid rgba(212,197,169,0.5)" }}>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={() => setShowModal(true)} />
            ) : (
              <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                    {["Tipo", "Categoría", "Potrero", "Cantidad", "Fecha", "Responsable", "Registrado por", ""].map((col) => (
                      <th key={col} className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.5)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr key={row.id}
                      style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(212,197,169,0.25)" : "none" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(240,237,230,0.4)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}
                    >
                      <td className="px-6 py-4"><TipoChip tipo={row.tipo ?? "Ingreso"} /></td>
                      <td className="px-6 py-4"><CategoriaChip categoria={row.categoria} /></td>
                      <td className="px-6 py-4 text-sm font-medium" style={{ color: "var(--color-tierra)" }}>{row.potrero}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-campo)" }}>{row.cantidad.toLocaleString("es-AR")}</span>
                        <span className="text-xs ml-1" style={{ color: "rgba(26,26,24,0.35)" }}>cab.</span>
                      </td>
                      <td className="px-6 py-4 text-sm tabular-nums" style={{ color: "rgba(26,26,24,0.55)" }}>{fmtFecha(row.fecha)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ backgroundColor: "var(--color-cuero)" }}>
                            {row.responsable.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-sm" style={{ color: "var(--color-tierra)" }}>{row.responsable}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "rgba(26,26,24,0.5)" }}>
                        {row.created_by ? (profilesMap[row.created_by] ?? "—") : "—"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center ml-auto" style={{ color: "rgba(26,26,24,0.3)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-tierra)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(26,26,24,0.3)"; }}>
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {!loading && filtered.length > 0 && (
            <p className="text-xs" style={{ color: "rgba(26,26,24,0.35)" }}>
              {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · {totalCabezas.toLocaleString("es-AR")} cabezas totales
            </p>
          )}
        </div>
      </div>
    </>
  );
}
