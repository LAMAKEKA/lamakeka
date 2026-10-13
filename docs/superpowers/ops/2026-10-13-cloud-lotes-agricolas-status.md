# Ops — lotes_agricolas (EST-19)

**Fecha:** 2026-10-13  
**Project:** `szffikjajxqxawxavshw`  
**Repo:** `supabase/migrations/20261013030000_lotes_agricolas.sql`  
**Linear:** EST-19

## Resultado

**`cloud lotes_agricolas: pendiente APPLY`**

Sin APPLY la UI muestra vacío / error amigable al insertar.

## VERIFY post

```sql
SELECT to_regclass('public.lotes_agricolas');
SELECT column_name FROM information_schema.columns
WHERE table_name = 'lotes_agricolas' ORDER BY 1;
```
