"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  mapEstablecimientoRow,
  type EstablecimientoRow,
} from "@/lib/tenant/resolveTenant";
import type { TenantConfig } from "@/lib/tenant/types";
import { MAKEKA_LEGACY_MODULES } from "@/lib/modules/defaults";

export type TenantState = {
  tenant: TenantConfig | null;
  loading: boolean;
  /** true si usamos fallback legacy (error schema o sin datos útiles) */
  usedFallback: boolean;
};

const SELECT_FULL =
  "id, nombre, tipo, nombre_display, logo_url, tagline, rubros, modules_enabled, is_platform_demo, brand_theme";

const SELECT_MIN = "id, nombre, tipo";

function makekaFallback(partial?: {
  id?: string;
  nombre?: string;
  tipo?: string;
}): TenantConfig {
  const tipo =
    partial?.tipo === "agricola" ||
    partial?.tipo === "mixto" ||
    partial?.tipo === "ganadero"
      ? partial.tipo
      : "ganadero";
  return {
    establecimientoId: partial?.id ?? "",
    nombre: partial?.nombre ?? "La Makeka",
    nombreDisplay: partial?.nombre ?? "La Makeka",
    logoUrl: "/logo-makeka.png",
    tagline: "AI · Ganadera",
    tipo,
    rubros:
      tipo === "agricola"
        ? ["agricola"]
        : tipo === "mixto"
          ? ["ganaderia", "agricola"]
          : ["ganaderia"],
    modulesEnabled: [...MAKEKA_LEGACY_MODULES],
    isPlatformDemo: false,
    brandTheme: null,
  };
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

      const min = await supabase
        .from("establecimientos")
        .select(SELECT_MIN)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!min.error && min.data) {
        const row = min.data as { id: string; nombre: string; tipo: string };
        setTenant(
          mapEstablecimientoRow({
            id: row.id,
            nombre: row.nombre,
            tipo: row.tipo,
          })
        );
        setUsedFallback(true);
        setLoading(false);
        return;
      }

      setTenant(makekaFallback());
      setUsedFallback(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tenant, loading, usedFallback };
}
