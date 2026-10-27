-- Realinear modules_enabled genéricos vs pack Makeka real.
-- Makeka / Mateca: se dejan con pack legacy (incluye produccion_huevos).
-- Resto: defaults por tipo (ganadero/agricola/mixto) SIN huevos.
-- Idempotente. No toca is_platform_demo ni nombre_display custom.

UPDATE public.establecimientos e
SET
  modules_enabled = CASE
    -- Demo lab: no pisar si ya es demo (seed aparte)
    WHEN e.is_platform_demo IS TRUE THEN e.modules_enabled

    -- Makeka / Mateca real: pack legacy completo
    WHEN lower(coalesce(e.nombre, '')) LIKE '%makeka%'
      OR lower(coalesce(e.nombre_display, '')) LIKE '%makeka%'
      OR lower(coalesce(e.nombre, '')) LIKE '%mateca%'
      OR lower(coalesce(e.nombre_display, '')) LIKE '%mateca%'
      OR lower(coalesce(e.slug, '')) LIKE '%makeka%'
    THEN ARRAY[
      'inicio', 'manga', 'hacienda', 'potreros', 'senasa',
      'produccion_huevos', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]

    WHEN e.tipo = 'agricola' THEN ARRAY[
      'inicio', 'agricola', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]

    WHEN e.tipo = 'mixto' THEN ARRAY[
      'inicio', 'manga', 'hacienda', 'potreros', 'senasa', 'agricola',
      'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]

    -- ganadero genérico (y fallback)
    ELSE ARRAY[
      'inicio', 'manga', 'hacienda', 'potreros', 'senasa',
      'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]
  END,
  rubros = CASE
    WHEN e.is_platform_demo IS TRUE AND cardinality(COALESCE(e.rubros, ARRAY[]::text[])) >= 1
      THEN e.rubros
    WHEN e.tipo = 'agricola' THEN ARRAY['agricola']::text[]
    WHEN e.tipo = 'mixto' THEN ARRAY['ganaderia', 'agricola']::text[]
    ELSE ARRAY['ganaderia']::text[]
  END,
  tagline = CASE
    WHEN e.is_platform_demo IS TRUE THEN COALESCE(e.tagline, 'Plataforma multi-rubro')
    WHEN lower(coalesce(e.nombre, '')) LIKE '%makeka%'
      OR lower(coalesce(e.nombre_display, '')) LIKE '%makeka%'
      OR lower(coalesce(e.nombre, '')) LIKE '%mateca%'
      THEN COALESCE(NULLIF(trim(e.tagline), ''), 'AI · Ganadera')
    WHEN e.tipo = 'agricola' THEN COALESCE(NULLIF(trim(e.tagline), ''), 'AI · Agrícola')
    WHEN e.tipo = 'mixto' THEN COALESCE(NULLIF(trim(e.tagline), ''), 'AI · Mixto')
    ELSE COALESCE(NULLIF(trim(e.tagline), ''), 'AI · Ganadera')
  END,
  nombre_display = COALESCE(NULLIF(trim(e.nombre_display), ''), e.nombre)
WHERE true;

COMMENT ON COLUMN public.establecimientos.modules_enabled IS
  'EST-8+: Makeka real = legacy pack; genérico = defaults por tipo (sin huevos)';
