"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sprout,
  Loader2,
  Plus,
  X,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/hooks/useTenant";

type LoteEstado = "planificado" | "en_curso" | "cosechado" | "descanso";

interface LoteAgricola {
  id: string;
  nombre: string;
  cultivo: string | null;
  hectareas: number | null;
  estado: LoteEstado;
  fecha_siembra: string | null;
  notas: string | null;
}

const ESTADO_STYLE: Record<
  LoteEstado,
  { bg: string; color: string; label: string }
> = {
  planificado: {
    bg: "rgba(37,99,235,0.08)",
    color: "#2563eb",
    label: "Planificado",
  },
  en_curso: {
    bg: "rgba(22,163,74,0.09)",
    color: "#16a34a",
    label: "En curso",
  },
  cosechado: {
    bg: "rgba(139,78,42,0.10)",
    color: "var(--color-cuero)",
    label: "Cosechado",
  },
  descanso: {
    bg: "rgba(217,119,6,0.10)",
    color: "#d97706",
    label: "Descanso",
  },
};

const FORM_EMPTY = {
  nombre: "",
  cultivo: "",
  hectareas: "",
  estado: "planificado" as LoteEstado,
  fecha_siembra: "",
  notas: "",
};

export default function AgricolaPage() {
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useTenant();
  const enabled = tenant?.modulesEnabled?.includes("agricola") ?? false;

  const [lotes, setLotes] = useState<LoteAgricola[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabId, setEstabId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  useEffect(() => {
    if (tenantLoading) return;
    if (!enabled) router.replace("/");
  }, [tenantLoading, enabled, router]);

  const fetchLotes = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: estab } = await supabase
      .from("establecimientos")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (!estab) {
      setLoading(false);
      return;
    }
    setEstabId(estab.id);

    const { data, error: qErr } = await supabase
      .from("lotes_agricolas")
      .select("id, nombre, cultivo, hectareas, estado, fecha_siembra, notas")
      .eq("establecimiento_id", estab.id)
      .order("created_at", { ascending: false });

    if (qErr) {
      // tabla aún no en cloud
      if (
        qErr.message?.includes("lotes_agricolas") ||
        qErr.code === "42P01" ||
        qErr.code === "PGRST205"
      ) {
        setSchemaMissing(true);
        setLotes([]);
      } else {
        console.error("[agricola]", qErr.message);
      }
    } else {
      setSchemaMissing(false);
      setLotes((data ?? []) as LoteAgricola[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled || tenantLoading) return;
    fetchLotes();
  }, [enabled, tenantLoading, fetchLotes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!estabId) return;
    setSaving(true);
    setError(null);

    const ha =
      form.hectareas.trim() === ""
        ? null
        : Number(form.hectareas.replace(",", "."));
    if (ha != null && (Number.isNaN(ha) || ha < 0)) {
      setError("Hectáreas inválidas.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error: insErr } = await supabase.from("lotes_agricolas").insert({
      establecimiento_id: estabId,
      nombre: form.nombre.trim(),
      cultivo: form.cultivo.trim() || null,
      hectareas: ha,
      estado: form.estado,
      fecha_siembra: form.fecha_siembra || null,
      notas: form.notas.trim() || null,
    });

    if (insErr) {
      setError(
        schemaMissing
          ? "Falta migrar lotes_agricolas en cloud (SQL Editor)."
          : insErr.message
      );
      setSaving(false);
      return;
    }

    setForm(FORM_EMPTY);
    setShowModal(false);
    setSaving(false);
    await fetchLotes();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Borrar este lote?")) return;
    const supabase = createClient();
    await supabase.from("lotes_agricolas").delete().eq("id", id);
    await fetchLotes();
  }

  if (tenantLoading || !enabled || loading) {
    return (
      <div className="page-pad flex items-center justify-center min-h-[40vh]">
        <Loader2
          className="animate-spin"
          style={{ color: "var(--color-campo)" }}
        />
      </div>
    );
  }

  return (
    <div className="page-pad max-w-3xl mx-auto py-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sprout size={22} style={{ color: "var(--color-campo)" }} />
            <h1
              className="text-xl font-bold"
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                color: "var(--color-tierra)",
              }}
            >
              Agrícola
            </h1>
          </div>
          <p className="text-sm" style={{ color: "rgba(26,26,24,0.5)" }}>
            {tenant?.nombreDisplay ?? "Campo"} · lotes y cultivos (MVP)
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          disabled={schemaMissing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold min-h-12"
          style={{
            backgroundColor: "var(--color-campo)",
            color: "#fff",
            opacity: schemaMissing ? 0.5 : 1,
          }}
        >
          <Plus size={16} />
          Nuevo lote
        </button>
      </div>

      {schemaMissing && (
        <div
          className="flex gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: "rgba(217,119,6,0.1)",
            color: "#b45309",
            border: "1px solid rgba(217,119,6,0.25)",
          }}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          Falta aplicar la migración `lotes_agricolas` en Supabase cloud. SQL en
          repo: `20261013030000_lotes_agricolas.sql`.
        </div>
      )}

      {lotes.length === 0 && !schemaMissing ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{
            backgroundColor: "#fff",
            borderColor: "rgba(212,197,169,0.5)",
          }}
        >
          <p className="text-sm" style={{ color: "rgba(26,26,24,0.45)" }}>
            Todavía no hay lotes. Cargá el primero.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lotes.map((l) => {
            const st = ESTADO_STYLE[l.estado] ?? ESTADO_STYLE.planificado;
            return (
              <li
                key={l.id}
                className="rounded-2xl border p-4 flex items-start justify-between gap-3"
                style={{
                  backgroundColor: "#fff",
                  borderColor: "rgba(212,197,169,0.5)",
                }}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="font-semibold"
                      style={{ color: "var(--color-tierra)" }}
                    >
                      {l.nombre}
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "rgba(26,26,24,0.55)" }}>
                    {[l.cultivo, l.hectareas != null ? `${l.hectareas} ha` : null]
                      .filter(Boolean)
                      .join(" · ") || "Sin cultivo / ha"}
                  </p>
                  {l.notas && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: "rgba(26,26,24,0.4)" }}
                    >
                      {l.notas}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(l.id)}
                  className="p-2 rounded-lg min-h-12 min-w-12 flex items-center justify-center"
                  style={{ color: "#dc2626" }}
                  aria-label="Borrar lote"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: "rgba(26,26,24,0.45)" }}
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--color-tierra)" }}
              >
                Nuevo lote
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 min-h-12 min-w-12"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <Field
                label="Nombre"
                value={form.nombre}
                onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
                required
              />
              <Field
                label="Cultivo"
                value={form.cultivo}
                onChange={(v) => setForm((f) => ({ ...f, cultivo: v }))}
                placeholder="Soja, maíz…"
              />
              <Field
                label="Hectáreas"
                value={form.hectareas}
                onChange={(v) => setForm((f) => ({ ...f, hectareas: v }))}
                type="text"
                placeholder="12.5"
              />
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-tierra)" }}
                >
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estado: e.target.value as LoteEstado,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    border: "1.5px solid rgba(212,197,169,0.8)",
                    backgroundColor: "var(--color-pampa)",
                    color: "var(--color-tierra)",
                  }}
                >
                  {(Object.keys(ESTADO_STYLE) as LoteEstado[]).map((k) => (
                    <option key={k} value={k}>
                      {ESTADO_STYLE[k].label}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Fecha siembra"
                value={form.fecha_siembra}
                onChange={(v) => setForm((f) => ({ ...f, fecha_siembra: v }))}
                type="date"
              />
              <Field
                label="Notas"
                value={form.notas}
                onChange={(v) => setForm((f) => ({ ...f, notas: v }))}
              />
              {error && (
                <div
                  className="flex gap-2 text-sm px-3 py-2 rounded-xl"
                  style={{ color: "#dc2626", backgroundColor: "rgba(220,38,38,0.06)" }}
                >
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-12"
                style={{
                  backgroundColor: "var(--color-campo)",
                  color: "#fff",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Guardar"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: "var(--color-tierra)" }}
      >
        {label}
        {required && <span style={{ color: "var(--color-cuero)" }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
        style={{
          border: "1.5px solid rgba(212,197,169,0.8)",
          backgroundColor: "var(--color-pampa)",
          color: "var(--color-tierra)",
        }}
      />
    </div>
  );
}
