# Ops — RLS ownership establecimiento (EST-18 / G9)

**Fecha:** 2026-10-13  
**Project:** `szffikjajxqxawxavshw`  
**Repo:** `supabase/migrations/20261013020000_rls_ownership_establecimiento.sql`  
**Linear:** EST-18

## Resultado

**`cloud 20261013 rls_ownership: pendiente APPLY humano`**

## Tablas tocadas

`animales`, `gastos`, `insumos`, `insumos_movimientos`, `potreros`, `prenez`, `tareas`, `profiles` (select own), `establecimientos` (select own).

**No** reescribe manga_animales / registros_manga / animal_eventos / huevos (ya ownership).

## VERIFY pre (sample)

```sql
SELECT pol.polname, rel.relname, pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
FROM pg_policy pol
JOIN pg_class rel ON rel.oid = pol.polrelid
WHERE rel.relname IN ('animales','gastos','insumos','potreros','tareas','estabelecimientos','profiles')
ORDER BY rel.relname, pol.polname;
```

(fix typo if any: `establecimientos`)

## APPLY

Pegar migration íntegra en SQL Editor.

## VERIFY post

```sql
SELECT pol.polname, c.relname
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE c.relname = 'animales' AND pol.polname LIKE 'animales_%'
ORDER BY 1;
-- expect select/insert/update/delete (no animales_all)
```

## Riesgo / smoke

Makeka single-user: mismas filas visibles (solo su estab).  
Demo multi-user: ya no ve datos ajenos.  
Si algo “desaparece” post-APPLY: chequear que filas tengan `establecimiento_id` del user logueado.
