import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
} from "@/lib/modules/defaults";
import type { TenantConfig, EstablecimientoTipo } from "./types";

export type EstablecimientoRow = {
  id: string;
  nombre: string;
  tipo: string;
  nombre_display?: string | null;
  logo_url?: string | null;
  tagline?: string | null;
  rubros?: string[] | null;
  modules_enabled?: string[] | null;
  is_platform_demo?: boolean | null;
  brand_theme?: Record<string, unknown> | null;
};

export function normalizeTipo(tipo: string): EstablecimientoTipo {
  if (tipo === "agricola" || tipo === "mixto" || tipo === "ganadero") {
    return tipo;
  }
  return "ganadero";
}

export function mapEstablecimientoRow(row: EstablecimientoRow): TenantConfig {
  const tipo = normalizeTipo(row.tipo);
  const modules =
    row.modules_enabled && row.modules_enabled.length > 0
      ? [...row.modules_enabled]
      : [...defaultModulesForTipo(tipo)];
  const rubros =
    row.rubros && row.rubros.length > 0
      ? [...row.rubros]
      : [...defaultRubrosForTipo(tipo)];

  let brandTheme: Record<string, string> | null = null;
  if (row.brand_theme && typeof row.brand_theme === "object") {
    brandTheme = {};
    for (const [k, v] of Object.entries(row.brand_theme)) {
      if (typeof v === "string") brandTheme[k] = v;
    }
    if (Object.keys(brandTheme).length === 0) brandTheme = null;
  }

  return {
    establecimientoId: row.id,
    nombre: row.nombre,
    nombreDisplay: (row.nombre_display?.trim() || row.nombre).trim(),
    logoUrl: row.logo_url?.trim() || "/logo-makeka.png",
    tagline: row.tagline?.trim() || "AI · Ganadera",
    tipo,
    rubros,
    modulesEnabled: modules,
    isPlatformDemo: !!row.is_platform_demo,
    brandTheme,
  };
}

/**
 * Spec: null stays null (setup path) even for PLATFORM_DEMO_EMAIL.
 * Existing config unchanged — isPlatformDemo comes from DB flag only, not email.
 */
export function applyDemoEmailFallback(
  config: TenantConfig | null,
  userEmail: string | null | undefined
): TenantConfig | null {
  void userEmail;
  return config;
}

export function tenantIsDemoExperience(config: TenantConfig): boolean {
  return config.isPlatformDemo;
}
