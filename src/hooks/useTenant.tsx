"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  /** Relee establecimientos del user (post-save config). */
  refresh: () => Promise<void>;
  /** Patch local sin round-trip (optimistic UI). */
  patchTenant: (partial: Partial<TenantConfig>) => void;
};

const SELECT_FULL =
  "id, nombre, tipo, nombre_display, logo_url, tagline, rubros, modules_enabled, is_platform_demo, brand_theme, slug";

const SELECT_MIN = "id, nombre, tipo";

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

async function loadTenantForUser(): Promise<{
  tenant: TenantConfig | null;
  usedFallback: boolean;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { tenant: null, usedFallback: false };
  }

  const full = await supabase
    .from("establecimientos")
    .select(SELECT_FULL)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!full.error && full.data) {
    return {
      tenant: mapEstablecimientoRow(full.data as EstablecimientoRow),
      usedFallback: false,
    };
  }

  if (full.error) {
    const fullNoSlug = await supabase
      .from("establecimientos")
      .select(
        "id, nombre, tipo, nombre_display, logo_url, tagline, rubros, modules_enabled, is_platform_demo, brand_theme"
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!fullNoSlug.error && fullNoSlug.data) {
      return {
        tenant: mapEstablecimientoRow(fullNoSlug.data as EstablecimientoRow),
        usedFallback: false,
      };
    }
  }

  const min = await supabase
    .from("establecimientos")
    .select(SELECT_MIN)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!min.error && min.data) {
    const row = min.data as { id: string; nombre: string; tipo: string };
    return { tenant: minRowFallback(row), usedFallback: true };
  }

  return { tenant: emergencyMakekaFallback(), usedFallback: true };
}

const TenantContext = createContext<TenantState | null>(null);

const idleRefresh = async () => {};
const idlePatch = (_partial: Partial<TenantConfig>) => {};

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);

  const refresh = useCallback(async () => {
    const result = await loadTenantForUser();
    setTenant(result.tenant);
    setUsedFallback(result.usedFallback);
    setLoading(false);
  }, []);

  const patchTenant = useCallback((partial: Partial<TenantConfig>) => {
    setTenant((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadTenantForUser();
      if (cancelled) return;
      setTenant(result.tenant);
      setUsedFallback(result.usedFallback);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<TenantState>(
    () => ({ tenant, loading, usedFallback, refresh, patchTenant }),
    [tenant, loading, usedFallback, refresh, patchTenant]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

/**
 * Consume el tenant del shell. Si no hay provider (tests / login pages),
 * devuelve estado vacío estable (no fetch duplicado).
 */
export function useTenant(): TenantState {
  const ctx = useContext(TenantContext);
  if (ctx) return ctx;
  return {
    tenant: null,
    loading: false,
    usedFallback: false,
    refresh: idleRefresh,
    patchTenant: idlePatch,
  };
}

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
