/** Branding por establecimiento (logo + colores CSS). */

export const MAKEKA_BRAND = {
  campo: "#3A4A32",
  cuero: "#8B4E2A",
  pampa: "#F0EDE6",
  arpillera: "#D4C5A9",
  tierra: "#1A1A18",
} as const;

export type BrandTheme = {
  campo: string;
  cuero: string;
  pampa?: string;
  arpillera?: string;
  tierra?: string;
};

export const BRAND_PRESETS: {
  id: string;
  label: string;
  campo: string;
  cuero: string;
}[] = [
  { id: "olivo", label: "Olivo", campo: "#3A4A32", cuero: "#8B4E2A" },
  { id: "mar", label: "Mar", campo: "#1E3A5F", cuero: "#C45C26" },
  { id: "vino", label: "Vino", campo: "#5C2A3A", cuero: "#A67C2A" },
  { id: "carbon", label: "Carbón", campo: "#2C2C2A", cuero: "#B45309" },
  { id: "pasto", label: "Pasto", campo: "#2F5D3A", cuero: "#6B3E1F" },
  { id: "cielo", label: "Cielo", campo: "#0F4C5C", cuero: "#E36414" },
];

const HEX = /^#([0-9a-fA-F]{6})$/;

export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v.trim());
}

export function normalizeHex(v: string): string {
  const s = v.trim();
  if (HEX.test(s)) return `#${s.slice(1).toUpperCase()}`;
  return s;
}

/** Parsea brand_theme de DB → solo keys string hex válidas. */
export function parseBrandTheme(
  raw: Record<string, unknown> | null | undefined
): BrandTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const campo = raw.campo ?? raw.primary ?? raw.campo_color;
  const cuero = raw.cuero ?? raw.accent ?? raw.cuero_color;
  if (!isHexColor(campo) || !isHexColor(cuero)) return null;
  const out: BrandTheme = {
    campo: normalizeHex(String(campo)),
    cuero: normalizeHex(String(cuero)),
  };
  if (isHexColor(raw.pampa)) out.pampa = normalizeHex(String(raw.pampa));
  if (isHexColor(raw.arpillera)) out.arpillera = normalizeHex(String(raw.arpillera));
  if (isHexColor(raw.tierra)) out.tierra = normalizeHex(String(raw.tierra));
  return out;
}

export function brandThemeToJson(theme: BrandTheme | null): Record<string, string> | null {
  if (!theme) return null;
  const out: Record<string, string> = {
    campo: normalizeHex(theme.campo),
    cuero: normalizeHex(theme.cuero),
  };
  if (theme.pampa && isHexColor(theme.pampa)) out.pampa = normalizeHex(theme.pampa);
  if (theme.arpillera && isHexColor(theme.arpillera))
    out.arpillera = normalizeHex(theme.arpillera);
  if (theme.tierra && isHexColor(theme.tierra)) out.tierra = normalizeHex(theme.tierra);
  return out;
}

/** CSS vars a setear en :root / wrapper del shell. */
export function brandThemeCssVars(
  theme: BrandTheme | null | undefined
): Record<string, string> {
  const campo = theme?.campo && isHexColor(theme.campo) ? normalizeHex(theme.campo) : MAKEKA_BRAND.campo;
  const cuero = theme?.cuero && isHexColor(theme.cuero) ? normalizeHex(theme.cuero) : MAKEKA_BRAND.cuero;
  const pampa = theme?.pampa && isHexColor(theme.pampa) ? normalizeHex(theme.pampa) : MAKEKA_BRAND.pampa;
  const arpillera =
    theme?.arpillera && isHexColor(theme.arpillera)
      ? normalizeHex(theme.arpillera)
      : MAKEKA_BRAND.arpillera;
  const tierra =
    theme?.tierra && isHexColor(theme.tierra) ? normalizeHex(theme.tierra) : MAKEKA_BRAND.tierra;

  return {
    "--color-campo": campo,
    "--color-cuero": cuero,
    "--color-pampa": pampa,
    "--color-arpillera": arpillera,
    "--color-tierra": tierra,
    "--color-primary": campo,
    "--color-accent": cuero,
    "--color-background": pampa,
    "--color-foreground": tierra,
    "--color-ring": cuero,
    "--primary": campo,
    "--accent": cuero,
    "--background": pampa,
    "--foreground": tierra,
    "--ring": cuero,
  };
}

export function applyBrandThemeToElement(
  el: HTMLElement | null | undefined,
  theme: BrandTheme | null | undefined
) {
  if (!el || typeof document === "undefined") return;
  const vars = brandThemeCssVars(theme);
  for (const [k, v] of Object.entries(vars)) {
    el.style.setProperty(k, v);
  }
}

export function clearBrandThemeFromElement(el: HTMLElement | null | undefined) {
  if (!el) return;
  const keys = Object.keys(brandThemeCssVars(null));
  for (const k of keys) el.style.removeProperty(k);
}

/** Iniciales 1–2 letras para avatar fallback cuando no hay logo. */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
