# Ops: gasto adjuntos (facturas multi-archivo)

**Fecha:** 2026-10-27  
**Cloud:** `szffikjajxqxawxavshw`  
**Migración repo:** `supabase/migrations/20261027140000_gasto_adjuntos_storage.sql`

## Qué hace

- Tabla `gasto_adjuntos` (N archivos por movimiento de `gastos`).
- Bucket Storage **privado** `gasto-adjuntos` (10 MB/file server-side).
- App: multi-upload en Nuevo Movimiento; fotos → JPEG comprimido en browser; PDF/Word/Excel validados ≤ 8 MB.
- Lectura con **signed URL** 30 min (no público).

## APPLY (SQL Editor)

1. VERIFY (opcional):

```sql
SELECT to_regclass('public.gasto_adjuntos') AS tabla;
SELECT id, public, file_size_limit
FROM storage.buckets WHERE id = 'gasto-adjuntos';
```

2. APPLY: pegar el archivo completo  
   `supabase/migrations/20261027140000_gasto_adjuntos_storage.sql`  
   en https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new → Run.

3. re-VERIFY:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'gasto_adjuntos'
ORDER BY 1;

SELECT id, public FROM storage.buckets WHERE id = 'gasto-adjuntos';
-- public debe ser false
```

## Notas

- Sin APPLY: el movimiento se guarda; adjuntos fallan con mensaje de bucket/tabla.
- HEIC: si el browser no decodifica, pide JPG o archivo ≤ 8 MB.
- Word/PDF no se “re-comprimen” en cliente (ya son zip/deflate); solo tope de size.
