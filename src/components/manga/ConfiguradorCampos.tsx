"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useCamposConfig, type MangaCampo, type TipoCampo } from "@/hooks/useCamposConfig";

const TIPOS: { value: TipoCampo; label: string }[] = [
  { value: "numero",     label: "Número" },
  { value: "texto",      label: "Texto" },
  { value: "texto_largo",label: "Texto largo" },
  { value: "selector",   label: "Selector (opciones)" },
  { value: "escala",     label: "Escala (botones)" },
  { value: "booleano",   label: "Sí / No" },
];

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "var(--color-pampa)",
  color: "var(--color-tierra)",
};

const onFocusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "var(--color-cuero)";
  e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
};
const onBlurIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "rgba(212,197,169,0.8)";
  e.target.style.boxShadow = "none";
};

const FORM_EMPTY = {
  nombre: "",
  etiqueta: "",
  tipo: "texto" as TipoCampo,
  opcionesRaw: "",
  obligatorio: false,
  activo: true,
  ancho: "mitad" as "mitad" | "completo",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

interface CampoFormProps {
  editData: MangaCampo | null;
  maxOrden: number;
  onSave: () => void;
  onCancel: () => void;
  updateCampo: (id: string, payload: Partial<MangaCampo>) => Promise<boolean>;
  createCampo: (payload: Omit<MangaCampo, "id">) => Promise<boolean>;
}

function CampoForm({ editData, maxOrden, onSave, onCancel, updateCampo, createCampo }: CampoFormProps) {
  const [form, setForm] = useState(() => {
    if (editData) {
      return {
        nombre: editData.nombre,
        etiqueta: editData.etiqueta,
        tipo: editData.tipo,
        opcionesRaw: (editData.opciones ?? []).join(", "),
        obligatorio: editData.obligatorio,
        activo: editData.activo,
        ancho: editData.ancho,
      };
    }
    return FORM_EMPTY;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K) {
    return (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.etiqueta.trim()) { setError("La etiqueta es obligatoria."); return; }

    const nombre = editData ? editData.nombre : slugify(form.etiqueta);
    if (!nombre) { setError("El nombre generado está vacío. Revisá la etiqueta."); return; }

    const needsOpciones = form.tipo === "selector" || form.tipo === "escala";
    const opciones = needsOpciones
      ? form.opcionesRaw.split(",").map((o) => o.trim()).filter(Boolean)
      : null;

    if (needsOpciones && (!opciones || opciones.length === 0)) {
      setError("Ingresá al menos una opción separada por comas.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: Omit<MangaCampo, "id"> = {
      nombre,
      etiqueta: form.etiqueta.trim(),
      tipo: form.tipo,
      opciones,
      obligatorio: form.obligatorio,
      activo: form.activo,
      ancho: form.ancho,
      orden: editData ? editData.orden : maxOrden + 1,
    };

    const ok = editData
      ? await updateCampo(editData.id, payload)
      : await createCampo(payload);

    setLoading(false);
    if (ok) {
      onSave();
    } else {
      setError("Error al guardar. Verificá que el nombre no esté duplicado.");
    }
  }

  const needsOpciones = form.tipo === "selector" || form.tipo === "escala";

  return (
    <div
      className="rounded-2xl p-5 mb-5"
      style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid var(--color-campo)",
        boxShadow: "0 2px 12px rgba(58,74,50,0.1)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          {editData ? "Editar campo" : "Nuevo campo"}
        </h3>
        <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ color: "rgba(26,26,24,0.4)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
          <X size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Etiqueta (visible al usuario)</label>
            <input type="text" value={form.etiqueta}
              onChange={(e) => {
                set("etiqueta")(e.target.value);
                if (!editData) set("nombre")(slugify(e.target.value));
              }}
              placeholder="Ej: Peso vivo (kg)"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE}
              onFocus={onFocusIn} onBlur={onBlurIn} />
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <select value={form.tipo} onChange={(e) => set("tipo")(e.target.value as TipoCampo)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE}
              onFocus={onFocusIn} onBlur={onBlurIn}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {needsOpciones && (
          <div>
            <label className="form-label">Opciones (separadas por comas)</label>
            <input type="text" value={form.opcionesRaw}
              onChange={(e) => set("opcionesRaw")(e.target.value)}
              placeholder="Ej: Sano, En tratamiento, Observación"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE}
              onFocus={onFocusIn} onBlur={onBlurIn} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="form-label">Ancho</label>
            <select value={form.ancho} onChange={(e) => set("ancho")(e.target.value as "mitad" | "completo")}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE}
              onFocus={onFocusIn} onBlur={onBlurIn}>
              <option value="mitad">Mitad</option>
              <option value="completo">Completo</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.obligatorio} onChange={(e) => set("obligatorio")(e.target.checked)}
                className="w-4 h-4 rounded accent-campo" />
              <span className="text-sm" style={{ color: "var(--color-tierra)" }}>Obligatorio</span>
            </label>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.activo} onChange={(e) => set("activo")(e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-sm" style={{ color: "var(--color-tierra)" }}>Activo</span>
            </label>
          </div>
        </div>

        {!editData && (
          <p className="text-xs" style={{ color: "rgba(26,26,24,0.4)" }}>
            Nombre interno: <code className="font-mono">{form.nombre || slugify(form.etiqueta) || "—"}</code>
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
            <AlertCircle size={15} className="shrink-0" />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)" }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--color-campo)", opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ConfiguradorCampos() {
  const { campos, loading, fetchCampos, createCampo, updateCampo, deleteCampo, toggleActivo, moveUp, moveDown } =
    useCamposConfig();

  const [showForm, setShowForm] = useState(false);
  const [editCampo, setEditCampo] = useState<MangaCampo | null>(null);

  useEffect(() => {
    fetchCampos();
  }, [fetchCampos]);

  async function handleDelete(campo: MangaCampo) {
    if (!confirm(`¿Eliminar el campo "${campo.etiqueta}"? Esta acción no se puede deshacer.`)) return;
    await deleteCampo(campo.id);
  }

  const TIPO_LABEL: Record<TipoCampo, string> = {
    numero: "Número",
    texto: "Texto",
    texto_largo: "Texto largo",
    selector: "Selector",
    escala: "Escala",
    booleano: "Sí/No",
  };

  if (loading && campos.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-campo)" }} />
      </div>
    );
  }

  return (
    <div>
      {(showForm || editCampo) ? (
        <CampoForm
          editData={editCampo}
          maxOrden={campos.reduce((m, c) => Math.max(m, c.orden), 0)}
          onSave={() => { setShowForm(false); setEditCampo(null); }}
          onCancel={() => { setShowForm(false); setEditCampo(null); }}
          updateCampo={updateCampo}
          createCampo={createCampo}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-5"
          style={{
            border: "1.5px dashed rgba(58,74,50,0.4)",
            color: "var(--color-campo)",
            backgroundColor: "rgba(58,74,50,0.04)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(58,74,50,0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(58,74,50,0.04)"; }}
        >
          <Plus size={16} /> Agregar campo
        </button>
      )}

      {/* Campos table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(212,197,169,0.5)", backgroundColor: "#ffffff" }}
      >
        {campos.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>
              No hay campos configurados todavía.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "rgba(212,197,169,0.15)", borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                <th className="text-left px-4 py-3 form-label">#</th>
                <th className="text-left px-4 py-3 form-label">Etiqueta</th>
                <th className="text-left px-4 py-3 form-label hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 form-label hidden md:table-cell">Nombre interno</th>
                <th className="text-center px-4 py-3 form-label">Activo</th>
                <th className="text-right px-4 py-3 form-label">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {campos.map((campo, idx) => (
                <tr
                  key={campo.id}
                  style={{
                    borderBottom:
                      idx < campos.length - 1 ? "1px solid rgba(212,197,169,0.3)" : "none",
                    opacity: campo.activo ? 1 : 0.5,
                  }}
                >
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "rgba(26,26,24,0.4)" }}>
                    {campo.orden}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-tierra)" }}>
                    {campo.etiqueta}
                    {campo.obligatorio && (
                      <span className="ml-1 text-[10px]" style={{ color: "#dc2626" }}>*</span>
                    )}
                    <span className="ml-2 text-[10px]" style={{ color: "rgba(26,26,24,0.35)" }}>
                      {campo.ancho}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: "rgba(58,74,50,0.08)",
                        color: "var(--color-campo)",
                      }}
                    >
                      {TIPO_LABEL[campo.tipo]}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs hidden md:table-cell"
                    style={{ color: "rgba(26,26,24,0.4)" }}
                  >
                    {campo.nombre}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActivo(campo)}
                      className="w-9 h-5 rounded-full transition-all relative shrink-0"
                      style={{
                        backgroundColor: campo.activo ? "var(--color-campo)" : "rgba(212,197,169,0.6)",
                      }}
                      title={campo.activo ? "Desactivar" : "Activar"}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: campo.activo ? "calc(100% - 18px)" : "2px" }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => moveUp(campo)} disabled={idx === 0}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: idx === 0 ? "rgba(26,26,24,0.2)" : "rgba(26,26,24,0.5)" }}
                        onMouseEnter={(e) => { if (idx !== 0) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveDown(campo)} disabled={idx === campos.length - 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: idx === campos.length - 1 ? "rgba(26,26,24,0.2)" : "rgba(26,26,24,0.5)" }}
                        onMouseEnter={(e) => { if (idx !== campos.length - 1) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                        <ChevronDown size={14} />
                      </button>
                      <button onClick={() => setEditCampo(campo)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: "rgba(26,26,24,0.5)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(campo)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: "rgba(220,38,38,0.6)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(220,38,38,0.07)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
