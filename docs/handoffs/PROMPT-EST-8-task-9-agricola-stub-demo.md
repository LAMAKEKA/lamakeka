# EST-8 Task 9 — Stub agrícola + seed demo docs

**Leé y ejecutá este brief.** Español corto. Ruta `/agricola` placeholder + docs seed lab. **Sin password** en git. No Task 10 cierre gordo salvo checkboxes plan de esta task.

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 9**
- Ya en main: #19–#23 (platform SQL, registry, tenant, nav, setup modules) — base `5d23b0c`+

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `LAMAKEKA/lamakeka` (sin guion) |
| gh | `lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` @ post-#23 (`git pull`) |
| Registry | `agricola` ya en `MODULE_REGISTRY` href `/agricola` |

## Qué NO hacer

- No password de `testprueba` ni ningún secret en git/PR/Linear/seed md.
- No crear el user demo vos en Auth (humano/Dashboard) — solo documentar pasos.
- No features agrícolas reales (lotes, cultivos, cosecha).
- No rewire nav/setup salvo fix mínimo si `/agricola` 404 rompe algo.
- No SQL migration nueva (UPDATE seed es **doc** para humano pegar).
- No Task 10 checklist cierre completo salvo marcar Task 9 en plan.
- No push a main. 1 branch = 1 PR.
- No remote `LA-MAKEKA` con guion.
- No fake data productiva en la page.

## Objetivo

1. `src/app/agricola/page.tsx` — UI stub Makeka-looking; gate si tenant **no** tiene módulo `agricola` → redirect `/`.
2. `supabase/seed/platform_demo.md` — pasos crear lab user + setup + SQL opcional (sin password).
3. typecheck + tests verdes.
4. PR body: **user demo creado: no** (default; humano lo crea después) salvo evidencia.

## Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b feat/est-8-agricola-stub-demo
```

## Step 1 — `/agricola` page

Client page (usa `useTenant` como shell):

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Loader2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function AgricolaPage() {
  const router = useRouter();
  const { tenant, loading } = useTenant();

  const enabled =
    tenant?.modulesEnabled?.includes("agricola") ?? false;

  useEffect(() => {
    if (loading) return;
    if (!enabled) router.replace("/");
  }, [loading, enabled, router]);

  if (loading || !enabled) {
    return (
      <div className="page-pad flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin" style={{ color: "var(--color-campo)" }} />
      </div>
    );
  }

  return (
    <div className="page-pad max-w-lg mx-auto py-8">
      <div
        className="rounded-2xl border p-6 text-center"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          borderColor: "rgba(212,197,169,0.55)",
        }}
      >
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(58,74,50,0.1)", color: "var(--color-campo)" }}
        >
          <Sprout size={28} strokeWidth={2} />
        </div>
        <h1
          className="text-xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            color: "var(--color-tierra)",
          }}
        >
          Agrícola
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(26,26,24,0.65)" }}>
          Módulo en construcción — lotes y cultivos pronto.
        </p>
        <p className="text-xs mt-4" style={{ color: "rgba(26,26,24,0.45)" }}>
          {tenant?.nombreDisplay ?? "Campo"} · plataforma multi-rubro
        </p>
      </div>
    </div>
  );
}
```

Ajustá a tokens/clases del repo (`page-pad` existe en globals). Si `Sprout` no está en lucide local, usá el mismo icono que `iconMap` (`Wheat`/`Leaf`).

**Gate Makeka ganadero:** `MAKEKA_LEGACY` **no** incluye `agricola` → user Makeka que entre a `/agricola` a mano → redirect `/`. Correcto.

**Demo / mixto / agricola tipo:** modules incluyen `agricola` → ven stub.

## Step 2 — seed docs

Crear `supabase/seed/platform_demo.md`:

```markdown
# Seed platform demo (EST-8 lab)

**Nunca** guardes el password en git, PR, Linear ni este archivo.

Email lab: `testprueba@gmail.com` (`PLATFORM_DEMO_EMAIL` en `src/lib/tenant/platformDemo.ts`).

## 1) Crear user (humano)

1. Supabase Dashboard → Authentication → Users → Add user  
   Project: `szffikjajxqxawxavshw`
2. Email: `testprueba@gmail.com`
3. Password: generá uno fuerte → guardalo en 1Password / chat privado **solo**.
4. Auto-confirm email si el proyecto lo pide.

## 2) Setup en la app

1. Login con ese user en https://lamakeka.vercel.app o localhost:3000
2. Debe caer en `/setup` (sin establecimiento)
3. Nombre display sugerido: `Campo Demo`
4. Tipo: **mixto** (o agrícola si querés nav sin manga por default de tipo)
5. Guardar → home

Post-Task 8 el insert ya setea `modules_enabled` / `rubros` / `is_platform_demo` si el email matchea.

## 3) SQL opcional (afinar demo nav)

SQL Editor: https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new

```sql
UPDATE public.establecimientos e
SET
  is_platform_demo = true,
  nombre_display = 'Campo Demo',
  tagline = 'Plataforma multi-rubro',
  logo_url = COALESCE(e.logo_url, '/logo-makeka.png'),
  modules_enabled = ARRAY[
    'inicio', 'agricola', 'hacienda', 'insumos', 'finanzas', 'reportes', 'tareas'
  ]::text[],
  rubros = ARRAY['ganaderia', 'agricola']::text[]
WHERE e.user_id = (
  SELECT id FROM auth.users WHERE email = 'testprueba@gmail.com' LIMIT 1
);
```

Notas:

- Sin `manga` / `senasa` / `potreros` en este array → bottom/sidebar demo distinto a Makeka.
- Makeka real **no** tocar: filtrar por email demo only.

## 4) Smoke

| User | Expect |
|------|--------|
| Makeka real | Nav legacy (manga, etc.) intacta |
| testprueba post-SQL | Ve Agrícola; no Manga/SENASA si no están en array |
| GET `/agricola` sin módulo | redirect `/` |

## 5) Status

- User demo creado en Auth: **sí / no** (completar al correr)
- SQL demo apply: **sí / no**
```

(El fence interno del SQL en el archivo seed: usá indentación o fence de 4 backticks en el md real para no romper el doc.)

## Step 3 — app-shell title (opcional mini)

Si `titleFor` no resuelve `/agricola`, registry ya tiene label — Task 7 usa registry; verificá que título mobile diga “Agrícola”. Si no, una línea en PAGE_TITLE o confiar en registry match — preferí registry.

## Step 4 — Verify

```bash
npm test
npm run typecheck
# build preferido si tocás app router
npm run build
```

No inventar smoke login demo OK sin user.

## Step 5 — Plan

Marcar Task 9 checkboxes en el plan.

## Commit + PR

```bash
git add src/app/agricola/page.tsx supabase/seed/platform_demo.md \
  docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
feat: stub agricola y docs seed demo

Refs EST-8 Task 9
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head feat/est-8-agricola-stub-demo \
  --title "feat: EST-8 Task 9 stub agricola + seed demo docs" \
  --body "$(cat <<'EOF'
## Summary
Task 9: placeholder `/agricola` (gate por `modules_enabled`) + `supabase/seed/platform_demo.md` sin password.

### Demo user
**Creado en Auth: no** (humano sigue seed md).  
SQL demo apply: no (doc only).

### Makeka
Legacy modules sin `agricola` → `/agricola` redirige home.

## Test plan
- [x] npm test + typecheck (+ build)
- [x] No secrets
- [ ] Humano: crear testprueba + smoke nav demo vs Makeka

## Linear EST-8
Task 9 PR: <url>
(MCP may fail — paste)

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8. Si MCP falla → body PR.

## Done when

- [ ] `/agricola` stub + gate
- [ ] seed md sin password
- [ ] PR declara demo user creado sí/no
- [ ] test/typecheck OK
- [ ] EST-8 / PR note

## Después

**Task 10** cierre EST-8 (checklist + comment Linear con todos los PRs). Pedir prompt orquestador.

## Kickoff corto

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-9-agricola-stub-demo.md

EST-8 Task 9. main ya tiene #23. Stub /agricola + seed platform_demo.md.
Sin password. No crear user Auth. Author lamakeka2026. 1 PR.
```
