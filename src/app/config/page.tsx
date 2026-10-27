"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Settings2,
  Loader2,
  AlertCircle,
  Check,
  Lock,
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

const TIPO_LABEL: Record<string, string> = {
  ganadero: "Ganadero",
  agricola: "Agrícola",
  mixto: "Mixto",
};

export default function ConfigPage() {
  const { tenant, loading: tenantLoading, refresh, patchTenant } = useTenant();
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setDraft(normalizeModulesEnabled(tenant.modulesEnabled));
  }, [tenant]);

  const dirty = useMemo(() => {
    if (!tenant) return false;
    const a = normalizeModulesEnabled(tenant.modulesEnabled).join(",");
    const b = normalizeModulesEnabled(draft).join(",");
    return a !== b;
  }, [tenant, draft]);

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
            Activá o desactivá módulos. Makeka y un campo genérico usan la misma
            app: cambia lo que ves, no el código.
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
            {tenant.nombreDisplay || tenant.nombre}
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
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-tierra)" }}
          >
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
              <li
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 min-h-[56px]"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: on
                      ? "rgba(58,74,50,0.12)"
                      : "rgba(0,0,0,0.04)",
                    color: on ? "var(--color-campo)" : "var(--color-texto-suave)",
                  }}
                >
                  <Icon size={18} strokeWidth={on ? 2.1 : 1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-tierra)" }}
                  >
                    {m.label}
                  </p>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "var(--color-texto-suave)" }}
                  >
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
                      backgroundColor: on
                        ? "var(--color-campo)"
                        : "rgba(0,0,0,0.15)",
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
