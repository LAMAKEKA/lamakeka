# Cloud realign modules generic vs Makeka — 2026-10-14

**Project:** `szffikjajxqxawxavshw`  
**SQL Editor:** https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new  
**Migration file:** `supabase/migrations/20261014000000_realign_modules_generic_vs_makeka.sql`  
**Status:** pendiente APPLY humano

## Qué hace

| Tenant | modules_enabled |
|--------|-----------------|
| Nombre/display/slug con makeka o mateca | pack legacy Makeka (con `produccion_huevos`) |
| `is_platform_demo = true` | no pisa array demo |
| `tipo = agricola` | inicio, agricola, insumos, finanzas, reportes, tareas |
| `tipo = mixto` | ganadería genérica + agricola (sin huevos) |
| resto ganadero genérico | manga/hacienda/potreros/senasa + core (sin huevos) |

## VERIFY (pre)

```sql
SELECT e.nombre, e.nombre_display, e.tipo, e.is_platform_demo, e.modules_enabled, e.rubros, e.tagline
FROM public.establecimientos e
ORDER BY e.created_at NULLS LAST
LIMIT 20;
```

## APPLY

Pegá el archivo completo:
`supabase/migrations/20261014000000_realign_modules_generic_vs_makeka.sql`

## re-VERIFY

```sql
SELECT e.nombre, e.tipo, e.is_platform_demo,
  ('produccion_huevos' = ANY (e.modules_enabled)) AS has_huevos,
  ('agricola' = ANY (e.modules_enabled)) AS has_agricola,
  ('manga' = ANY (e.modules_enabled)) AS has_manga
FROM public.establecimientos e
ORDER BY 1;
```

Expect:
- Makeka/Mateca → has_huevos true, has_manga true
- ganadero genérico → has_huevos false, has_manga true
- agricola → has_manga false, has_agricola true
