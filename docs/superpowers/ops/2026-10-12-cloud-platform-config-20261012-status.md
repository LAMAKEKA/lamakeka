# Ops — Cloud platform config 20261012 (EST-8 Task 4)

**Fecha:** 2026-10-12  
**Project:** `szffikjajxqxawxavshw`  
**Repo file:** `supabase/migrations/20261012000000_establecimiento_platform_config.sql`  
**Plan:** `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` Task 4

## Resultado

**`cloud 20261012 platform: aplicada`**

## Evidence

VERIFY pre-APPLY: falló con `42703 column "nombre_display" does not exist` → columnas ausentes.

APPLY: SQL Editor humano 2026-10-12 (mismo script del migration file).

VERIFY post-APPLY (humano, listado columnas presentes):

| column | visto |
|--------|--------|
| `nombre_display` | sí |
| `logo_url` | sí |
| `tagline` | sí |
| `rubros` | sí |
| `modules_enabled` | sí |
| `is_platform_demo` | sí (paste truncado `is_platform_d`) |
| `slug` | incluido en APPLY `IF NOT EXISTS` (mismo run) |
| `brand_theme` | incluido en APPLY `IF NOT EXISTS` (mismo run) |

App aún **no lee** estas columnas (Task 5+ registry) → cero regresión UI esperada.

## APPLY

Sí — SQL Editor Dashboard project `szffikjajxqxawxavshw`.

## SQL VERIFY (re-check opcional)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'establecimientos'
  AND column_name IN (
    'slug', 'nombre_display', 'logo_url', 'rubros',
    'modules_enabled', 'brand_theme', 'is_platform_demo', 'tagline'
  )
ORDER BY column_name;

SELECT indexname
FROM pg_indexes
WHERE tablename = 'establecimientos'
  AND indexname IN ('establecimientos_slug_unique', 'establecimientos_user_id_unique')
ORDER BY indexname;

SELECT id, nombre, tipo, nombre_display, modules_enabled, rubros, is_platform_demo
FROM public.establecimientos
LIMIT 5;
```

Esperado: 8 columnas + 2 indexes + `modules_enabled` no vacío en Makeka ganadero.
