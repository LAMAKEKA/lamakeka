export type EstablecimientoTipo = "ganadero" | "agricola" | "mixto";

export interface TenantConfig {
  establecimientoId: string;
  nombre: string;
  nombreDisplay: string;
  logoUrl: string;
  tagline: string;
  tipo: EstablecimientoTipo;
  rubros: string[];
  modulesEnabled: string[];
  isPlatformDemo: boolean;
  brandTheme: Record<string, string> | null;
}

export { PLATFORM_DEMO_EMAIL, isPlatformDemoEmail } from "./platformDemo";
