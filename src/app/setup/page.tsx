"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PROVINCIAS = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

type TipoCampo = "ganadero" | "agricola" | "mixto";

const TIPOS: { id: TipoCampo; label: string; desc: string; emoji: string }[] = [
  {
    id: "ganadero",
    label: "Ganadero",
    desc: "Cría, recría y engorde de hacienda",
    emoji: "🐄",
  },
  {
    id: "agricola",
    label: "Agrícola",
    desc: "Cultivos de soja, maíz, trigo y otros",
    emoji: "🌾",
  },
  {
    id: "mixto",
    label: "Mixto",
    desc: "Ganadería y agricultura combinadas",
    emoji: "🏡",
  },
];

export default function SetupPage() {
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [tipo, setTipo] = useState<TipoCampo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) {
      setError("Seleccioná el tipo de campo.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: dbError } = await supabase.from("establecimientos").insert({
      nombre,
      ubicacion,
      tipo,
      user_id: user.id,
    });

    if (dbError) {
      setError("No se pudo guardar el establecimiento. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--color-pampa)" }}
    >
      <div className="w-full max-w-[580px]">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo-makeka.png"
            alt="La Makeka AI"
            width={80}
            height={80}
            className="rounded-2xl mb-4 mx-auto"
          />
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              color: "var(--color-tierra)",
            }}
          >
            Configurá tu establecimiento
          </h1>
          <p className="text-sm mt-2" style={{ color: "rgba(26,26,24,0.45)" }}>
            Esta información aparecerá en tu panel de gestión
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { n: 1, label: "Cuenta", done: true },
            { n: 2, label: "Establecimiento", done: false, active: true },
            { n: 3, label: "Dashboard", done: false },
          ].map((step, i) => (
            <div key={step.n} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{
                    backgroundColor: step.done
                      ? "var(--color-campo)"
                      : step.active
                      ? "var(--color-cuero)"
                      : "rgba(212,197,169,0.5)",
                    color: step.done || step.active ? "#fff" : "rgba(26,26,24,0.4)",
                  }}
                >
                  {step.done ? <Check size={13} strokeWidth={2.5} /> : step.n}
                </div>
                <span
                  className="text-xs font-medium hidden sm:block"
                  style={{
                    color: step.active
                      ? "var(--color-tierra)"
                      : "rgba(26,26,24,0.4)",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className="w-8 h-px"
                  style={{ backgroundColor: "rgba(212,197,169,0.6)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "#ffffff",
            boxShadow:
              "0 4px 24px rgba(26,26,24,0.08), 0 1px 3px rgba(26,26,24,0.05)",
            border: "1px solid rgba(212,197,169,0.5)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre del establecimiento */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-tierra)" }}
              >
                Nombre del establecimiento{" "}
                <span style={{ color: "var(--color-cuero)" }}>*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: La Estancia San Carlos, Campo Los Ombúes..."
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  border: "1.5px solid rgba(212,197,169,0.8)",
                  backgroundColor: "var(--color-pampa)",
                  color: "var(--color-tierra)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-cuero)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(212,197,169,0.8)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Ubicación */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-tierra)" }}
              >
                Provincia <span style={{ color: "var(--color-cuero)" }}>*</span>
              </label>
              <div className="relative">
                <select
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer"
                  style={{
                    border: "1.5px solid rgba(212,197,169,0.8)",
                    backgroundColor: "var(--color-pampa)",
                    color: ubicacion ? "var(--color-tierra)" : "rgba(26,26,24,0.35)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--color-cuero)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(212,197,169,0.8)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="" disabled>
                    Seleccioná una provincia
                  </option>
                  {PROVINCIAS.map((p) => (
                    <option key={p} value={p} style={{ color: "var(--color-tierra)" }}>
                      {p}
                    </option>
                  ))}
                </select>
                {/* chevron */}
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: "rgba(26,26,24,0.35)" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Tipo de campo */}
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--color-tierra)" }}
              >
                Tipo de campo <span style={{ color: "var(--color-cuero)" }}>*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TIPOS.map((t) => {
                  const isSelected = tipo === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(t.id)}
                      className="relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                      style={{
                        border: isSelected
                          ? "2px solid var(--color-cuero)"
                          : "1.5px solid rgba(212,197,169,0.7)",
                        backgroundColor: isSelected
                          ? "rgba(139,78,42,0.05)"
                          : "var(--color-pampa)",
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "var(--color-cuero)" }}
                        >
                          <Check size={11} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                      <span className="text-3xl">{t.emoji}</span>
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: isSelected
                            ? "var(--color-cuero)"
                            : "var(--color-tierra)",
                        }}
                      >
                        {t.label}
                      </span>
                      <span
                        className="text-xs leading-snug"
                        style={{ color: "rgba(26,26,24,0.45)" }}
                      >
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "rgba(220,38,38,0.06)",
                  color: "#dc2626",
                  border: "1px solid rgba(220,38,38,0.15)",
                }}
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: "var(--color-campo)",
                color: "#ffffff",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                "Continuar al Dashboard →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
