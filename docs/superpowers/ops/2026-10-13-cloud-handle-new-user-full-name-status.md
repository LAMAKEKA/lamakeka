# Ops — handle_new_user full_name (EST-16 / G5)

**Fecha:** 2026-10-13  
**Project:** `szffikjajxqxawxavshw`  
**Repo:** `supabase/migrations/20261013010000_handle_new_user_full_name.sql`  
**Linear:** EST-16

## Resultado

**`cloud handle_new_user full_name: pendiente APPLY`**

## APPLY

SQL Editor: pegar migration file.

## VERIFY

```sql
SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure);
-- debe mencionar nombre / apellido / full_name
```

Register app también manda `full_name` en metadata (doble red de seguridad).
