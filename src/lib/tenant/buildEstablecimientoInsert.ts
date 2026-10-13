import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
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

function taglineForTipo(tipo: EstablecimientoTipo): string {
  if (tipo === "agricola") return "AI · Campo";
  if (tipo === "mixto") return "AI · Mixto";
  return "AI · Ganadera";
}

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

  return {
    nombre,
    ubicacion,
    tipo,
    user_id: input.userId,
    nombre_display: nombre,
    logo_url: "/logo-makeka.png",
    tagline: taglineForTipo(tipo),
    rubros: defaultRubrosForTipo(tipo),
    modules_enabled: defaultModulesForTipo(tipo),
    is_platform_demo: isPlatformDemoEmail(input.email),
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
