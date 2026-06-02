"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Check, ClipboardCheck, X, Loader2, AlertCircle, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { exportToExcel, todayISO, slugifyName } from "@/lib/exportExcel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  fecha_limite: string;
  responsable: string;
  completada: boolean;
  created_by: string | null;
}

const PRIORIDAD_STYLE = {
  alta:  { bg: "rgba(220,38,38,0.07)",  color: "#dc2626", label: "Alta"  },
  media: { bg: "rgba(217,119,6,0.10)",  color: "#d97706", label: "Media" },
  baja:  { bg: "rgba(22,163,74,0.08)",  color: "#16a34a", label: "Baja"  },
};

const TABS = [
  { key: "todas",     label: "Todas"     },
  { key: "mis-tareas", label: "Mis Tareas" },
];

const FORM_EMPTY = {
  titulo: "",
  descripcion: "",
  prioridad: "media" as Tarea["prioridad"],
  fecha_limite: new Date().toISOString().split("T")[0],
  responsable: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  establecimientoId: string;
  onClose: () => void;
  onCreated: () => void;
}

function NuevaTareaModal({ establecimientoId, onClose, onCreated }: ModalProps) {
  const [form, setForm] = useState(FORM_EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof FORM_EMPTY) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.responsable.trim()) { setError("Completá título y responsable."); return; }
    if (!form.fecha_limite) { setError("Ingresá una fecha límite."); return; }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("tareas").insert({
      establecimiento_id: establecimientoId,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      prioridad: form.prioridad,
      fecha_limite: form.fecha_limite,
      responsable: form.responsable.trim(),
      completada: false,
      created_by: user?.id ?? null,
    });
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(26,26,24,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 20px 60px rgba(26,26,24,0.18)", border: "1px solid rgba(212,197,169,0.5)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Nueva Tarea</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Título */}
          <div>
            <label className="form-label">Título</label>
            <input type="text" value={form.titulo} onChange={(e) => set("titulo")(e.target.value)} placeholder="Ej: Vacunación contra Aftosa"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="form-label">
              Descripción <span style={{ color: "rgba(26,26,24,0.35)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea value={form.descripcion} onChange={(e) => set("descripcion")(e.target.value)} placeholder="Detalles adicionales..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Prioridad */}
          <div>
            <label className="form-label">Prioridad</label>
            <div className="flex gap-2">
              {(["alta", "media", "baja"] as const).map((p) => {
                const st = PRIORIDAD_STYLE[p];
                const isActive = form.prioridad === p;
                return (
                  <button key={p} type="button" onClick={() => set("prioridad")(p)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: isActive ? st.bg : "transparent",
                      color: isActive ? st.color : "rgba(26,26,24,0.4)",
                      border: `1.5px solid ${isActive ? st.color : "rgba(212,197,169,0.6)"}`,
                    }}>
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha + Responsable */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Fecha límite</label>
              <input type="date" value={form.fecha_limite} onChange={(e) => set("fecha_limite")(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid rgba(212,197,169,0.8)", backgroundColor: "var(--color-pampa)", color: "var(--color-tierra)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="form-label">Responsable</label>
              <input type="text" value={form.responsable} onChange={(e) => set("responsable")(e.target.value)} placeholder="Nombre"
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

// ─── Tarea Row ────────────────────────────────────────────────────────────────

function TareaRow({ tarea, onToggle, creatorName }: { tarea: Tarea; onToggle: (id: string) => void; creatorName: string }) {
  const prioridad = PRIORIDAD_STYLE[tarea.prioridad];
  return (
    <div className="flex items-center gap-4 px-6 py-4" style={{ opacity: tarea.completada ? 0.65 : 1 }}>
      <button onClick={() => onToggle(tarea.id)}
        className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
        style={{ borderColor: tarea.completada ? "#16a34a" : "rgba(212,197,169,0.9)", backgroundColor: tarea.completada ? "#16a34a" : "transparent" }}>
        {tarea.completada && <Check size={11} strokeWidth={3} color="#ffffff" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug" style={{ color: "var(--color-tierra)", textDecoration: tarea.completada ? "line-through" : "none" }}>{tarea.titulo}</p>
        {tarea.descripcion && <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(26,26,24,0.45)" }}>{tarea.descripcion}</p>}
      </div>
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: prioridad.bg, color: prioridad.color }}>{prioridad.label}</span>
      <div className="text-right shrink-0" style={{ minWidth: 90 }}>
        <p className="text-xs font-medium tabular-nums" style={{ color: "rgba(26,26,24,0.55)" }}>{fmtFecha(tarea.fecha_limite)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0" style={{ minWidth: 148 }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ backgroundColor: "var(--color-cuero)" }}>
          {tarea.responsable.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <span className="text-sm" style={{ color: "var(--color-tierra)" }}>{tarea.responsable}</span>
      </div>
      <div className="shrink-0" style={{ minWidth: 140 }}>
        <span className="text-xs" style={{ color: "rgba(26,26,24,0.45)" }}>{creatorName}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TareasPage() {
  const [activeTab, setActiveTab] = useState<"todas" | "mis-tareas">("todas");
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [showModal, setShowModal] = useState(false);
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

    const { data: estab } = await supabase.from("establecimientos").select("id, nombre").eq("user_id", user.id).single();
    if (!estab) return;
    setEstablecimientoId(estab.id);
    setEstablecimientoNombre(estab.nombre ?? "");

    const { data } = await supabase.from("tareas").select("*").eq("establecimiento_id", estab.id).order("fecha_limite").order("created_at", { ascending: false });
    setTareas(data ?? []);

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

  async function toggleTarea(id: string) {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) return;
    const newVal = !tarea.completada;
    setTareas((prev) => prev.map((t) => t.id === id ? { ...t, completada: newVal } : t));
    const supabase = createClient();
    await supabase.from("tareas").update({ completada: newVal }).eq("id", id);
  }

  const base = activeTab === "mis-tareas"
    ? tareas.filter((t) => t.responsable.toLowerCase().includes(userName.split(" ")[0].toLowerCase()))
    : tareas;

  const pendientes = base.filter((t) => !t.completada);
  const completadas = base.filter((t) => t.completada);
  const total = base.length;
  const pct = total > 0 ? Math.round((completadas.length / total) * 100) : 0;

  function exportar() {
    const rows = base.map((t) => ({
      "Tarea": t.titulo,
      "Prioridad": t.prioridad.charAt(0).toUpperCase() + t.prioridad.slice(1),
      "Fecha Límite": fmtFecha(t.fecha_limite),
      "Responsable": t.responsable,
      "Estado": t.completada ? "Completada" : "Pendiente",
    }));
    const slug = slugifyName(establecimientoNombre);
    exportToExcel(rows, "Tareas", `${slug}_Tareas_${todayISO()}.xlsx`);
  }

  return (
    <>
      {showModal && establecimientoId && (
        <NuevaTareaModal establecimientoId={establecimientoId} onClose={() => setShowModal(false)} onCreated={fetchData} />
      )}

      <div className="flex flex-col min-h-full">
        <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Gestión</p>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Tareas</h1>
            </div>
            <div className="flex items-center gap-3">
              {!loading && tareas.length > 0 && (
                <button onClick={exportar} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>
                  <Download size={15} strokeWidth={2} />Exportar
                </button>
              )}
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--color-campo)" }}>
                <Plus size={16} strokeWidth={2.5} />Nueva Tarea
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6">
          {/* Tabs + Progress */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: "rgba(212,197,169,0.25)" }}>
              {TABS.map(({ key, label }) => {
                const isActive = activeTab === key;
                return (
                  <button key={key} onClick={() => setActiveTab(key as "todas" | "mis-tareas")}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{ backgroundColor: isActive ? "#ffffff" : "transparent", color: isActive ? "var(--color-tierra)" : "rgba(26,26,24,0.45)", boxShadow: isActive ? "0 1px 3px rgba(26,26,24,0.10)" : "none" }}>
                    {label}
                  </button>
                );
              })}
            </div>
            {!loading && total > 0 && (
              <div className="flex-1 max-w-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>{completadas.length} de {total} completadas</span>
                  <span className="text-xs font-bold" style={{ color: pct >= 80 ? "#16a34a" : pct >= 40 ? "#d97706" : "var(--color-cuero)" }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(212,197,169,0.4)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#16a34a" : pct >= 40 ? "#d97706" : "var(--color-cuero)" }} />
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} />
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(58,74,50,0.08)" }}>
                <ClipboardCheck size={28} style={{ color: "var(--color-campo)" }} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Sin tareas</h3>
              <p className="text-sm mb-6" style={{ color: "rgba(26,26,24,0.45)" }}>No hay tareas asignadas todavía. Creá la primera.</p>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
                <Plus size={16} />Nueva Tarea
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendientes.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                  <div className="px-6 py-3.5 flex items-center justify-between border-b"
                    style={{ borderColor: "rgba(212,197,169,0.35)", backgroundColor: "rgba(254,243,199,0.45)" }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#d97706" }} />
                      <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#b45309" }}>Pendientes</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(217,119,6,0.12)", color: "#b45309" }}>{pendientes.length}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(26,26,24,0.35)" }}>
                      <span style={{ minWidth: 60, textAlign: "right" }}>Prioridad</span>
                      <span style={{ minWidth: 90, textAlign: "right" }}>Fecha límite</span>
                      <span style={{ minWidth: 148 }}>Responsable</span>
                      <span style={{ minWidth: 140 }}>Registrado por</span>
                    </div>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(212,197,169,0.25)" }}>
                    {pendientes.map((t) => <TareaRow key={t.id} tarea={t} onToggle={toggleTarea} creatorName={t.created_by ? (profilesMap[t.created_by] ?? "—") : "—"} />)}
                  </div>
                </div>
              )}

              {completadas.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)", boxShadow: "0 1px 3px rgba(26,26,24,0.06)" }}>
                  <div className="px-6 py-3.5 flex items-center justify-between border-b"
                    style={{ borderColor: "rgba(212,197,169,0.35)", backgroundColor: "rgba(220,252,231,0.4)" }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#16a34a" }} />
                      <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#15803d" }}>Completadas</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(22,163,74,0.12)", color: "#15803d" }}>{completadas.length}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(26,26,24,0.35)" }}>
                      <span style={{ minWidth: 60, textAlign: "right" }}>Prioridad</span>
                      <span style={{ minWidth: 90, textAlign: "right" }}>Fecha límite</span>
                      <span style={{ minWidth: 148 }}>Responsable</span>
                      <span style={{ minWidth: 140 }}>Registrado por</span>
                    </div>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(212,197,169,0.25)" }}>
                    {completadas.map((t) => <TareaRow key={t.id} tarea={t} onToggle={toggleTarea} creatorName={t.created_by ? (profilesMap[t.created_by] ?? "—") : "—"} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
