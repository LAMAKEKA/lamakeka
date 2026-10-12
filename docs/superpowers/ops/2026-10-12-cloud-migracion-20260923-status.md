# Ops — Cloud migración 20260923 (EST-8 Task 1 / G1)

**Fecha:** 2026-10-12  
**Project:** `szffikjajxqxawxavshw`  
**Repo file:** `supabase/migrations/20260923000000_manga_hacienda_integracion.sql`  
**Plan:** `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md`

## Resultado

**`cloud 20260923: aplicada`**

## Evidence

Verify vía PostgREST con service role (mismo URL que `.env.local` → host `szffikjajxqxawxavshw`):

| Check | HTTP | Interpretación |
|-------|------|----------------|
| `manga_animales?select=estado` | 200 | columna `estado` existe |
| `manga_animales?select=updated_at,updated_by` | 200 | columnas updated_* existen |
| `animal_eventos?select=id` | 200 | tabla existe |

Bodies vacíos `[]` = OK (sin filas o sin match); error de schema en PostgREST sería 400/PGRST*, no 200.

## APPLY

No corrido — schema ya presente. Si en el futuro se recrea el project vacío, pegar el SQL íntegro del migration file en:

https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new

## SQL VERIFY (opcional, Dashboard)

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'manga_animales'
  AND column_name IN ('estado', 'updated_at', 'updated_by')
ORDER BY column_name;

SELECT to_regclass('public.animal_eventos') AS animal_eventos;

SELECT conname
FROM pg_constraint
WHERE conname = 'manga_animales_estado_check';
```

## Linear (copiar a EST-8)

```
EST-8 Task 1 / G1: cloud 20260923 = aplicada (2026-10-12).
Evidence: PostgREST 200 en manga_animales.estado/updated_* y animal_eventos.
PR: (URL de este PR)
```
