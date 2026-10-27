# Cloud realign modules generic vs Makeka — 2026-10-14

**Project:** `szffikjajxqxawxavshw`  
**SQL Editor:** https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new  
**Migration file:** `supabase/migrations/20261014000000_realign_modules_generic_vs_makeka.sql`  
**Status:** APPLY OK (humano 2026-10-27) · PR #32 MERGED

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

## re-VERIFY result (2026-10-27)

| nombre | tipo | is_platform_demo | has_huevos | has_agricola | has_manga |
|--------|------|------------------|------------|--------------|-----------|
| La Makeka | ganadero | false | true | false | true |
| LA MAKEKA | ganadero | false | true | false | true |

Solo 2 filas en cloud hoy = ambas Makeka real. Pack legacy correcto.
Genérico / agrícola se validan al crear User B en setup (no había filas genéricas que realinear).

## Smoke 2 users (post-APPLY + app con modules fix)

### User A — Makeka real
1. Login cuenta dueña del estab Makeka/Mateca.
2. Sidebar título ≈ Makeka; hay Producción (huevos), Manga, Hacienda.
3. Home muestra métricas de hacienda (no solo agrícola).
4. Menú → **Mi campo** (`/config`): módulos legacy on; podés apagar/prender extras.

### User B — campo propio genérico
1. Register con **otro** email (Gmail alias OK).
2. `/setup`: nombre **sin** “makeka/mateca” (ej. “Los Álamos”), tipo **Ganadero**.
3. Tras setup: sidebar = nombre del campo; **sin** Producción huevos; **con** Manga/Hacienda.
4. `/config` → activar **Producción** + Guardar → aparece en menú; `/produccion` entra.
5. Opcional: tipo Agrícola en otra cuenta → sin Manga, con Agrícola; home no “Total Cabezas”.

### Lab demo
- `testprueba@gmail.com` solo si ya existe en Auth (no auto-create; sin password en git).
- Flag `is_platform_demo` / pack demo; realign **no** pisa su array.
