"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  mapEstablecimientoRow,
  type EstablecimientoRow,
} from "@/lib/tenant/resolveTenant";
import type { TenantConfig } from "@/lib/tenant/types";
import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
  defaultLogoUrl,
  MAKEKA_LEGACY_MODULES,
} from "@/lib/modules/defaults";

export type TenantState = {
  tenant: TenantConfig | null;
  loading: boolean;
  /** true si usamos fallback legacy (error schema o sin datos útiles) */
  usedFallback: boolean;
};

const SELECT_FULL =
  "id, nombre, tipo, nombre_display, logo_url, tagline, rubros, modules_enabled, is_platform_demo, brand_theme, slug";

const SELECT_MIN = "id, nombre, tipo";

/** Solo crash total sin fila: pack Makeka (cero regresión shell). */
function emergencyMakekaFallback(): TenantConfig {
  return {
    establecimientoId: "",
    nombre: "La Makeka",
    nombreDisplay: "La Makeka",
    logoUrl: defaultLogoUrl(),
    tagline: "AI · Ganadera",
    tipo: "ganadero",
    rubros: ["ganaderia"],
    modulesEnabled: [...MAKEKA_LEGACY_MODULES],
    isPlatformDemo: false,
    brandTheme: null,
  };
}

/** Fila mínima (schema viejo): defaults por tipo, no pack Makeka. */
function minRowFallback(row: {
  id: string;
  nombre: string;
  tipo: string;
}): TenantConfig {
  return mapEstablecimientoRow({
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
  });
}

export function useTenant(): TenantState {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setTenant(null);
          setLoading(false);
        }
        return;
      }

      const full = await supabase
        .from("establecimientos")
        .select(SELECT_FULL)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!full.error && full.data) {
        setTenant(mapEstablecimientoRow(full.data as EstablecimientoRow));
        setUsedFallback(false);
        setLoading(false);
        return;
      }

      // SELECT_FULL puede fallar si falta `slug` u otra col — reintentar sin slug
      if (full.error) {
        const fullNoSlug = await supabase
          .from("establecimientos")
          .select(
            "id, nombre, tipo, nombre_display, logo_url, tagline, rubros, modules_enabled, is_platform_demo, brand_theme"
          )
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (!fullNoSlug.error && fullNoSlug.data) {
          setTenant(
            mapEstablecimientoRow(fullNoSlug.data as EstablecimientoRow)
          );
          setUsedFallback(false);
          setLoading(false);
          return;
        }
      }

      const min = await supabase
        .from("establecimientos")
        .select(SELECT_MIN)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!min.error && min.data) {
        const row = min.data as { id: string; nombre: string; tipo: string };
        setTenant(minRowFallback(row));
        setUsedFallback(true);
        setLoading(false);
        return;
      }

      setTenant(emergencyMakekaFallback());
      setUsedFallback(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tenant, loading, usedFallback };
}

/** Helper UI: ¿módulo on? */
export function tenantHasModule(
  tenant: TenantConfig | null | undefined,
  moduleId: string
): boolean {
  if (!tenant?.modulesEnabled?.length) {
    return defaultModulesForTipo(tenant?.tipo ?? "ganadero").includes(
      moduleId as never
    );
  }
  return tenant.modulesEnabled.includes(moduleId);
}

export function tenantRubros(
  tenant: TenantConfig | null | undefined
): string[] {
  if (tenant?.rubros?.length) return tenant.rubros;
  return defaultRubrosForTipo(tenant?.tipo ?? "ganadero");
}
