# EST-8 Task 4 — Migración platform config en establecimientos

**Leé y ejecutá este brief.** Español corto. **Solo schema + docs status** — no registry UI, no demo user, no nav data-driven (Task 5+).

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 4**
- PRD: Fase B schema / `modules_enabled`
- Ya en main (o mergeá antes): #15–#17; Task 3 smoke **#18** (docs) — preferí `main` al día post-#18 si ya mergeó

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `https://github.com/LAMAKEKA/lamakeka.git` (sin guion) |
| gh | `lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` actualizado |
| SB | `szffikjajxqxawxavshw` |
| SQL Editor | https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new |
| Migración | `supabase/migrations/20261012000000_establecimiento_platform_config.sql` |

## Qué NO hacer

- No código app (registry, sidebar, resolveTenant, testprueba) — Task 5+.
- No mentir `cloud aplicada` sin VERIFY evidence.
- No `supabase login` interactivo / CLI 403 = cuenta mala; default = SQL Editor humano.
- No romper UNIQUE `establecimientos_user_id_unique`.
- No secrets. No push a main. 1 branch = 1 PR.
- No remote `LA-MAKEKA` con guion.
- No `git reset --hard` sin OK humano.

## Objetivo

1. Crear migración **idempotente** en repo (archivo arriba).
2. Humano (o Dashboard) APPLY en SQL Editor si VERIFY dice faltan columnas.
3. VERIFY post-apply.
4. Documentar cloud status (ops md + checkboxes plan).
5. PR + comment EST-8.
6. App Makeka **no debe regresar**: backfill `modules_enabled` = nav actual Makeka (ganadero).

## Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b feat/est-8-establecimiento-platform-config
```

## SQL — VERIFY (primero)

```sql
-- EST-8 Task 4 — VERIFY platform config
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'establecimientos'
  AND column_name IN (
    'slug', 'nombre_display', 'logo_url', 'rubros',
    'modules_enabled', 'brand_theme', 'is_platform_demo', 'tagline'
  )
ORDER BY column_name;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'establecimientos'
  AND indexname = 'establecimientos_slug_unique';

-- UNIQUE user_id sigue
SELECT indexname
FROM pg_indexes
WHERE tablename = 'establecimientos'
  AND indexname = 'establecimientos_user_id_unique';

-- sample backfill (sin PII de más)
SELECT id, nombre, tipo, nombre_display, logo_url, tagline,
       rubros, modules_enabled, is_platform_demo
FROM public.establecimientos
LIMIT 5;
```

### Interpretación

| Resultado | Status |
|-----------|--------|
| 8 columnas presentes + index slug + user_id unique | **`cloud 20261012 platform: aplicada`** (si backfill modules no vacío en Makeka) |
| Faltan columnas | **`pendiente`** → APPLY |
| Sin result humano | **`pendiente verificación humana`** — no inventar |

## SQL — APPLY (íntegro; mismo contenido del archivo repo)

```sql
-- EST-8 platform config on establecimientos
-- Plan: docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md Task 4
-- Idempotente: ADD IF NOT EXISTS + backfill condicional modules vacíos

ALTER TABLE public.establecimientos
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS nombre_display text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS rubros text[] NOT NULL DEFAULT ARRAY['ganaderia']::text[],
  ADD COLUMN IF NOT EXISTS modules_enabled text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS brand_theme jsonb,
  ADD COLUMN IF NOT EXISTS is_platform_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tagline text;

CREATE UNIQUE INDEX IF NOT EXISTS establecimientos_slug_unique
  ON public.establecimientos (slug)
  WHERE slug IS NOT NULL;

-- Backfill display + Makeka-safe modules (nav actual, cero regresión)
-- rubros: siempre alinear a tipo en esta migración (Makeka = ganadero)
-- modules_enabled: solo si vacío (no pisar config futura)
UPDATE public.establecimientos e
SET
  nombre_display = COALESCE(e.nombre_display, e.nombre),
  logo_url = COALESCE(e.logo_url, '/logo-makeka.png'),
  tagline = COALESCE(e.tagline, 'AI · Ganadera'),
  rubros = CASE
    WHEN e.tipo = 'agricola' THEN ARRAY['agricola']::text[]
    WHEN e.tipo = 'mixto' THEN ARRAY['ganaderia', 'agricola']::text[]
    ELSE ARRAY['ganaderia']::text[]
  END,
  modules_enabled = CASE
    WHEN cardinality(COALESCE(e.modules_enabled, ARRAY[]::text[])) >= 1
      THEN e.modules_enabled
    WHEN e.tipo = 'agricola' THEN ARRAY[
      'inicio', 'agricola', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]
    WHEN e.tipo = 'mixto' THEN ARRAY[
      'inicio', 'manga', 'hacienda', 'potreros', 'senasa', 'agricola',
      'produccion_huevos', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]
    ELSE ARRAY[
      'inicio', 'manga', 'hacienda', 'potreros', 'senasa',
      'produccion_huevos', 'insumos', 'finanzas', 'reportes', 'tareas'
    ]::text[]
  END
WHERE true;

COMMENT ON COLUMN public.establecimientos.modules_enabled IS
  'EST-8: module ids enabled for nav; empty before backfill = use defaults by tipo';
COMMENT ON COLUMN public.establecimientos.is_platform_demo IS
  'EST-8: lab/demo tenant (e.g. testprueba); not production Makeka';
COMMENT ON COLUMN public.establecimientos.rubros IS
  'EST-8: ganaderia | agricola | …';
```

Después **re-VERIFY**.

## Archivo repo

Escribir **exactamente** el APPLY arriba en:

`supabase/migrations/20261012000000_establecimiento_platform_config.sql`

## Docs

Crear/actualizar:

`docs/superpowers/ops/2026-10-12-cloud-platform-config-20261012-status.md`

| Item | Valor |
|------|--------|
| Project | `szffikjajxqxawxavshw` |
| Migración | `20261012000000_establecimiento_platform_config.sql` |
| Status | `aplicada` \| `pendiente` \| `pendiente verificación humana` |
| Verificado | YYYY-MM-DD |
| Evidence | columnas N/8; slug index; sample modules_enabled |
| APPLY corrido | sí/no |

Marcar Task 4 checkboxes en el plan.

## Commit + PR

```bash
git add supabase/migrations/20261012000000_establecimiento_platform_config.sql \
        docs/superpowers/ops/2026-10-12-cloud-platform-config-20261012-status.md \
        docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
feat: columnas platform config en establecimientos

Refs EST-8 Task 4
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head feat/est-8-establecimiento-platform-config \
  --title "feat: EST-8 Task 4 platform config establecimientos" \
  --body "$(cat <<'EOF'
## Summary
Task 4: columnas tenant/branding/`modules_enabled` en `establecimientos` + backfill Makeka-safe.

**cloud 20261012 platform:** `<aplicada | pendiente | pendiente verificación humana>`

### Evidence
- VERIFY columnas: …
- slug unique index: …
- sample modules_enabled: …
- APPLY: sí/no

### Test plan
- [x] SQL en repo idempotente
- [ ] Humano VERIFY/APPLY SQL Editor szffik…
- [ ] UNIQUE user_id intacto
- [ ] App no lee estas cols aún (Task 5+) — cero regresión runtime esperada

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8: PR URL + status cloud. Si MCP no ve EST, bloque en PR body.

## Done when

- [ ] Migration file en repo
- [ ] VERIFY interpretado con evidencia **o** status honesto pendiente humana
- [ ] Si faltaba y APPLY: re-VERIFY OK
- [ ] Ops + plan + PR
- [ ] EST-8 comentado
- [ ] **No** registry/UI en este PR

## Después

**Task 5** module registry + defaults (código puro + tests). Pedir prompt al orquestador; no mezclar.

## Kickoff corto

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-4-establecimiento-platform-config.md

EST-8 Task 4. SQL migration platform config + VERIFY/APPLY SQL Editor szffik…
Documentar status + PR. No registry/UI. main al día (ideal post-#18).
```
