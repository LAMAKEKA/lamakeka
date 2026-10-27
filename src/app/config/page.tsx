"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings2,
  Loader2,
  AlertCircle,
  Check,
  Lock,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { MODULE_REGISTRY, type ModuleId } from "@/lib/modules/registry";
import { iconFor } from "@/lib/modules/iconMap";
import {
  applyModuleToggle,
  configurableModuleIds,
  isModuleToggleable,
  normalizeModulesEnabled,
  rubrosForModules,
} from "@/lib/modules/toggleModules";
import {
  BRAND_PRESETS,
  MAKEKA_BRAND,
  brandThemeToJson,
  isHexColor,
  type BrandTheme,
} from "@/lib/tenant/brandTheme";
import {
  LOGO_ACCEPT,
  uploadEstablecimientoLogo,
  validateLogoFile,
} from "@/lib/tenant/uploadEstablecimientoLogo";
import { BrandMark } from "@/components/brand-mark";

const TIPO_LABEL: Record<string, string> = {
  ganadero: "Ganadero",
  agricola: "Agrícola",
  mixto: "Mixto",
};

export default function ConfigPage() {
  const { tenant, loading: tenantLoading, refresh, patchTenant } = useTenant();
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [brandOk, setBrandOk] = useState(false);

  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [campoColor, setCampoColor] = useState<string>(MAKEKA_BRAND.campo);
  const [cueroColor, setCueroColor] = useState<string>(MAKEKA_BRAND.cuero);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenant) return;
    setDraft(normalizeModulesEnabled(tenant.modulesEnabled));
    setLogoUrl(tenant.logoUrl || "");
    setLogoPreview(null);
    setLogoFile(null);
    setCampoColor(tenant.brandTheme?.campo || MAKEKA_BRAND.campo);
    setCueroColor(tenant.brandTheme?.cuero || MAKEKA_BRAND.cuero);
  }, [tenant]);

  const dirty = useMemo(() => {
    if (!tenant) return false;
    const a = normalizeModulesEnabled(tenant.modulesEnabled).join(",");
    const b = normalizeModulesEnabled(draft).join(",");
    return a !== b;
  }, [tenant, draft]);

  const brandDirty = useMemo(() => {
    if (!tenant) return false;
    const curCampo = tenant.brandTheme?.campo || MAKEKA_BRAND.campo;
    const curCuero = tenant.brandTheme?.cuero || MAKEKA_BRAND.cuero;
    const logoChanged = !!logoFile || logoUrl !== (tenant.logoUrl || "");
    return logoChanged || campoColor !== curCampo || cueroColor !== curCuero;
  }, [tenant, logoFile, logoUrl, campoColor, cueroColor]);

  const rows = useMemo(() => {
    const toggleable = new Set(configurableModuleIds());
    return MODULE_REGISTRY.filter(
      (m) => m.id === "inicio" || toggleable.has(m.id)
    );
  }, []);

  function toggle(id: ModuleId, on: boolean) {
    if (!isModuleToggleable(id)) return;
    setDraft((prev) => applyModuleToggle(prev, id, on));
    setSavedOk(false);
    setError(null);
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
    setBrandOk(false);
  }

  function clearLogo() {
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl("");
    setBrandOk(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    if (!tenant?.establecimientoId) {
      setError("No hay establecimiento cargado. Completá el setup primero.");
      return;
    }
    setSaving(true);
    setError(null);
    setSavedOk(false);

    const modules = normalizeModulesEnabled(draft);
    const rubros = rubrosForModules(modules, tenant.rubros);

    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("establecimientos")
      .update({
        modules_enabled: modules,
        rubros,
      })
      .eq("id", tenant.establecimientoId);

    setSaving(false);

    if (updErr) {
      setError(
        updErr.message ||
          "No se pudo guardar. ¿Aplicaste las migraciones de platform config en cloud?"
      );
      return;
    }

    patchTenant({ modulesEnabled: modules, rubros });
    setDraft(modules);
    setSavedOk(true);
    await refresh();
  }

  async function handleSaveBrand() {
    if (!tenant?.establecimientoId) {
      setError("No hay establecimiento cargado. Completá el setup primero.");
      return;
    }
    if (!isHexColor(campoColor) || !isHexColor(cueroColor)) {
      setError("Colores inválidos. Usá formato #RRGGBB.");
      return;
    }

    setSavingBrand(true);
    setError(null);
    setBrandOk(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesión expirada. Volvé a iniciar sesión.");
      setSavingBrand(false);
      return;
    }

    let nextLogo = logoUrl;
    if (logoFile) {
      const up = await uploadEstablecimientoLogo(supabase, user.id, logoFile);
      if ("error" in up) {
        setError(up.error);
        setSavingBrand(false);
        return;
      }
      nextLogo = up.publicUrl;
    }

    const theme: BrandTheme = { campo: campoColor, cuero: cueroColor };
    const { error: updErr } = await supabase
      .from("establecimientos")
      .update({
        logo_url: nextLogo || null,
        brand_theme: brandThemeToJson(theme),
      })
      .eq("id", tenant.establecimientoId);

    setSavingBrand(false);

    if (updErr) {
      setError(
        updErr.message ||
          "No se pudo guardar la identidad. ¿Está brand_theme / logo_url en cloud?"
      );
      return;
    }

    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(nextLogo);
    patchTenant({ logoUrl: nextLogo, brandTheme: theme });
    setBrandOk(true);
    await refresh();
  }

  if (tenantLoading) {
    return (
      <div className="page-pad flex items-center justify-center min-h-[40vh]">
        <Loader2
          className="animate-spin"
          size={28}
          style={{ color: "var(--color-campo)" }}
        />
      </div>
    );
  }

  const displayName = tenant?.nombreDisplay || tenant?.nombre || "Campo";
  const previewLogo = logoPreview || logoUrl;

  return (
    <div className="page-pad max-w-2xl mx-auto space-y-5">
      <header className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: "rgba(58,74,50,0.1)",
            color: "var(--color-campo)",
          }}
        >
          <Settings2 size={22} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h1
            className="text-xl font-bold leading-tight"
            style={{
              color: "var(--color-tierra)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            Mi campo
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-texto-suave)" }}>
            Identidad (logo/colores) y módulos. Misma app para Makeka y campos
            genéricos.
          </p>
        </div>
      </header>

      {tenant ? (
        <section
          className="rounded-2xl border p-4 space-y-1"
          style={{
            backgroundColor: "rgba(255,255,255,0.85)",
            borderColor: "rgba(212,197,169,0.65)",
          }}
        >
          <p
            className="text-xs uppercase tracking-wider font-semibold"
            style={{ color: "var(--color-texto-suave)" }}
          >
            Establecimiento
          </p>
          <p
            className="text-base font-semibold truncate"
            style={{ color: "var(--color-tierra)" }}
          >
            {displayName}
          </p>
          <p className="text-sm" style={{ color: "var(--color-texto-suave)" }}>
            Tipo setup: {TIPO_LABEL[tenant.tipo] ?? tenant.tipo}
            {tenant.isPlatformDemo ? " · demo plataforma" : ""}
          </p>
        </section>
      ) : (
        <div
          className="rounded-xl border px-3 py-3 text-sm flex gap-2 items-start"
          style={{
            borderColor: "rgba(220,38,38,0.25)",
            backgroundColor: "rgba(220,38,38,0.06)",
            color: "#b91c1c",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Sin establecimiento. Andá a /setup.
        </div>
      )}

      {tenant && (
        <section
          className="rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            borderColor: "rgba(212,197,169,0.65)",
          }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "rgba(212,197,169,0.45)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--color-tierra)" }}>
              Identidad
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-texto-suave)" }}>
              Logo y colores del menú / botones (distinto a La Makeka).
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: campoColor }}
            >
              <BrandMark logoUrl={previewLogo} name={displayName} size={44} />
              <div className="min-w-0 flex-1">
                <p
                  className="text-white font-bold truncate"
                  style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                >
                  {displayName}
                </p>
                <p
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  Vista previa
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full shrink-0 border-2 border-white/40"
                style={{ backgroundColor: cueroColor }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
                {logoFile || logoUrl ? "Cambiar logo" : "Subir logo"}
              </button>
              {(logoFile || logoUrl || logoPreview) && (
                <button
                  type="button"
                  onClick={clearLogo}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-2"
                  style={{ color: "#dc2626" }}
                >
                  <X size={14} /> Quitar logo
                </button>
              )}
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

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BRAND_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCampoColor(p.campo);
                    setCueroColor(p.cuero);
                    setBrandOk(false);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl touch-manipulation"
                  style={{
                    border:
                      campoColor === p.campo && cueroColor === p.cuero
                        ? "2px solid var(--color-cuero)"
                        : "1.5px solid rgba(212,197,169,0.55)",
                    backgroundColor: "#fff",
                  }}
                >
                  <span className="flex gap-0.5">
                    <span className="w-5 h-5 rounded-md" style={{ backgroundColor: p.campo }} />
                    <span className="w-5 h-5 rounded-md" style={{ backgroundColor: p.cuero }} />
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: "var(--color-tierra)" }}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "var(--color-texto-suave)" }}>
                  Principal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isHexColor(campoColor) ? campoColor : MAKEKA_BRAND.campo}
                    onChange={(e) => {
                      setCampoColor(e.target.value.toUpperCase());
                      setBrandOk(false);
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={campoColor}
                    onChange={(e) => {
                      setCampoColor(e.target.value);
                      setBrandOk(false);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    style={{
                      border: "1.5px solid rgba(212,197,169,0.8)",
                      backgroundColor: "var(--color-pampa)",
                      color: "var(--color-tierra)",
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "var(--color-texto-suave)" }}>
                  Acento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isHexColor(cueroColor) ? cueroColor : MAKEKA_BRAND.cuero}
                    onChange={(e) => {
                      setCueroColor(e.target.value.toUpperCase());
                      setBrandOk(false);
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={cueroColor}
                    onChange={(e) => {
                      setCueroColor(e.target.value);
                      setBrandOk(false);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    style={{
                      border: "1.5px solid rgba(212,197,169,0.8)",
                      backgroundColor: "var(--color-pampa)",
                      color: "var(--color-tierra)",
                    }}
                  />
                </div>
              </div>
            </div>

            {brandOk && !brandDirty && (
              <p className="text-sm flex items-center gap-1.5" style={{ color: "#15803d" }}>
                <Check size={15} /> Identidad guardada.
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveBrand}
              disabled={savingBrand || !brandDirty}
              className="w-full min-h-[48px] rounded-xl text-sm font-semibold text-white touch-manipulation disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--color-campo)" }}
            >
              {savingBrand ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando identidad…
                </>
              ) : (
                "Guardar logo y colores"
              )}
            </button>
          </div>
        </section>
      )}

      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          borderColor: "rgba(212,197,169,0.65)",
        }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "rgba(212,197,169,0.45)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-tierra)" }}>
            Módulos
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-texto-suave)" }}>
            Ej.: sumá Producción (huevos) o Agrícola sin cambiar de app.
          </p>
        </div>

        <ul className="divide-y" style={{ borderColor: "rgba(212,197,169,0.35)" }}>
          {rows.map((m) => {
            const Icon = iconFor(m.icon);
            const on = draft.includes(m.id);
            const locked = !isModuleToggleable(m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: on ? "rgba(58,74,50,0.12)" : "rgba(0,0,0,0.04)",
                    color: on ? "var(--color-campo)" : "var(--color-texto-suave)",
                  }}
                >
                  <Icon size={18} strokeWidth={on ? 2.1 : 1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-tierra)" }}>
                    {m.label}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "var(--color-texto-suave)" }}>
                    {m.href}
                    {m.badge ? ` · ${m.badge}` : ""}
                    {locked ? " · siempre activo" : ""}
                  </p>
                </div>
                {locked ? (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg"
                    style={{
                      color: "var(--color-texto-suave)",
                      backgroundColor: "rgba(0,0,0,0.04)",
                    }}
                  >
                    <Lock size={12} /> On
                  </span>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${on ? "Desactivar" : "Activar"} ${m.label}`}
                    onClick={() => toggle(m.id, !on)}
                    className="relative w-12 h-7 rounded-full shrink-0 touch-manipulation transition-colors"
                    style={{
                      backgroundColor: on ? "var(--color-campo)" : "rgba(0,0,0,0.15)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                      style={{
                        transform: on ? "translateX(1.25rem)" : "translateX(0)",
                      }}
                    />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {error && (
        <div
          className="rounded-xl border px-3 py-3 text-sm flex gap-2 items-start"
          style={{
            borderColor: "rgba(220,38,38,0.25)",
            backgroundColor: "rgba(220,38,38,0.06)",
            color: "#b91c1c",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {savedOk && !dirty && (
        <div
          className="rounded-xl border px-3 py-3 text-sm flex gap-2 items-center"
          style={{
            borderColor: "rgba(22,163,74,0.3)",
            backgroundColor: "rgba(22,163,74,0.08)",
            color: "#15803d",
          }}
        >
          <Check size={16} />
          Guardado. El menú se actualiza con los módulos activos.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty || !tenant?.establecimientoId}
          className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold text-white touch-manipulation disabled:opacity-50 inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: "var(--color-campo)" }}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar módulos"
          )}
        </button>
      </div>
    </div>
  );
}
