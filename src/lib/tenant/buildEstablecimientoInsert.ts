import {
  defaultLogoUrl,
  defaultModulesForTipo,
  defaultRubrosForTipo,
  defaultTaglineForTipo,
  PLATFORM_DEMO_MODULES,
} from "@/lib/modules/defaults";
import { isPlatformDemoEmail } from "@/lib/tenant/platformDemo";
import type { EstablecimientoTipo } from "@/lib/tenant/types";

export type EstablecimientoInsertFull = {
  nombre: string;
  ubicacion: string;
  tipo: EstablecimientoTipo;
  user_id: string;
  nombre_display: string;
  logo_url: string;
  tagline: string;
  rubros: string[];
  modules_enabled: string[];
  is_platform_demo: boolean;
};

export type EstablecimientoInsertLegacy = {
  nombre: string;
  ubicacion: string;
  tipo: EstablecimientoTipo;
  user_id: string;
};

export function buildEstablecimientoInsert(input: {
  nombre: string;
  ubicacion: string;
  tipo: EstablecimientoTipo;
  userId: string;
  email: string | null | undefined;
}): EstablecimientoInsertFull {
  const nombre = input.nombre.trim();
  const ubicacion = input.ubicacion.trim();
  const tipo = input.tipo;
  const demo = isPlatformDemoEmail(input.email);

  return {
    nombre,
    ubicacion,
    tipo,
    user_id: input.userId,
    // Branding del campo: el nombre que eligió el user, NO "La Makeka"
    nombre_display: nombre,
    logo_url: defaultLogoUrl(),
    tagline: demo ? "Plataforma multi-rubro" : defaultTaglineForTipo(tipo),
    rubros: defaultRubrosForTipo(tipo),
    // Demo lab: subset fijo. Resto: solo módulos del tipo elegido.
    modules_enabled: demo
      ? [...PLATFORM_DEMO_MODULES]
      : [...defaultModulesForTipo(tipo)],
    is_platform_demo: demo,
  };
}

export function toLegacyEstablecimientoInsert(
  full: EstablecimientoInsertFull
): EstablecimientoInsertLegacy {
  return {
    nombre: full.nombre,
    ubicacion: full.ubicacion,
    tipo: full.tipo,
    user_id: full.user_id,
  };
}

export function isUniqueViolation(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "23505" || /duplicate|unique/i.test(error.message ?? "")
  );
}
