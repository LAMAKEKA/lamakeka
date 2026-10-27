"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, AlertCircle, Check, Upload, ImageIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildEstablecimientoInsert,
  isUniqueViolation,
  toLegacyEstablecimientoInsert,
} from "@/lib/tenant/buildEstablecimientoInsert";
import type { EstablecimientoTipo } from "@/lib/tenant/types";
import {
  BRAND_PRESETS,
  MAKEKA_BRAND,
  type BrandTheme,
} from "@/lib/tenant/brandTheme";
import {
  LOGO_ACCEPT,
  uploadEstablecimientoLogo,
  validateLogoFile,
} from "@/lib/tenant/uploadEstablecimientoLogo";
import { BrandMark } from "@/components/brand-mark";

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

const TIPOS: {
  id: EstablecimientoTipo;
  label: string;
  desc: string;
  emoji: string;
}[] = [
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
  const [tipo, setTipo] = useState<EstablecimientoTipo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Branding (opcional en registro)
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [campoColor, setCampoColor] = useState<string>(MAKEKA_BRAND.campo);
  const [cueroColor, setCueroColor] = useState<string>(MAKEKA_BRAND.cuero);
  const [presetId, setPresetId] = useState<string | "custom">("olivo");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPreset(id: string) {
    const p = BRAND_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setCampoColor(p.campo);
    setCueroColor(p.cuero);
  }

  function onLogoPick(file: File | null) {
    if (!file) return;
    const invalid = validateLogoFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

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
      window.location.assign("/login");
      return;
    }

    let logoUrl: string | null = null;
    if (logoFile) {
      const up = await uploadEstablecimientoLogo(supabase, user.id, logoFile);
      if ("error" in up) {
        // No bloqueamos el alta del campo: avisamos y seguimos sin logo.
        console.warn("[setup] logo upload failed", up.error);
        setError(up.error);
        // Si el user quiere igual crear el campo, dejamos pasar con un 2º click
        // — pero en 1º intento con error de storage sí cortamos para que vea el msg.
        setLoading(false);
        return;
      }
      logoUrl = up.publicUrl;
    }

    const brandTheme: BrandTheme = { campo: campoColor, cuero: cueroColor };

    const fullPayload = buildEstablecimientoInsert({
      nombre,
      ubicacion,
      tipo,
      userId: user.id,
      email: user.email,
      logoUrl: logoUrl ?? "",
      brandTheme,
    });

    const { error: insertError } = await supabase
      .from("establecimientos")
      .insert(fullPayload);

    if (insertError) {
      if (isUniqueViolation(insertError)) {
        setError("Ya tenés un establecimiento. Redirigiendo…");
        window.location.assign("/");
        return;
      }

      // Fallback: sin brand_theme / logo si la col no existe en cloud viejo
      const legacyRes = await supabase
        .from("establecimientos")
        .insert(toLegacyEstablecimientoInsert(fullPayload));

      if (legacyRes.error) {
        setError(
          legacyRes.error.message ||
            insertError.message ||
            "No se pudo guardar el establecimiento. Intentá de nuevo."
        );
        setLoading(false);
        return;
      }

      // Reintento parcial platform cols (logo + theme) best-effort
      await supabase
        .from("establecimientos")
        .update({
          nombre_display: fullPayload.nombre_display,
          logo_url: fullPayload.logo_url,
          tagline: fullPayload.tagline,
          rubros: fullPayload.rubros,
          modules_enabled: fullPayload.modules_enabled,
          brand_theme: fullPayload.brand_theme,
          is_platform_demo: fullPayload.is_platform_demo,
        })
        .eq("user_id", user.id);

      console.warn(
        "[setup] insert platform cols failed; saved legacy + patch",
        insertError.message
      );
    }

    // Hard nav: proxy + useTenant leen la fila nueva con cookies frescas.
    window.location.assign("/");
  }

  const previewName = nombre.trim() || "Tu campo";

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
            Nombre, tipo, y si querés logo + colores propios (así no se ve igual
            a La Makeka).
          </p>
        </div>

        {/* Progress */}
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

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            backgroundColor: "#ffffff",
            boxShadow:
              "0 4px 24px rgba(26,26,24,0.08), 0 1px 3px rgba(26,26,24,0.05)",
            border: "1px solid rgba(212,197,169,0.5)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
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

            {/* Provincia */}
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

            {/* Tipo */}
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
                      className="relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all touch-manipulation"
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
                        className="text-xs leading-snug hidden sm:block"
                        style={{ color: "rgba(26,26,24,0.45)" }}
                      >
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branding */}
            <div
              className="rounded-2xl p-4 space-y-4"
              style={{
                backgroundColor: "rgba(240,237,230,0.45)",
                border: "1px solid rgba(212,197,169,0.55)",
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-tierra)" }}
                >
                  Identidad del campo{" "}
                  <span className="font-normal" style={{ color: "rgba(26,26,24,0.4)" }}>
                    (opcional)
                  </span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.45)" }}>
                  Logo y colores para el menú y botones. Lo podés cambiar después en Mi campo.
                </p>
              </div>

              {/* Preview */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: campoColor }}
              >
                <BrandMark
                  logoUrl={logoPreview}
                  name={previewName}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-white font-bold truncate"
                    style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                  >
                    {previewName}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Vista previa del menú
                  </p>
                </div>
                <div
                  className="w-8 h-8 rounded-full shrink-0 border-2 border-white/40"
                  style={{ backgroundColor: cueroColor }}
                  title="Acento"
                />
              </div>

              {/* Logo upload */}
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "var(--color-tierra)" }}
                >
                  Logo
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold touch-manipulation"
                    style={{
                      border: "1.5px solid rgba(212,197,169,0.8)",
                      color: "var(--color-tierra)",
                      backgroundColor: "#fff",
                    }}
                  >
                    <Upload size={15} />
                    {logoFile ? "Cambiar archivo" : "Subir logo"}
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="flex items-center gap-1.5 text-xs font-medium px-2 py-2 rounded-lg"
                      style={{ color: "#dc2626" }}
                    >
                      <X size={14} /> Quitar
                    </button>
                  )}
                  {!logoPreview && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "rgba(26,26,24,0.4)" }}>
                      <ImageIcon size={13} /> PNG / JPG / WEBP · máx 2 MB
                    </span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    onLogoPick(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Color presets */}
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "var(--color-tierra)" }}
                >
                  Paleta
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {BRAND_PRESETS.map((p) => {
                    const active = presetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickPreset(p.id)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl touch-manipulation"
                        style={{
                          border: active
                            ? "2px solid var(--color-cuero)"
                            : "1.5px solid rgba(212,197,169,0.6)",
                          backgroundColor: active ? "rgba(139,78,42,0.06)" : "#fff",
                        }}
                      >
                        <span className="flex gap-0.5">
                          <span
                            className="w-5 h-5 rounded-md"
                            style={{ backgroundColor: p.campo }}
                          />
                          <span
                            className="w-5 h-5 rounded-md"
                            style={{ backgroundColor: p.cuero }}
                          />
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: "var(--color-tierra)" }}>
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom hex */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "rgba(26,26,24,0.5)" }}>
                    Color principal (menú)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={campoColor}
                      onChange={(e) => {
                        setPresetId("custom");
                        setCampoColor(e.target.value.toUpperCase());
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={campoColor}
                      onChange={(e) => {
                        setPresetId("custom");
                        setCampoColor(e.target.value);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none"
                      style={{
                        border: "1.5px solid rgba(212,197,169,0.8)",
                        backgroundColor: "#fff",
                        color: "var(--color-tierra)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "rgba(26,26,24,0.5)" }}>
                    Color acento
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cueroColor}
                      onChange={(e) => {
                        setPresetId("custom");
                        setCueroColor(e.target.value.toUpperCase());
                      }}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={cueroColor}
                      onChange={(e) => {
                        setPresetId("custom");
                        setCueroColor(e.target.value);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none"
                      style={{
                        border: "1.5px solid rgba(212,197,169,0.8)",
                        backgroundColor: "#fff",
                        color: "var(--color-tierra)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity touch-manipulation"
              style={{
                backgroundColor: campoColor || "var(--color-campo)",
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
