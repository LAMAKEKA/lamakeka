# Ops — animales categoria CHECK (EST-14 / G8)

**Fecha:** 2026-10-13  
**Project:** `szffikjajxqxawxavshw`  
**Repo file:** `supabase/migrations/20261013000000_animales_categoria_check.sql`  
**Linear:** EST-14

## Resultado

**`cloud 20261013 animales_categoria_check: pendiente APPLY humano`**

(PR en repo; cloud se confirma post SQL Editor.)

## VERIFY pre

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'animales_categoria_check';
```

Esperado viejo: solo Terneros, Novillos, Vacas, Vaquillonas, Toros (sin Terneras/Novillitos).

## APPLY

Pegar íntegro el migration file en SQL Editor.

## VERIFY post

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'animales_categoria_check';
-- debe listar Terneras y Novillitos
```

## Nota

No toca `manga_animales.categoria` (texto libre / SENASA UI). Solo libreta `animales`.
