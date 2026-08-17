# Producción de huevos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección `/produccion` para lotes de gallinas, carga diaria en maples, merma obligatoria, movimientos de plantel, pestaña en Reportes y categorías nuevas en Finanzas.

**Architecture:** Tres tablas nuevas (`lotes_gallinas`, `produccion_huevos`, `movimientos_gallinas`) con RLS por establecimiento. La lógica pura (conversión maple, postura, mortalidad, plantel) vive en `src/lib/produccion.ts` y se testea con vitest. La página y el hook siguen el patrón de SENASA/Hacienda (client components + `createClient()`).

**Tech Stack:** Next.js 16.2.6 App Router, React 19, TypeScript, Supabase (Postgres + RLS), Tailwind CSS v4, lucide-react, vitest.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-17-produccion-huevos-design.md`. No inventar campos ni métricas.
- **1 maple = 30 huevos.** No persistir columna `huevos`.
- **Merma obligatoria** en unidades. `0` válido. Vacío/negativo no guarda.
- **Costo/huevo y margen:** no calcular, no mostrar.
- **Turismo, Hacienda, Manga, SENASA:** no tocar.
- **Estilo:** inline `style={{}}` con `--color-campo`, `--color-cuero`, `--color-tierra`, `--color-pampa`. Textos es-AR. Fechas `dd/mm/yyyy`.
- **TDD** en `src/lib/produccion.ts` / `src/lib/produccion.test.ts`. UI se verifica con `npm run lint` + `npm run typecheck` + `npm test`.
- **Commits:** uno por tarea, `feat:` / `fix:` / `docs:`.
- **No agregar** testing-library ni dependencias nuevas.

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260817010000_produccion_huevos.sql` | Tablas, constraints, RLS, grants |
| `src/lib/produccion.ts` | Constantes + métricas puras |
| `src/lib/produccion.test.ts` | Tests vitest de esas funciones |
| `src/hooks/useProduccion.ts` | CRUD lotes / producción / movimientos |
| `src/app/produccion/page.tsx` | UI única de la sección |
| `src/components/sidebar.tsx` | Ítem Producción |
| `src/app/reportes/page.tsx` | Tab Producción |
| `src/app/finanzas/page.tsx` | Categorías nuevas |

---

### Task 1: Migración

**Files:**
- Create: `supabase/migrations/20260817010000_produccion_huevos.sql`

**Interfaces:**
- Consumes: `public.establecimientos(id)`.
- Produces: tablas `lotes_gallinas`, `produccion_huevos`, `movimientos_gallinas` con RLS y grants.

- [ ] **Step 1: Crear la migración**

```sql
-- Producción de huevos: lotes, carga diaria, movimientos de plantel.

CREATE TABLE public.lotes_gallinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    nombre text NOT NULL,
    cantidad integer NOT NULL,
    galpon text,
    fecha_alta date DEFAULT CURRENT_DATE NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lotes_gallinas_pkey PRIMARY KEY (id),
    CONSTRAINT lotes_gallinas_cantidad_check CHECK ((cantidad >= 0)),
    CONSTRAINT lotes_gallinas_nombre_check CHECK ((char_length(btrim(nombre)) > 0)),
    CONSTRAINT lotes_gallinas_establecimiento_id_fkey
      FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE
);

CREATE TABLE public.produccion_huevos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    lote_id uuid NOT NULL,
    fecha date NOT NULL,
    maples integer NOT NULL,
    merma integer NOT NULL,
    observaciones text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT produccion_huevos_pkey PRIMARY KEY (id),
    CONSTRAINT produccion_huevos_maples_check CHECK ((maples >= 0)),
    CONSTRAINT produccion_huevos_merma_check CHECK ((merma >= 0)),
    CONSTRAINT produccion_huevos_lote_fecha_key UNIQUE (lote_id, fecha),
    CONSTRAINT produccion_huevos_establecimiento_id_fkey
      FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    CONSTRAINT produccion_huevos_lote_id_fkey
      FOREIGN KEY (lote_id) REFERENCES public.lotes_gallinas(id) ON DELETE RESTRICT
);

CREATE TABLE public.movimientos_gallinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    lote_id uuid NOT NULL,
    tipo text NOT NULL,
    cantidad integer NOT NULL,
    fecha date NOT NULL,
    motivo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimientos_gallinas_pkey PRIMARY KEY (id),
    CONSTRAINT movimientos_gallinas_tipo_check CHECK ((tipo = ANY (ARRAY['alta'::text, 'muerte'::text, 'venta'::text]))),
    CONSTRAINT movimientos_gallinas_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT movimientos_gallinas_establecimiento_id_fkey
      FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    CONSTRAINT movimientos_gallinas_lote_id_fkey
      FOREIGN KEY (lote_id) REFERENCES public.lotes_gallinas(id) ON DELETE RESTRICT
);

CREATE INDEX lotes_gallinas_estab_vivos_idx
  ON public.lotes_gallinas USING btree (establecimiento_id)
  WHERE (deleted_at IS NULL);

CREATE INDEX produccion_huevos_estab_fecha_idx
  ON public.produccion_huevos USING btree (establecimiento_id, fecha DESC);

CREATE INDEX movimientos_gallinas_estab_fecha_idx
  ON public.movimientos_gallinas USING btree (establecimiento_id, fecha DESC);

ALTER TABLE public.lotes_gallinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_huevos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_gallinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY lotes_gallinas_select ON public.lotes_gallinas FOR SELECT
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY lotes_gallinas_insert ON public.lotes_gallinas FOR INSERT
  WITH CHECK ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY lotes_gallinas_update ON public.lotes_gallinas FOR UPDATE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY lotes_gallinas_delete ON public.lotes_gallinas FOR DELETE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));

CREATE POLICY produccion_huevos_select ON public.produccion_huevos FOR SELECT
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY produccion_huevos_insert ON public.produccion_huevos FOR INSERT
  WITH CHECK ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY produccion_huevos_update ON public.produccion_huevos FOR UPDATE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY produccion_huevos_delete ON public.produccion_huevos FOR DELETE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));

CREATE POLICY movimientos_gallinas_select ON public.movimientos_gallinas FOR SELECT
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY movimientos_gallinas_insert ON public.movimientos_gallinas FOR INSERT
  WITH CHECK ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY movimientos_gallinas_update ON public.movimientos_gallinas FOR UPDATE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY movimientos_gallinas_delete ON public.movimientos_gallinas FOR DELETE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));

GRANT ALL ON TABLE public.lotes_gallinas TO anon;
GRANT ALL ON TABLE public.lotes_gallinas TO authenticated;
GRANT ALL ON TABLE public.lotes_gallinas TO service_role;
GRANT ALL ON TABLE public.produccion_huevos TO anon;
GRANT ALL ON TABLE public.produccion_huevos TO authenticated;
GRANT ALL ON TABLE public.produccion_huevos TO service_role;
GRANT ALL ON TABLE public.movimientos_gallinas TO anon;
GRANT ALL ON TABLE public.movimientos_gallinas TO authenticated;
GRANT ALL ON TABLE public.movimientos_gallinas TO service_role;
```

- [ ] **Step 2: Aplicar la migración**

Run: `npx supabase db push`
Expected: tablas creadas sin error.

Si el CLI no está linkeado, pegar el SQL en el editor de Supabase y confirmar que corre.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260817010000_produccion_huevos.sql
git commit -m "feat: migración — lotes, producción de huevos y movimientos"
```

---

### Task 2: Lógica pura + tests

**Files:**
- Create: `src/lib/produccion.ts`
- Test: `src/lib/produccion.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `HUEVOS_POR_MAPLE: 30`
  - `TIPOS_MOVIMIENTO_GALLINA: ["alta","muerte","venta"]`
  - `TipoMovimientoGallina`
  - `maplesToHuevos(maples: number): number`
  - `parseEnteroNoNegativo(raw: string): number | null`
  - `daysInclusive(desde: string, hasta: string): number`
  - `calcularPostura(huevosPuestos: number, plantel: number, dias: number): number | null`
  - `calcularPlantelInicial(plantelActual: number, altas: number, muertes: number, ventas: number): number`
  - `calcularMortalidad(muertes: number, plantelInicial: number): number | null`
  - `nuevaCantidad(actual: number, tipo: TipoMovimientoGallina, n: number): number | null`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/produccion.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  maplesToHuevos,
  parseEnteroNoNegativo,
  daysInclusive,
  calcularPostura,
  calcularPlantelInicial,
  calcularMortalidad,
  nuevaCantidad,
} from "./produccion";

describe("maplesToHuevos", () => {
  it("convierte 0 maples a 0 huevos", () => {
    expect(maplesToHuevos(0)).toBe(0);
  });

  it("convierte 4 maples a 120 huevos", () => {
    expect(maplesToHuevos(4)).toBe(120);
  });
});

describe("parseEnteroNoNegativo", () => {
  it("acepta 0", () => {
    expect(parseEnteroNoNegativo("0")).toBe(0);
  });

  it("acepta enteros positivos", () => {
    expect(parseEnteroNoNegativo("12")).toBe(12);
  });

  it("rechaza vacío", () => {
    expect(parseEnteroNoNegativo("")).toBeNull();
  });

  it("rechaza negativo", () => {
    expect(parseEnteroNoNegativo("-1")).toBeNull();
  });

  it("rechaza decimal", () => {
    expect(parseEnteroNoNegativo("1.5")).toBeNull();
  });
});

describe("daysInclusive", () => {
  it("cuenta un solo día", () => {
    expect(daysInclusive("2026-08-01", "2026-08-01")).toBe(1);
  });

  it("cuenta un mes de 31 días", () => {
    expect(daysInclusive("2026-08-01", "2026-08-31")).toBe(31);
  });
});

describe("calcularPostura", () => {
  it("devuelve null si el plantel es 0", () => {
    expect(calcularPostura(70, 0, 1)).toBeNull();
  });

  it("devuelve null si los días son 0", () => {
    expect(calcularPostura(70, 20, 0)).toBeNull();
  });

  it("calcula 3.5 con 2 maples + 10 merma, 20 gallinas, 1 día", () => {
    expect(calcularPostura(70, 20, 1)).toBe(3.5);
  });
});

describe("calcularPlantelInicial", () => {
  it("reconstruye 95 desde 90 actuales + 5 muertes", () => {
    expect(calcularPlantelInicial(90, 0, 5, 0)).toBe(95);
  });
});

describe("calcularMortalidad", () => {
  it("devuelve null si plantelInicial <= 0", () => {
    expect(calcularMortalidad(5, 0)).toBeNull();
  });

  it("calcula 5/95", () => {
    expect(calcularMortalidad(5, 95)).toBeCloseTo(5 / 95);
  });
});

describe("nuevaCantidad", () => {
  it("suma en alta", () => {
    expect(nuevaCantidad(90, "alta", 10)).toBe(100);
  });

  it("resta en muerte", () => {
    expect(nuevaCantidad(90, "muerte", 5)).toBe(85);
  });

  it("devuelve null si el plantel quedaría negativo", () => {
    expect(nuevaCantidad(3, "venta", 5)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `npx vitest run src/lib/produccion.test.ts`
Expected: FAIL — `Cannot find module './produccion'` (o exports missing).

- [ ] **Step 3: Implementación mínima**

Crear `src/lib/produccion.ts`:

```ts
export const HUEVOS_POR_MAPLE = 30;

export const TIPOS_MOVIMIENTO_GALLINA = ["alta", "muerte", "venta"] as const;
export type TipoMovimientoGallina = (typeof TIPOS_MOVIMIENTO_GALLINA)[number];

export function maplesToHuevos(maples: number): number {
  return maples * HUEVOS_POR_MAPLE;
}

export function parseEnteroNoNegativo(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

export function daysInclusive(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${hasta}T00:00:00`);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export function calcularPostura(huevosPuestos: number, plantel: number, dias: number): number | null {
  if (plantel <= 0 || dias <= 0) return null;
  return huevosPuestos / plantel / dias;
}

export function calcularPlantelInicial(
  plantelActual: number,
  altas: number,
  muertes: number,
  ventas: number,
): number {
  return plantelActual + muertes + ventas - altas;
}

export function calcularMortalidad(muertes: number, plantelInicial: number): number | null {
  if (plantelInicial <= 0) return null;
  return muertes / plantelInicial;
}

export function nuevaCantidad(
  actual: number,
  tipo: TipoMovimientoGallina,
  n: number,
): number | null {
  const next = tipo === "alta" ? actual + n : actual - n;
  return next < 0 ? null : next;
}
```

- [ ] **Step 4: Correr tests**

Run: `npx vitest run src/lib/produccion.test.ts`
Expected: PASS, todos verdes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/produccion.ts src/lib/produccion.test.ts
git commit -m "feat: métricas de producción de huevos (maple, postura, mortalidad)"
```

---

### Task 3: Hook `useProduccion`

**Files:**
- Create: `src/hooks/useProduccion.ts`

**Interfaces:**
- Consumes: `createClient`, `TipoMovimientoGallina`, `nuevaCantidad`.
- Produces:

```ts
export interface LoteGallinas {
  id: string;
  establecimiento_id: string;
  nombre: string;
  cantidad: number;
  galpon: string | null;
  fecha_alta: string;
  activo: boolean;
  deleted_at: string | null;
}

export interface RegistroProduccion {
  id: string;
  establecimiento_id: string;
  lote_id: string;
  fecha: string;
  maples: number;
  merma: number;
  observaciones: string | null;
}

export interface MovimientoGallina {
  id: string;
  establecimiento_id: string;
  lote_id: string;
  tipo: TipoMovimientoGallina;
  cantidad: number;
  fecha: string;
  motivo: string | null;
}

export function useProduccion(): {
  lotes: LoteGallinas[];
  registros: RegistroProduccion[];
  movimientos: MovimientoGallina[];
  loading: boolean;
  saving: boolean;
  fetchAll: (establecimientoId: string) => Promise<void>;
  createLote: (input: { establecimiento_id: string; nombre: string; cantidad: number; galpon: string | null; fecha_alta: string }) => Promise<{ error: string | null }>;
  updateLote: (id: string, patch: { nombre: string; galpon: string | null }) => Promise<{ error: string | null }>;
  deactivateLote: (id: string) => Promise<{ error: string | null }>;
  findProduccion: (loteId: string, fecha: string) => RegistroProduccion | undefined;
  saveProduccion: (input: { establecimiento_id: string; lote_id: string; fecha: string; maples: number; merma: number; observaciones: string | null; replaceId?: string }) => Promise<{ error: string | null }>;
  applyMovimiento: (input: { establecimiento_id: string; lote_id: string; tipo: TipoMovimientoGallina; cantidad: number; fecha: string; motivo: string | null }) => Promise<{ error: string | null }>;
}
```

- [ ] **Step 1: Crear el hook**

```ts
"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { nuevaCantidad, type TipoMovimientoGallina } from "@/lib/produccion";

export interface LoteGallinas {
  id: string;
  establecimiento_id: string;
  nombre: string;
  cantidad: number;
  galpon: string | null;
  fecha_alta: string;
  activo: boolean;
  deleted_at: string | null;
}

export interface RegistroProduccion {
  id: string;
  establecimiento_id: string;
  lote_id: string;
  fecha: string;
  maples: number;
  merma: number;
  observaciones: string | null;
}

export interface MovimientoGallina {
  id: string;
  establecimiento_id: string;
  lote_id: string;
  tipo: TipoMovimientoGallina;
  cantidad: number;
  fecha: string;
  motivo: string | null;
}

export function useProduccion() {
  const [lotes, setLotes] = useState<LoteGallinas[]>([]);
  const [registros, setRegistros] = useState<RegistroProduccion[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoGallina[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async (establecimientoId: string) => {
    setLoading(true);
    const supabase = createClient();
    const [lotesRes, prodRes, movRes] = await Promise.all([
      supabase
        .from("lotes_gallinas")
        .select("id, establecimiento_id, nombre, cantidad, galpon, fecha_alta, activo, deleted_at")
        .eq("establecimiento_id", establecimientoId)
        .is("deleted_at", null)
        .order("nombre"),
      supabase
        .from("produccion_huevos")
        .select("id, establecimiento_id, lote_id, fecha, maples, merma, observaciones")
        .eq("establecimiento_id", establecimientoId)
        .order("fecha", { ascending: false }),
      supabase
        .from("movimientos_gallinas")
        .select("id, establecimiento_id, lote_id, tipo, cantidad, fecha, motivo")
        .eq("establecimiento_id", establecimientoId)
        .order("fecha", { ascending: false }),
    ]);
    setLotes((lotesRes.data ?? []) as LoteGallinas[]);
    setRegistros((prodRes.data ?? []) as RegistroProduccion[]);
    setMovimientos((movRes.data ?? []) as MovimientoGallina[]);
    setLoading(false);
  }, []);

  async function createLote(input: {
    establecimiento_id: string;
    nombre: string;
    cantidad: number;
    galpon: string | null;
    fecha_alta: string;
  }) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("lotes_gallinas").insert({
      establecimiento_id: input.establecimiento_id,
      nombre: input.nombre.trim(),
      cantidad: input.cantidad,
      galpon: input.galpon,
      fecha_alta: input.fecha_alta,
      activo: true,
    });
    setSaving(false);
    if (error) return { error: error.message };
    await fetchAll(input.establecimiento_id);
    return { error: null };
  }

  async function updateLote(id: string, patch: { nombre: string; galpon: string | null }) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("lotes_gallinas")
      .update({ nombre: patch.nombre.trim(), galpon: patch.galpon, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);
    if (error) return { error: error.message };
    setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, nombre: patch.nombre.trim() } : l)));
    return { error: null };
  }

  async function deactivateLote(id: string) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("lotes_gallinas")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);
    if (error) return { error: error.message };
    setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, activo: false } : l)));
    return { error: null };
  }

  function findProduccion(loteId: string, fecha: string) {
    return registros.find((r) => r.lote_id === loteId && r.fecha === fecha);
  }

  async function saveProduccion(input: {
    establecimiento_id: string;
    lote_id: string;
    fecha: string;
    maples: number;
    merma: number;
    observaciones: string | null;
    replaceId?: string;
  }) {
    setSaving(true);
    const supabase = createClient();
    const payload = {
      establecimiento_id: input.establecimiento_id,
      lote_id: input.lote_id,
      fecha: input.fecha,
      maples: input.maples,
      merma: input.merma,
      observaciones: input.observaciones,
      updated_at: new Date().toISOString(),
    };
    const { error } = input.replaceId
      ? await supabase.from("produccion_huevos").update(payload).eq("id", input.replaceId)
      : await supabase.from("produccion_huevos").insert(payload);
    setSaving(false);
    if (error) return { error: error.message };
    await fetchAll(input.establecimiento_id);
    return { error: null };
  }

  async function applyMovimiento(input: {
    establecimiento_id: string;
    lote_id: string;
    tipo: TipoMovimientoGallina;
    cantidad: number;
    fecha: string;
    motivo: string | null;
  }) {
    const lote = lotes.find((l) => l.id === input.lote_id);
    if (!lote) return { error: "Lote no encontrado." };
    if (!lote.activo) return { error: "Ese lote está desactivado." };
    const next = nuevaCantidad(lote.cantidad, input.tipo, input.cantidad);
    if (next === null) return { error: "No hay tantas gallinas en el lote." };

    setSaving(true);
    const supabase = createClient();
    const { error: updError } = await supabase
      .from("lotes_gallinas")
      .update({ cantidad: next, updated_at: new Date().toISOString() })
      .eq("id", input.lote_id);
    if (updError) {
      setSaving(false);
      return { error: updError.message };
    }
    const { error: insError } = await supabase.from("movimientos_gallinas").insert({
      establecimiento_id: input.establecimiento_id,
      lote_id: input.lote_id,
      tipo: input.tipo,
      cantidad: input.cantidad,
      fecha: input.fecha,
      motivo: input.motivo,
    });
    setSaving(false);
    if (insError) return { error: insError.message };
    await fetchAll(input.establecimiento_id);
    return { error: null };
  }

  return {
    lotes,
    registros,
    movimientos,
    loading,
    saving,
    fetchAll,
    createLote,
    updateLote,
    deactivateLote,
    findProduccion,
    saveProduccion,
    applyMovimiento,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (sin errores nuevos).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProduccion.ts
git commit -m "feat: hook useProduccion para lotes, carga diaria y movimientos"
```

---

### Task 4: Página `/produccion` + menú

**Files:**
- Create: `src/app/produccion/page.tsx`
- Modify: `src/components/sidebar.tsx`

**Interfaces:**
- Consumes: `useProduccion`, `maplesToHuevos`, `parseEnteroNoNegativo`, `calcularPostura`, `daysInclusive`, `TIPOS_MOVIMIENTO_GALLINA`.
- Produces: ruta `/produccion` usable y ítem de menú "Producción".

- [ ] **Step 1: Agregar el ítem al sidebar**

En `src/components/sidebar.tsx`:

1. Importar `Egg` de `lucide-react` junto a los otros íconos.
2. Insertar el item **después de Hacienda**:

```ts
  { href: "/hacienda", label: "Hacienda", icon: Beef },
  { href: "/produccion", label: "Producción", icon: Egg },
  { href: "/potreros", label: "Potreros", icon: Map },
```

3. Cambiar el active check de `pathname === href` a:

```ts
const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
```

- [ ] **Step 2: Crear `src/app/produccion/page.tsx`**

Usar este archivo completo (mismo look que SENASA):

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Egg, Loader2, Plus, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProduccion } from "@/hooks/useProduccion";
import {
  TIPOS_MOVIMIENTO_GALLINA,
  calcularPostura,
  daysInclusive,
  maplesToHuevos,
  parseEnteroNoNegativo,
  type TipoMovimientoGallina,
} from "@/lib/produccion";

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "#ffffff",
  color: "var(--color-tierra)",
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtPostura(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export default function ProduccionPage() {
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const {
    lotes, registros, movimientos, loading, saving,
    fetchAll, createLote, updateLote, deactivateLote,
    findProduccion, saveProduccion, applyMovimiento,
  } = useProduccion();

  const [loteNombre, setLoteNombre] = useState("");
  const [loteCantidad, setLoteCantidad] = useState("");
  const [loteGalpon, setLoteGalpon] = useState("");
  const [editingLoteId, setEditingLoteId] = useState<string | null>(null);

  const [cargaLoteId, setCargaLoteId] = useState("");
  const [cargaFecha, setCargaFecha] = useState(todayISO);
  const [cargaMaples, setCargaMaples] = useState("");
  const [cargaMerma, setCargaMerma] = useState("");
  const [cargaObs, setCargaObs] = useState("");

  const [movLoteId, setMovLoteId] = useState("");
  const [movTipo, setMovTipo] = useState<TipoMovimientoGallina>("alta");
  const [movCantidad, setMovCantidad] = useState("");
  const [movFecha, setMovFecha] = useState(todayISO);
  const [movMotivo, setMovMotivo] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("establecimientos").select("id").limit(1).maybeSingle();
      if (data) {
        setEstablecimientoId(data.id);
        fetchAll(data.id);
      }
    })();
  }, [fetchAll]);

  const lotesActivos = lotes.filter((l) => l.activo);
  const loteById = useMemo(() => Object.fromEntries(lotes.map((l) => [l.id, l])), [lotes]);

  const postura7 = useMemo(() => {
    const desde = daysAgoISO(6);
    const hasta = todayISO();
    const dias = daysInclusive(desde, hasta);
    const map = new Map<string, number>();
    for (const l of lotes) {
      const rows = registros.filter((r) => r.lote_id === l.id && r.fecha >= desde && r.fecha <= hasta);
      const puestos = rows.reduce((s, r) => s + maplesToHuevos(r.maples) + r.merma, 0);
      map.set(l.id, calcularPostura(puestos, l.cantidad, dias) ?? NaN);
    }
    return map;
  }, [lotes, registros]);

  async function handleSaveLote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!establecimientoId) return;
    if (!loteNombre.trim()) { setError("El lote necesita un nombre."); return; }
    if (editingLoteId) {
      const { error: err } = await updateLote(editingLoteId, { nombre: loteNombre, galpon: loteGalpon.trim() || null });
      if (err) { setError(err); return; }
      setEditingLoteId(null);
    } else {
      const cant = parseEnteroNoNegativo(loteCantidad);
      if (cant === null) { setError("La cantidad de gallinas tiene que ser un entero de 0 en adelante."); return; }
      const { error: err } = await createLote({
        establecimiento_id: establecimientoId,
        nombre: loteNombre,
        cantidad: cant,
        galpon: loteGalpon.trim() || null,
        fecha_alta: todayISO(),
      });
      if (err) { setError(err); return; }
    }
    setLoteNombre("");
    setLoteCantidad("");
    setLoteGalpon("");
    setNotice("Lote guardado.");
  }

  async function handleCarga(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!establecimientoId) return;
    const lote = lotes.find((l) => l.id === cargaLoteId);
    if (!lote || !lote.activo) { setError("Ese lote está desactivado."); return; }
    const maples = parseEnteroNoNegativo(cargaMaples);
    const merma = parseEnteroNoNegativo(cargaMerma);
    if (maples === null || merma === null) {
      if (cargaMerma.trim() === "") { setError("La merma es obligatoria. Si no hubo, poné 0."); return; }
      setError("Maples y merma tienen que ser números enteros de 0 en adelante.");
      return;
    }
    const existing = findProduccion(cargaLoteId, cargaFecha);
    if (existing && !window.confirm("Ya hay carga para este lote en esa fecha. ¿Reemplazar?")) return;
    const { error: err } = await saveProduccion({
      establecimiento_id: establecimientoId,
      lote_id: cargaLoteId,
      fecha: cargaFecha,
      maples,
      merma,
      observaciones: cargaObs.trim() || null,
      replaceId: existing?.id,
    });
    if (err) { setError(err); return; }
    setCargaMaples("");
    setCargaMerma("");
    setCargaObs("");
    setNotice("Producción guardada.");
  }

  async function handleMovimiento(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!establecimientoId) return;
    const lote = lotes.find((l) => l.id === movLoteId);
    if (!lote || !lote.activo) { setError("Ese lote está desactivado."); return; }
    const cant = parseEnteroNoNegativo(movCantidad);
    if (cant === null || cant === 0) { setError("La cantidad tiene que ser un entero mayor a 0."); return; }
    const { error: err } = await applyMovimiento({
      establecimiento_id: establecimientoId,
      lote_id: movLoteId,
      tipo: movTipo,
      cantidad: cant,
      fecha: movFecha,
      motivo: movMotivo.trim() || null,
    });
    if (err) { setError(err); return; }
    setMovCantidad("");
    setMovMotivo("");
    setNotice("Movimiento registrado.");
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Huevos</p>
        <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Producción</h1>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {notice && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(58,74,50,0.08)", color: "var(--color-campo)" }}>{notice}</div>
        )}

        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Lotes</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin" style={{ color: "var(--color-campo)" }} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {lotes.map((l) => {
                const p = postura7.get(l.id);
                return (
                  <div key={l.id} className="rounded-xl p-4" style={{ border: "1px solid rgba(212,197,169,0.5)", opacity: l.activo ? 1 : 0.55 }}>
                    <p className="font-semibold" style={{ color: "var(--color-tierra)" }}>{l.nombre}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(26,26,24,0.45)" }}>{l.galpon || "Sin galpón"} · {l.cantidad} gallinas</p>
                    <p className="text-sm mt-2" style={{ color: "var(--color-campo)" }}>Postura 7d: {fmtPostura(p === undefined || Number.isNaN(p) ? null : p)}</p>
                    <div className="flex gap-2 mt-3">
                      <button type="button" className="text-xs font-medium" style={{ color: "var(--color-cuero)" }}
                        onClick={() => { setEditingLoteId(l.id); setLoteNombre(l.nombre); setLoteGalpon(l.galpon ?? ""); }}>
                        Editar
                      </button>
                      {l.activo && (
                        <button type="button" className="text-xs font-medium" style={{ color: "#dc2626" }}
                          onClick={() => deactivateLote(l.id)}>
                          Desactivar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <form onSubmit={handleSaveLote} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Nombre
              <input value={loteNombre} onChange={(e) => setLoteNombre(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            {!editingLoteId && (
              <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
                Gallinas
                <input value={loteCantidad} onChange={(e) => setLoteCantidad(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
              </label>
            )}
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Galpón
              <input value={loteGalpon} onChange={(e) => setLoteGalpon(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {editingLoteId ? "Guardar lote" : "Nuevo lote"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Egg size={16} style={{ color: "var(--color-campo)" }} />
            <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Carga del día</h3>
          </div>
          <form onSubmit={handleCarga} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Lote
              <select value={cargaLoteId} onChange={(e) => setCargaLoteId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
                <option value="">Elegí un lote</option>
                {lotesActivos.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Fecha
              <input type="date" value={cargaFecha} onChange={(e) => setCargaFecha(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Maples
              <input value={cargaMaples} onChange={(e) => setCargaMaples(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Merma (huevos)
              <input value={cargaMerma} onChange={(e) => setCargaMerma(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
              Guardar
            </button>
            <label className="text-xs font-medium sm:col-span-5" style={{ color: "rgba(26,26,24,0.5)" }}>
              Observaciones
              <input value={cargaObs} onChange={(e) => setCargaObs(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
          </form>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="px-5 py-3" style={{ backgroundColor: "rgba(240,237,230,0.5)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-tierra)" }}>Historial</h3>
          </div>
          {registros.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>Sin cargas todavía.</p>
          ) : (
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    {["Fecha", "Lote", "Maples", "Huevos", "Merma"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, idx) => (
                    <tr key={r.id} style={{ borderTop: idx === 0 ? "none" : "1px solid rgba(212,197,169,0.22)" }}>
                      <td className="px-5 py-3 text-sm" style={{ color: "var(--color-tierra)" }}>{fmtFecha(r.fecha)}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{loteById[r.lote_id]?.nombre ?? "—"}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.maples}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{maplesToHuevos(r.maples)}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.merma}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Movimientos</h3>
          <form onSubmit={handleMovimiento} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end mb-4">
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Lote
              <select value={movLoteId} onChange={(e) => setMovLoteId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
                <option value="">Elegí un lote</option>
                {lotesActivos.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Tipo
              <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as TipoMovimientoGallina)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
                {TIPOS_MOVIMIENTO_GALLINA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Cantidad
              <input value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Fecha
              <input type="date" value={movFecha} onChange={(e) => setMovFecha(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
              Registrar
            </button>
            <label className="text-xs font-medium sm:col-span-5" style={{ color: "rgba(26,26,24,0.5)" }}>
              Motivo
              <input value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
          </form>
          {movimientos.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>Sin movimientos.</p>
          ) : (
            <ul className="space-y-2">
              {movimientos.slice(0, 15).map((m) => (
                <li key={m.id} className="text-sm" style={{ color: "rgba(26,26,24,0.65)" }}>
                  {fmtFecha(m.fecha)} · {loteById[m.lote_id]?.nombre ?? "—"} · {m.tipo} {m.cantidad}
                  {m.motivo ? ` — ${m.motivo}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint + typecheck + tests**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

Chequeo manual: login → menú **Producción** → crear lote → carga con merma vacía (debe bloquear) → merma 0 + maples → aparece en historial.

- [ ] **Step 4: Commit**

```bash
git add src/app/produccion/page.tsx src/components/sidebar.tsx
git commit -m "feat: sección Producción — lotes, carga diaria y movimientos"
```

---

### Task 5: Pestaña Reportes

**Files:**
- Modify: `src/app/reportes/page.tsx`

**Interfaces:**
- Consumes: `maplesToHuevos`, `calcularPostura`, `calcularPlantelInicial`, `calcularMortalidad`, `daysInclusive`.
- Produces: tab `"produccion"` con postura, mortalidad, maples y merma del período. Sin costo/margen.

- [ ] **Step 1: Extender tipos y tabs**

Reemplazar el union y el array:

```ts
type Tab = "hacienda" | "finanzas" | "insumos" | "tareas" | "produccion";

const TABS: { key: Tab; label: string }[] = [
  { key: "hacienda", label: "Hacienda" },
  { key: "produccion", label: "Producción" },
  { key: "finanzas", label: "Finanzas" },
  { key: "insumos",  label: "Insumos"  },
  { key: "tareas",   label: "Tareas"   },
];
```

Agregar imports arriba:

```ts
import { Egg } from "lucide-react";
import {
  calcularMortalidad,
  calcularPlantelInicial,
  calcularPostura,
  daysInclusive,
  maplesToHuevos,
} from "@/lib/produccion";
```

- [ ] **Step 2: Agregar `TabProduccion` antes de `export default`**

```tsx
interface LoteReporte { id: string; nombre: string; cantidad: number }
interface ProdReporte { lote_id: string; fecha: string; maples: number; merma: number }
interface MovReporte { lote_id: string; tipo: string; cantidad: number; fecha: string }

function TabProduccion({
  lotes, registros, movimientos, loading, desde, hasta,
}: {
  lotes: LoteReporte[];
  registros: ProdReporte[];
  movimientos: MovReporte[];
  loading: boolean;
  desde: string;
  hasta: string;
}) {
  if (loading) return <LoadingState />;
  if (lotes.length === 0 && registros.length === 0) return <EmptyState label="Sin datos de producción" />;

  const dias = daysInclusive(desde, hasta);
  const plantel = lotes.reduce((s, l) => s + l.cantidad, 0);
  const maples = registros.reduce((s, r) => s + r.maples, 0);
  const merma = registros.reduce((s, r) => s + r.merma, 0);
  const puestos = maplesToHuevos(maples) + merma;
  const altas = movimientos.filter((m) => m.tipo === "alta").reduce((s, m) => s + m.cantidad, 0);
  const muertes = movimientos.filter((m) => m.tipo === "muerte").reduce((s, m) => s + m.cantidad, 0);
  const ventas = movimientos.filter((m) => m.tipo === "venta").reduce((s, m) => s + m.cantidad, 0);
  const inicial = calcularPlantelInicial(plantel, altas, muertes, ventas);
  const postura = calcularPostura(puestos, plantel, dias);
  const mortalidad = calcularMortalidad(muertes, inicial);

  function fmt(n: number | null, suffix = "") {
    if (n === null) return "—";
    return `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}${suffix}`;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard label="Maples" value={String(maples)} icon={Egg} color={CAMPO} />
      <MetricCard label="Merma" value={String(merma)} sub="huevos" icon={Egg} color={CUERO} />
      <MetricCard label="Postura" value={fmt(postura)} sub="huevos / gallina / día" icon={TrendingUp} color="#16a34a" />
      <MetricCard label="Mortalidad" value={fmt(mortalidad === null ? null : mortalidad * 100, "%")} icon={TrendingDown} color="#dc2626" />
    </div>
  );
}
```

- [ ] **Step 3: Estado, loader y render**

Junto a los otros `useState` de datos:

```ts
const [lotesP, setLotesP] = useState<LoteReporte[]>([]);
const [prodP, setProdP] = useState<ProdReporte[]>([]);
const [movP, setMovP] = useState<MovReporte[]>([]);
const [loadingP, setLoadingP] = useState(false);
const [loadedP, setLoadedP] = useState(false);
```

En el `useEffect` que resetea al cambiar fechas, agregar `setLoadedP(false)`.

Loader:

```ts
const loadProduccion = useCallback(async (estId: string) => {
  if (loadedP) return;
  setLoadingP(true);
  const supabase = createClient();
  const [lotesRes, prodRes, movRes] = await Promise.all([
    supabase.from("lotes_gallinas").select("id, nombre, cantidad")
      .eq("establecimiento_id", estId).is("deleted_at", null),
    supabase.from("produccion_huevos").select("lote_id, fecha, maples, merma")
      .eq("establecimiento_id", estId)
      .gte("fecha", dateRange.desde)
      .lte("fecha", dateRange.hasta),
    supabase.from("movimientos_gallinas").select("lote_id, tipo, cantidad, fecha")
      .eq("establecimiento_id", estId)
      .gte("fecha", dateRange.desde)
      .lte("fecha", dateRange.hasta),
  ]);
  setLotesP(lotesRes.data ?? []);
  setProdP(prodRes.data ?? []);
  setMovP(movRes.data ?? []);
  setLoadedP(true);
  setLoadingP(false);
}, [loadedP, dateRange]);
```

En el `useEffect` de tab change:

```ts
if (activeTab === "produccion") loadProduccion(establecimientoId);
```

Agregar `loadProduccion` al array de deps.

En el render de tabs, después de hacienda:

```tsx
{activeTab === "produccion" && (
  <TabProduccion
    lotes={lotesP}
    registros={prodP}
    movimientos={movP}
    loading={loadingP}
    desde={dateRange.desde}
    hasta={dateRange.hasta}
  />
)}
```

- [ ] **Step 4: Verificar**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

Manual: Reportes → pestaña Producción muestra las 4 cards (sin costo/margen).

- [ ] **Step 5: Commit**

```bash
git add src/app/reportes/page.tsx
git commit -m "feat: pestaña Producción en Reportes (postura y mortalidad)"
```

---

### Task 6: Categorías Finanzas

**Files:**
- Modify: `src/app/finanzas/page.tsx`
- Modify: `src/app/reportes/page.tsx` (`CAT_PIE_COLORS` only)

**Interfaces:**
- Consumes: arrays `CATEGORIAS_GASTO` / `CATEGORIAS_INGRESO`.
- Produces: opciones nuevas en los selects. Cero lógica extra.

- [ ] **Step 1: Finanzas**

En `src/app/finanzas/page.tsx`:

```ts
const CATEGORIAS_GASTO = [
  "Alimentación", "Sanidad", "Alimentación aves", "Sanidad aves",
  "Combustible", "Administración", "Estructuras", "Mano de obra", "Otros",
];

const CATEGORIAS_INGRESO = [
  "Venta de hacienda", "Venta de huevos", "Arrendamiento", "Subsidios", "Servicios", "Otros",
];
```

En `CAT_COLORS` agregar:

```ts
  "Alimentación aves":  "#65a30d",
  "Sanidad aves":       "#0284c7",
  "Venta de huevos":    "#ca8a04",
```

- [ ] **Step 2: Colores del pie en Reportes**

En `CAT_PIE_COLORS` de `src/app/reportes/page.tsx` agregar las mismas 3 claves/colores.

- [ ] **Step 3: Verificar**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

Manual: Finanzas → tipo ingreso muestra "Venta de huevos"; tipo gasto muestra las dos de aves.

- [ ] **Step 4: Commit**

```bash
git add src/app/finanzas/page.tsx src/app/reportes/page.tsx
git commit -m "feat: categorías Finanzas para huevos y aves"
```

---

## Spec coverage

| Requisito del spec | Task |
|--------------------|------|
| Tablas + RLS | 1 |
| Maple = 30, no persistir huevos | 2, 4 |
| Merma obligatoria, 0 válido | 2, 4 |
| Unique lote+fecha con reemplazo | 3, 4 |
| Movimientos actualizan plantel, no negativo | 2, 3, 4 |
| Página /produccion + menú | 4 |
| Postura / mortalidad, sin costo | 2, 5 |
| Tab Reportes | 5 |
| Categorías Finanzas | 6 |
| Turismo / Hacienda / Manga / SENASA intactos | todas |

## Self-review

- Sin TBD / "similar to Task N" / "add validation later".
- Firmas del hook en Task 3 coinciden con el uso en Task 4.
- `HUEVOS_POR_MAPLE`, `nuevaCantidad`, `calcularPostura` no se renombran entre tasks.
- `todayISO` en la página usa fecha local (no `toISOString().split("T")[0]`) para no correr el día en UTC.
