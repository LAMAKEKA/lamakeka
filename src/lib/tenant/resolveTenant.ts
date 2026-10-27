import {
  defaultLogoUrl,
  defaultModulesForTipo,
  defaultRubrosForTipo,
  defaultTaglineForTipo,
  MAKEKA_LEGACY_MODULES,
  looksLikeMakekaTenant,
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
  slug?: string | null;
};

export function normalizeTipo(tipo: string): EstablecimientoTipo {
  if (tipo === "agricola" || tipo === "mixto" || tipo === "ganadero") {
    return tipo;
  }
  return "ganadero";
}

function resolveModules(
  row: EstablecimientoRow,
  tipo: EstablecimientoTipo
): string[] {
  if (row.modules_enabled && row.modules_enabled.length > 0) {
    return [...row.modules_enabled];
  }
  // Vacío en DB: Makeka real → pack legacy; genérico → defaults por tipo
  if (
    looksLikeMakekaTenant({
      nombre: row.nombre,
      nombreDisplay: row.nombre_display,
      slug: row.slug,
    })
  ) {
    return [...MAKEKA_LEGACY_MODULES];
  }
  return [...defaultModulesForTipo(tipo)];
}

export function mapEstablecimientoRow(row: EstablecimientoRow): TenantConfig {
  const tipo = normalizeTipo(row.tipo);
  const modules = resolveModules(row, tipo);
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

  const display = (row.nombre_display?.trim() || row.nombre).trim();
  const makeka = looksLikeMakekaTenant({
    nombre: row.nombre,
    nombreDisplay: display,
    slug: row.slug,
  });

  return {
    establecimientoId: row.id,
    nombre: row.nombre,
    nombreDisplay: display,
    logoUrl: row.logo_url?.trim() || defaultLogoUrl(),
    // Makeka real: tagline histórico. Genérico: por tipo o el guardado.
    tagline:
      row.tagline?.trim() ||
      (makeka ? "AI · Ganadera" : defaultTaglineForTipo(tipo)),
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
