# EST-8 Task 1 — Verificar/aplicar migración cloud 20260923 (G1)

**Leé y ejecutá este brief.** Español corto al humano. Docs/código mínimo: **status documentado**, no rehacer P0.

## Contexto

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 1**
- PRD gap **G1 P0**: migración `20260923000000_manga_hacienda_integracion.sql` está en **repo/main**; cloud puede o no tenerla.
- Fase 0 docs ya mergeada: **PR #15** → `main` (`26db2a1`).
- UI Hacienda ya avisa si falta columna `estado`. Código que escribe `estado` / `animal_eventos` **rompe** hasta que cloud esté OK.

## Repo / cuentas

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `https://github.com/LAMAKEKA/lamakeka.git` (sin guion) |
| gh | `lamakeka2026` → `gh auth switch --user lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` actualizado post-#15 |
| SB ref | `szffikjajxqxawxavshw` |
| SQL Editor | https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new |
| Migración | `supabase/migrations/20260923000000_manga_hacienda_integracion.sql` |

## Qué NO hacer

- No `supabase login` interactivo / no insistir CLI si 403 (cuenta CLI ≠ Makeka).
- No mentir “aplicada” sin output de verify SQL.
- No cambiar el SQL de la migración salvo bug real al aplicar.
- No código app (registry, demo user, etc.) — eso es Task 2+.
- No secrets en git/PR/Linear.
- No push a main; branch + PR.
- No `git reset --hard` sin OK humano.
- No tocar remote `LA-MAKEKA` con guion.

## Objetivo Task 1

1. Saber con evidencia si cloud tiene `manga_animales.estado` (+ updated_*) y tabla `animal_eventos`.
2. Si **falta**: el humano (o vos si tenés sesión Dashboard) aplica el SQL íntegro de la migración vía SQL Editor.
3. Re-verificar.
4. Documentar status en docs del plan (sección Cloud status) + PR body con fecha y resultado.
5. Comentar EST-8 con el mismo status.

**El agente no puede asumir acceso al SQL Editor.** Flujo default:

- Preparar/confirmar scripts de verify + apply (ya en repo).
- Si el humano ya pegó y te pasó el resultado → documentar y PR.
- Si no hay resultado aún → PR de **notas + checklist** con status `pendiente verificación humana` y SQL listo; **no** inventar que corrió.
- Si el humano en el mismo hilo pega el output del verify → cerrar el loop en el mismo PR.

## Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b docs/est-8-task-1-migracion-cloud-status
```

## SQL — VERIFY (correr primero)

Pegar en SQL Editor → Run. Guardar el result set (o que el humano te lo pegue).

```sql
-- EST-8 Task 1 / G1 — VERIFY migración 20260923
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

-- opcional: políticas RLS
SELECT polname
FROM pg_policy
WHERE polrelid = 'public.animal_eventos'::regclass
ORDER BY polname;
```

### Interpretación

| Resultado | Status |
|-----------|--------|
| 3 columnas (`estado`, `updated_at`, `updated_by`) + `animal_eventos` no null + constraint existe | **`cloud 20260923: aplicada`** |
| Falta alguna columna o `animal_eventos` es null | **`cloud 20260923: pendiente`** → correr APPLY |

## SQL — APPLY (solo si VERIFY falló)

Pegar **íntegro** el archivo del repo (no reescribir a mano):

`supabase/migrations/20260923000000_manga_hacienda_integracion.sql`

Es idempotente en lo razonable (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`).

Después **re-correr VERIFY**.

## Docs a escribir en el PR

Crear o actualizar (preferí un bloque claro en el plan o un doc corto de ops):

**Opción A (preferida):** añadir al final de  
`docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` una sección:

```markdown
## Cloud status (Task 1)

| Item | Valor |
|------|--------|
| Project ref | `szffikjajxqxawxavshw` |
| Migración | `20260923000000_manga_hacienda_integracion.sql` |
| Status | `aplicada` \| `pendiente` \| `pendiente verificación humana` |
| Verificado | YYYY-MM-DD |
| Evidence | (resumen: columnas OK / faltantes; animal_eventos sí/no) |
| Acción humana | (SQL Editor Run apply: sí/no) |
```

**Opción B:** `docs/superpowers/ops/2026-10-12-cloud-migracion-20260923-status.md` con lo mismo + link al plan.

Marcar checkboxes Task 1 del plan según lo realmente hecho.

También actualizar handoff master si hace falta una línea de status (opcional):  
`docs/handoffs/PROMPT-EST-8-makeka-ship-y-plataforma-multi-rubro.md` — no obligatorio.

## Commit + PR

```bash
git add docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
# + ops md si creaste
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
docs: EST-8 Task 1 status migración cloud 20260923

Refs EST-8 G1
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head docs/est-8-task-1-migracion-cloud-status \
  --title "docs: EST-8 Task 1 cloud migración 20260923 status" \
  --body "$(cat <<'EOF'
## Summary
Task 1 / G1: status de `20260923000000_manga_hacienda_integracion.sql` en Supabase cloud `szffikjajxqxawxavshw`.

**cloud 20260923:** `<aplicada | pendiente | pendiente verificación humana>`

### Evidence
- VERIFY columns: …
- animal_eventos: …
- apply corrido: sí/no

### Test plan
- [x] Docs only (o docs + confirmación humana SQL)
- [ ] Si pendiente: humano corre APPLY + re-VERIFY
- [ ] Hacienda/manga no asumen columna si status ≠ aplicada

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8 con: PR URL + `cloud 20260923: …`.  
Si MCP Linear no ve team EST (otro workspace), dejar el texto en el PR body para que el humano copie.

## Done when

- [ ] main local = origin/main post-#15
- [ ] VERIFY interpretado con evidencia **o** status honesto `pendiente verificación humana`
- [ ] Si faltaba y humano aplicó: re-VERIFY OK → `aplicada`
- [ ] Docs actualizados + PR abierto
- [ ] EST-8 comentado (o texto listo en PR)
- [ ] **No** código plataforma en este PR

## Siguiente después de merge Task 1

Según plan: gaps A (G2 setup gate, etc.) o arrancar Fase B Task migración `modules_enabled` — **no** mezclar en este PR.

## Kickoff 5 líneas (humano → peer)

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-1-migracion-cloud-20260923.md

main ya tiene PR #15. Task 1 = G1 cloud 20260923 only.
VERIFY/APPLY vía SQL Editor szffik… (humano pega si vos no tenés Dashboard).
Documentar status + PR docs. No código app.
```
