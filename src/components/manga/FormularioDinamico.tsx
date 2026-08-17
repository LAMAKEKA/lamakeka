"use client";

import { Loader2 } from "lucide-react";
import type { MangaCampo } from "@/hooks/useCamposConfig";

type FormValue = string | number | boolean;

interface FormularioDinamicoProps {
  campos: MangaCampo[];
  values: Record<string, FormValue>;
  onChange: (key: string, value: FormValue) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}

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

function CampoNumero({ campo, value, onChange }: { campo: MangaCampo; value: FormValue; onChange: (v: FormValue) => void }) {
  return (
    <input
      type="number"
      step="0.01"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      required={campo.obligatorio}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    />
  );
}

function CampoTexto({ campo, value, onChange }: { campo: MangaCampo; value: FormValue; onChange: (v: FormValue) => void }) {
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      required={campo.obligatorio}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    />
  );
}

function CampoTextArea({ campo, value, onChange }: { campo: MangaCampo; value: FormValue; onChange: (v: FormValue) => void }) {
  return (
    <textarea
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      required={campo.obligatorio}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    />
  );
}

function CampoSelector({ campo, value, onChange }: { campo: MangaCampo; value: FormValue; onChange: (v: FormValue) => void }) {
  const opciones = campo.opciones ?? [];
  return (
    <select
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      required={campo.obligatorio}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    >
      <option value="">Seleccionar...</option>
      {opciones.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function CampoEscala({ campo, value, onChange }: { campo: MangaCampo; value: FormValue; onChange: (v: FormValue) => void }) {
  const opciones = campo.opciones ?? [];
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const isActive = String(value) === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              backgroundColor: isActive ? "var(--color-campo)" : "rgba(212,197,169,0.2)",
              color: isActive ? "#ffffff" : "var(--color-tierra)",
              border: isActive
                ? "1.5px solid var(--color-campo)"
                : "1.5px solid rgba(212,197,169,0.6)",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function CampoBooleano({ value, onChange }: { value: FormValue; onChange: (v: FormValue) => void }) {
  const isTrue = value === true || value === "true";
  return (
    <div className="flex gap-2">
      {(["Sí", "No"] as const).map((label) => {
        const val = label === "Sí";
        const isActive = isTrue === val;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(val)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: isActive
                ? val
                  ? "rgba(22,163,74,0.1)"
                  : "rgba(220,38,38,0.07)"
                : "transparent",
              color: isActive ? (val ? "#16a34a" : "#dc2626") : "rgba(26,26,24,0.4)",
              border: `1.5px solid ${
                isActive
                  ? val
                    ? "#16a34a"
                    : "#dc2626"
                  : "rgba(212,197,169,0.6)"
              }`,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function FormularioDinamico({
  campos,
  values,
  onChange,
  onSave,
  saving,
  disabled,
}: FormularioDinamicoProps) {
  if (campos.length === 0) {
    return (
      <div
        className="rounded-2xl px-4 py-8 text-center"
        style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}
      >
        <p className="text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>
          No hay campos configurados.{" "}
          <a href="/manga/configuracion" className="underline" style={{ color: "var(--color-campo)" }}>
            Configurar campos
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(212,197,169,0.5)",
        boxShadow: "0 1px 4px rgba(26,26,24,0.06)",
      }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Datos de la jornada
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {campos.map((campo) => (
          <div
            key={campo.id}
            className={campo.ancho === "completo" ? "col-span-2" : "col-span-1"}
          >
            <label className="form-label">
              {campo.etiqueta}
              {campo.obligatorio && (
                <span style={{ color: "#dc2626" }}> *</span>
              )}
            </label>

            {campo.tipo === "numero" && (
              <CampoNumero campo={campo} value={values[campo.nombre] ?? ""} onChange={(v) => onChange(campo.nombre, v)} />
            )}
            {campo.tipo === "texto" && (
              <CampoTexto campo={campo} value={values[campo.nombre] ?? ""} onChange={(v) => onChange(campo.nombre, v)} />
            )}
            {campo.tipo === "texto_largo" && (
              <CampoTextArea campo={campo} value={values[campo.nombre] ?? ""} onChange={(v) => onChange(campo.nombre, v)} />
            )}
            {campo.tipo === "selector" && (
              <CampoSelector campo={campo} value={values[campo.nombre] ?? ""} onChange={(v) => onChange(campo.nombre, v)} />
            )}
            {campo.tipo === "escala" && (
              <CampoEscala campo={campo} value={values[campo.nombre] ?? ""} onChange={(v) => onChange(campo.nombre, v)} />
            )}
            {campo.tipo === "booleano" && (
              <CampoBooleano value={values[campo.nombre] ?? false} onChange={(v) => onChange(campo.nombre, v)} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(212,197,169,0.4)" }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: "var(--color-campo)",
            opacity: saving || disabled ? 0.6 : 1,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar registro"
          )}
        </button>
      </div>
    </div>
  );
}
