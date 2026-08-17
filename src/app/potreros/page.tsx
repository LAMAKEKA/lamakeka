"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Map, FileSpreadsheet, ImageIcon, Upload, MoreHorizontal, Beef, X, Loader2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const PotrerosMap = dynamic(() => import("@/components/map/potrero-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "rgba(240,237,230,0.4)" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-campo)" }} />
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Potrero {
  id: string;
  nombre: string;
  hectareas: number;
  estado: "activo" | "descanso" | "mantenimiento";
  cabezas: number;
  categoria_animal: string | null;
  desde: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface HistorialRow {
  id: string;
  potrero: string;
  evento: string;
  fecha: string;
  detalle: string;
  responsable: string;
}

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  activo:        { bg: "rgba(22,163,74,0.09)",  color: "#16a34a", label: "Activo" },
  descanso:      { bg: "rgba(217,119,6,0.10)",  color: "#d97706", label: "Descanso" },
  mantenimiento: { bg: "rgba(220,38,38,0.07)",  color: "#dc2626", label: "Mantenimiento" },
};

const TABS = [
  { key: "potreros", label: "Potreros" },
  { key: "historial", label: "Historial" },
  { key: "mapa", label: "Mapa" },
];

const CARGA_OPTIONS = [
  { icon: Plus,           iconBg: "rgba(58,74,50,0.10)",   iconColor: "var(--color-campo)", title: "Ingresar Manualmente", description: "Cargá los datos de tu potrero uno a uno" },
  { icon: FileSpreadsheet, iconBg: "rgba(37,99,235,0.08)", iconColor: "#2563eb",              title: "CSV o Excel",           description: "Importá desde una planilla existente" },
  { icon: Map,            iconBg: "rgba(139,78,42,0.10)",  iconColor: "var(--color-cuero)", title: "KMZ de Google Earth",   description: "Usá tu archivo de trazado de potreros" },
  { icon: ImageIcon,      iconBg: "rgba(217,119,6,0.10)",  iconColor: "#d97706",              title: "Imagen de croquis",    description: "Subí una foto o plano de tu campo" },
];

const FORM_EMPTY = {
  nombre: "",
  hectareas: "",
  estado: "activo" as Potrero["estado"],
  cabezas: "0",
  categoria_animal: "",
  desde: "",
  latitud: "",
  longitud: "",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  establecimientoId: string;
  onClose: () => void;
  onCreated: () => void;
  editData?: Potrero;
}

function NuevoPotreroModal({ establecimientoId, onClose, onCreated, editData }: ModalProps) {
  const [form, setForm] = useState(
    editData
      ? {
          nombre: editData.nombre,
          hectareas: String(editData.hectareas),
          estado: editData.estado,
          cabezas: String(editData.cabezas),
          categoria_animal: editData.categoria_animal ?? "",
          desde: editData.desde ?? "",
          latitud: editData.latitud != null ? String(editData.latitud) : "",
          longitud: editData.longitud != null ? String(editData.longitud) : "",
        }
      : FORM_EMPTY
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof FORM_EMPTY) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("Ingresá el nombre del potrero."); return; }
    const ha = parseFloat(form.hectareas);
    if (isNaN(ha) || ha <= 0) { setError("Las hectáreas deben ser un número mayor a 0."); return; }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      nombre: form.nombre.trim(),
      hectareas: ha,
      estado: form.estado,
      cabezas: parseInt(form.cabezas) || 0,
      categoria_animal: form.categoria_animal.trim() || null,
      desde: form.desde || null,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
    };
    if (editData) {
      const { error: dbError } = await supabase.from("potreros").update(payload).eq("id", editData.id);
      if (dbError) { setError(dbError.message); setLoading(false); return; }
    } else {
      const { error: dbError } = await supabase.from("potreros").insert({ establecimiento_id: establecimientoId, ...payload });
      if (dbError) { setError(dbError.message); setLoading(false); return; }
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(26,26,24,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 20px 60px rgba(26,26,24,0.18)", border: "1px solid rgba(212,197,169,0.5)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>{editData ? "Editar Potrero" : "Nuevo Potrero"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Nombre", field: "nombre", placeholder: "Ej: Potrero Norte", type: "text" },
            { label: "Hectáreas", field: "hectareas", placeholder: "Ej: 120", type: "number" },
          ].map(({ label, field, placeholder, type }) => (
            <div key={field}>
              <label className="form-label">{label}</label>
              <input type={type} value={form[field as keyof typeof FORM_EMPTY]} onChange={(e) => set(field as keyof typeof FORM_EMPTY)(e.target.value)} placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          ))}

          <div>
            <label className="form-label">Estado inicial</label>
            <select value={form.estado} onChange={(e) => set("estado")(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}>
              <option value="activo">Activo</option>
              <option value="descanso">Descanso</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Cabezas actuales</label>
              <input type="number" min="0" value={form.cabezas} onChange={(e) => set("cabezas")(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="form-label">Desde <span style={{ color: "rgba(26,26,24,0.35)", fontWeight: 400 }}>(opc.)</span></label>
              <input type="date" value={form.desde} onChange={(e) => set("desde")(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Ubicación GPS */}
          <div className="border-t pt-4" style={{ borderColor: "rgba(212,197,169,0.35)" }}>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,24,0.38)" }}>
              Ubicación GPS <span className="normal-case font-normal">(opcional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Latitud",  field: "latitud",  placeholder: "-38.1234" },
                { label: "Longitud", field: "longitud", placeholder: "-63.4567" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="form-label">{label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form[field as keyof typeof FORM_EMPTY]}
                    onChange={(e) => set(field as keyof typeof FORM_EMPTY)(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: "rgba(26,26,24,0.4)" }}>
              Google Maps: click derecho → &quot;¿Qué hay aquí?&quot;
            </p>
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyStatePotreros({ onManual }: { onManual: () => void }) {
  return (
    <div className="flex flex-col items-center py-10">
      <div className="w-full max-w-2xl rounded-2xl p-8 mb-6" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ backgroundColor: "rgba(58,74,50,0.08)" }}>
            <Map size={26} style={{ color: "var(--color-campo)" }} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Configurá tus potreros</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "rgba(26,26,24,0.45)" }}>Elegí cómo querés cargar la información.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CARGA_OPTIONS.map(({ icon: Icon, iconBg, iconColor, title, description }, i) => (
            <button key={title} onClick={i === 0 ? onManual : undefined}
              className="flex items-start gap-4 p-4 rounded-xl text-left transition-all"
              style={{ border: "1.5px solid rgba(212,197,169,0.5)", backgroundColor: "transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-campo)"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(58,74,50,0.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,197,169,0.5)"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                <Icon size={18} style={{ color: iconColor }} strokeWidth={1.7} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--color-tierra)" }}>{title}</p>
                <p className="text-xs" style={{ color: "rgba(26,26,24,0.45)" }}>{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="w-full max-w-2xl rounded-2xl p-8 flex flex-col items-center border-2 border-dashed" style={{ borderColor: "rgba(212,197,169,0.6)", backgroundColor: "rgba(240,237,230,0.3)" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "rgba(212,197,169,0.3)" }}>
          <Upload size={20} style={{ color: "var(--color-cuero)" }} strokeWidth={1.6} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "rgba(26,26,24,0.55)" }}>Arrastrá un archivo acá</p>
        <p className="text-xs" style={{ color: "rgba(26,26,24,0.35)" }}>Soporta CSV, Excel, KMZ, JPG, PNG</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PotrerosPage() {
  const [activeTab, setActiveTab] = useState<"potreros" | "historial" | "mapa">("potreros");
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [loading, setLoading] = useState(true);
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editPotrero, setEditPotrero] = useState<Potrero | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function close() { setOpenMenuId(null); }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  // Navigate to mapa tab via URL: /potreros?tab=mapa
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "mapa") setActiveTab("mapa");
  }, []);

  // Historial placeholder (en futuro puede ser una tabla real)
  const HISTORIAL_MOCK: HistorialRow[] = potreros.map((p) => ({
    id: p.id,
    potrero: p.nombre,
    evento: "Ingreso",
    fecha: p.desde ?? "—",
    detalle: p.cabezas > 0 ? `${p.cabezas} cabezas` : "Sin animales",
    responsable: "—",
  }));

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: estab } = await supabase.from("establecimientos").select("id").limit(1).single();
    if (!estab) return;
    setEstablecimientoId(estab.id);

    const { data } = await supabase.from("potreros").select("*").eq("establecimiento_id", estab.id).order("created_at", { ascending: false });
    setPotreros(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalCabezas = potreros.reduce((s, p) => s + p.cabezas, 0);
  const totalHa = potreros.reduce((s, p) => s + Number(p.hectareas), 0);

  return (
    <>
      {showModal && establecimientoId && (
        <NuevoPotreroModal establecimientoId={establecimientoId} onClose={() => setShowModal(false)} onCreated={fetchData} />
      )}
      {editPotrero && establecimientoId && (
        <NuevoPotreroModal establecimientoId={establecimientoId} editData={editPotrero}
          onClose={() => setEditPotrero(null)} onCreated={fetchData} />
      )}

      <div className="flex flex-col min-h-full">
        <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Gestión</p>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Potreros</h1>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--color-campo)" }}>
              <Plus size={16} strokeWidth={2.5} />Nuevo Potrero
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-1 p-1 rounded-xl self-start" style={{ backgroundColor: "rgba(212,197,169,0.25)" }}>
            {TABS.map(({ key, label }) => {
              const isActive = activeTab === key;
              return (
                <button key={key} onClick={() => setActiveTab(key as "potreros" | "historial" | "mapa")}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: isActive ? "#ffffff" : "transparent", color: isActive ? "var(--color-tierra)" : "rgba(26,26,24,0.45)", boxShadow: isActive ? "0 1px 3px rgba(26,26,24,0.10)" : "none" }}>
                  {label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} />
            </div>
          ) : activeTab === "potreros" ? (
            potreros.length === 0 ? (
              <EmptyStatePotreros onManual={() => setShowModal(true)} />
            ) : (
              <div className="flex flex-col gap-4">
                {/* Summary */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(58,74,50,0.08)", color: "var(--color-campo)" }}>
                    <Map size={14} strokeWidth={1.8} /><span>{potreros.length} potreros</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(139,78,42,0.08)", color: "var(--color-cuero)" }}>
                    <span>{totalHa.toLocaleString("es-AR")} ha</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(37,99,235,0.07)", color: "#2563eb" }}>
                    <Beef size={14} strokeWidth={1.8} /><span>{totalCabezas.toLocaleString("es-AR")} cabezas</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {potreros.map((pot) => {
                    const estado = ESTADO_STYLE[pot.estado];
                    const ocupacion = pot.hectareas > 0 ? Math.round((pot.cabezas / pot.hectareas) * 10) / 10 : 0;
                    return (
                      <div key={pot.id} className="rounded-2xl p-5 flex flex-col gap-4 cursor-default"
                        style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-semibold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>{pot.nombre}</h3>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.38)" }}>{Number(pot.hectareas).toLocaleString("es-AR")} ha</p>
                          </div>
                          <div className="flex items-center gap-2 relative">
                            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: estado.bg, color: estado.color }}>{estado.label}</span>
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === pot.id ? null : pot.id); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ color: openMenuId === pot.id ? "var(--color-tierra)" : "rgba(26,26,24,0.3)", backgroundColor: openMenuId === pot.id ? "rgba(212,197,169,0.3)" : "transparent" }}
                              onMouseEnter={(e) => { if (openMenuId !== pot.id) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; } }}
                              onMouseLeave={(e) => { if (openMenuId !== pot.id) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; } }}>
                              <MoreHorizontal size={15} />
                            </button>
                            {openMenuId === pot.id && (
                              <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-1"
                                style={{ backgroundColor: "#ffffff", boxShadow: "0 4px 20px rgba(26,26,24,0.14)", border: "1px solid rgba(212,197,169,0.5)", minWidth: 148 }}>
                                <button onClick={(e) => { e.stopPropagation(); setEditPotrero(pot); setOpenMenuId(null); }}
                                  className="w-full px-4 py-2 text-sm text-left" style={{ color: "var(--color-tierra)" }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.2)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                                  Editar
                                </button>
                                <button onClick={async (e) => { e.stopPropagation(); setOpenMenuId(null); if (!confirm("¿Eliminar este potrero? Esta acción no se puede deshacer.")) return; await createClient().from("potreros").delete().eq("id", pot.id); await fetchData(); }}
                                  className="w-full px-4 py-2 text-sm text-left" style={{ color: "#dc2626" }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(220,38,38,0.06)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-xl font-bold" style={{ color: pot.cabezas > 0 ? "var(--color-campo)" : "rgba(26,26,24,0.2)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                              {pot.cabezas > 0 ? pot.cabezas.toLocaleString("es-AR") : "—"}
                            </p>
                            <p className="text-xs" style={{ color: "rgba(26,26,24,0.38)" }}>cabezas</p>
                          </div>
                          {pot.cabezas > 0 && (
                            <div>
                              <p className="text-xl font-bold" style={{ color: "var(--color-cuero)", fontFamily: "var(--font-playfair), Georgia, serif" }}>{ocupacion}</p>
                              <p className="text-xs" style={{ color: "rgba(26,26,24,0.38)" }}>cab/ha</p>
                            </div>
                          )}
                        </div>
                        {pot.categoria_animal && (
                          <div className="pt-1" style={{ borderTop: "1px solid rgba(212,197,169,0.3)" }}>
                            <p className="text-xs" style={{ color: "rgba(26,26,24,0.45)" }}>
                              <span className="font-medium" style={{ color: "var(--color-tierra)" }}>{pot.categoria_animal}</span>
                              {pot.desde && <> · desde {pot.desde.split("-").reverse().join("/")}</>}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : activeTab === "mapa" ? (
            /* Mapa tab */
            <div
              className="rounded-2xl overflow-hidden"
              style={{ height: "540px", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}
            >
              <PotrerosMap
                potreros={potreros.map((p) => ({
                  id: p.id,
                  nombre: p.nombre,
                  hectareas: p.hectareas,
                  cabezas: p.cabezas,
                  estado: p.estado,
                  latitud: p.latitud ?? null,
                  longitud: p.longitud ?? null,
                }))}
              />
            </div>
          ) : (
            /* Historial tab */
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
              {HISTORIAL_MOCK.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>Sin historial disponible.</p>
                </div>
              ) : (
                <div className="table-wrap">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                      {["Potrero", "Evento", "Fecha", "Detalle"].map((col) => (
                        <th key={col} className="px-6 py-3.5 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.5)" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HISTORIAL_MOCK.map((row, idx) => (
                      <tr key={row.id} style={{ borderBottom: idx < HISTORIAL_MOCK.length - 1 ? "1px solid rgba(212,197,169,0.25)" : "none" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(240,237,230,0.4)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}>
                        <td className="px-6 py-4 text-sm font-medium" style={{ color: "var(--color-tierra)" }}>{row.potrero}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(22,163,74,0.09)", color: "#16a34a" }}>{row.evento}</span>
                        </td>
                        <td className="px-6 py-4 text-sm tabular-nums" style={{ color: "rgba(26,26,24,0.55)" }}>{row.fecha !== "—" ? row.fecha.split("-").reverse().join("/") : "—"}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{row.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
