"use client";

import { useState } from "react";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";

export interface AnimalNuevo {
  eid: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  lote: string | null;
}

interface CrearAnimalFormProps {
  eid: string;
  saving: boolean;
  onCreate: (animal: AnimalNuevo) => void;
  onCancel: () => void;
}

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

export function CrearAnimalForm({ eid, saving, onCreate, onCancel }: CrearAnimalFormProps) {
  const [vid, setVid] = useState("");
  const [raza, setRaza] = useState("");
  const [sexo, setSexo] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [lote, setLote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sexo) {
      setError("Indicá el sexo del animal.");
      return;
    }
    onCreate({
      eid,
      vid: vid.trim() || null,
      raza: raza.trim() || null,
      sexo: sexo.trim() || null,
      fechaNacimiento: fechaNacimiento || null,
      lote: lote.trim() || null,
    });
  }

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid #d97706",
        boxShadow: "0 2px 12px rgba(217,119,6,0.1)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={16} style={{ color: "#d97706" }} />
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Registrar animal nuevo
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="form-label">EID</label>
          <input
            type="text"
            value={eid}
            readOnly
            className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
            style={{ ...INPUT_STYLE, opacity: 0.7 }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">VID (caravana visual)</label>
            <input
              type="text"
              value={vid}
              onChange={(e) => setVid(e.target.value)}
              placeholder="Ej: 245"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Raza</label>
            <input
              type="text"
              value={raza}
              onChange={(e) => setRaza(e.target.value)}
              placeholder="Ej: Angus"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={INPUT_STYLE}
              onFocus={onFocusIn}
              onBlur={onBlurIn}
            />
          </div>
          <div>
            <label className="form-label">Fecha de nacimiento</label>
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

        <div>
          <label className="form-label">Lote</label>
          <input
            type="text"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            placeholder="Ej: Lote 3"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={INPUT_STYLE}
            onFocus={onFocusIn}
            onBlur={onBlurIn}
          />
        </div>

        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}
          >
            <AlertCircle size={15} className="shrink-0" />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)" }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: "#d97706", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Crear animal
          </button>
        </div>
      </form>
    </div>
  );
}
