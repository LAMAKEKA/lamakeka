-- EST-8 platform config on establecimientos
-- Plan: docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md Task 4
-- Idempotente: ADD IF NOT EXISTS + backfill condicional modules vacíos

ALTER TABLE public.establecimientos
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS nombre_display text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS rubros text[] NOT NULL DEFAULT ARRAY['ganaderia']::text[],
  ADD COLUMN IF NOT EXISTS modules_enabled text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS brand_theme jsonb,
  ADD COLUMN IF NOT EXISTS is_platform_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tagline text;

CREATE UNIQUE INDEX IF NOT EXISTS establecimientos_slug_unique
  ON public.establecimientos (slug)
  WHERE slug IS NOT NULL;

-- Backfill display + Makeka-safe modules (nav actual, cero regresión)
-- rubros: alinear a tipo (Makeka = ganadero)
-- modules_enabled: solo si vacío (no pisar config futura)
UPDATE public.establecimientos e
SET
  nombre_display = COALESCE(e.nombre_display, e.nombre),
  logo_url = COALESCE(e.logo_url, '/logo-makeka.png'),
  tagline = COALESCE(e.tagline, 'AI · Ganadera'),
  rubros = CASE
    WHEN e.tipo = 'agricola' THEN ARRAY['agricola']::text[]
    WHEN e.tipo = 'mixto' THEN ARRAY['ganaderia', 'agricola']::text[]
    ELSE ARRAY['ganaderia']::text[]
  END,
  modules_enabled = CASE
    WHEN cardinality(COALESCE(e.modules_enabled, ARRAY[]::text[])) >= 1
      THEN e.modules_enabled
    WHEN e.tipo = 'agricola' THEN ARRAY[
      'inicio', 'agricola', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]
    WHEN e.tipo = 'mixto' THEN ARRAY[
      'inicio', 'manga', 'hacienda', 'potreros', 'senasa', 'agricola',
      'produccion_huevos', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]
    ELSE ARRAY[
      'inicio', 'manga', 'hacienda', 'potreros', 'senasa',
      'produccion_huevos', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]
  END
WHERE true;

COMMENT ON COLUMN public.establecimientos.modules_enabled IS
  'EST-8: module ids enabled for nav; empty before backfill = use defaults by tipo';
COMMENT ON COLUMN public.establecimientos.is_platform_demo IS
  'EST-8: lab/demo tenant (e.g. testprueba); not production Makeka';
COMMENT ON COLUMN public.establecimientos.rubros IS
  'EST-8: ganaderia | agricola | …';
