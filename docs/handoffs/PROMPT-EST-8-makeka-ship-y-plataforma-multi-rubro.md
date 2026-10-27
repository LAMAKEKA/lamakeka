# EST-8 — Makeka ship + plataforma multi-rubro (mismo repo, ruteo por usuario)

**Leé y ejecutá este brief completo.** No reinventes producto fuera de `docs/superpowers/`. Respuestas al humano en español corto.

## Ticket / outcome

- Linear: **EST-8** — https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Título: Makeka: terminar app + genérica multi-rubro (ganadería/agrícola/…)
- Outcome:
  1. Makeka puede operar el día a día sin gaps críticos del plan actual.
  2. Hay camino claro **y al menos un spike/MVP de config** para levantar otro campo/rubro **sin clonar el repo**.
- **NO** es rewrite React Native. Default: Next shell mobile-first (ya hay bottom nav).
- Fees comerciales → EST-5 (fuera de scope).
- Remote **NO** usar: `LA-MAKEKA/lamakeka` (con guion).

## Repo / stack / cuentas

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| GH | `https://github.com/LAMAKEKA/lamakeka.git` (org **LAMAKEKA**, sin guion) |
| gh user | `lamakeka2026` → `gh auth switch --user lamakeka2026` antes de push/PR |
| Commit author | `lamakeka2026 <lamakeka2026@gmail.com>` (repo-local o `--author`) |
| Package | `la-makeka-ai` — **npm** (`npm run dev/build/lint/typecheck/test`) |
| Stack | Next **16.2.x** + React 19 + Tailwind 4 + Turbopack + Supabase **cloud** + Vercel |
| Prod | https://lamakeka.vercel.app (solo `main`) |
| SB project ref | `szffikjajxqxawxavshw` (no pegar secrets; `.env.local` ya existe) |
| SoT producto | `docs/superpowers/specs/` + `docs/superpowers/plans/` + skill mental `la-makeka-dev-pitfalls` |
| Naming | UI **La Makeka**; dueño dice **Mateca** = mismo producto |
| AGENTS.md | Next 16 ≠ training data; mirar `node_modules/next/dist/docs/` si tocás APIs |

## Decisión de producto LOCKED (humano 2026-10-12)

**Mismo repo, sin fork.** Ruteo por identidad de login:

1. **Usuario Makeka real** (dueño / operadores actuales del campo) → entra a la app **como está hoy**: branding La Makeka, módulos ganaderos (manga, hacienda dual, potreros, SENASA, etc.). **No romper** este path.
2. **Usuario de laboratorio** `testprueba@gmail.com` → entra a la **app genérica / plataforma multi-rubro** (shell + onboarding de establecimiento + módulos por rubro / feature flags). Sirve para diseñar y smoke la plataforma sin contaminar datos ni UX de Makeka producción.
3. No clonar repo. No segundo deploy obligatorio en el MVP del spike (puede ser misma Vercel + misma SB con filas distintas). Si hace falta segunda org en cloud, **documentar** y no aplicar DDL a ciegas.

Implementación esperada del ruteo (elige el diseño mínimo viable, documentá en PR):

- Tras `signInWithPassword` / en layout autenticado: resolver **tenant profile** o **flag** del user.
- Preferido: tabla/config de **tenant** o campos en `profiles` / `establecimientos` (`slug`, `brand_name`, `rubros[]`, `modules_enabled`, `is_platform_demo`, `theme`).
- Fallback aceptable **solo para spike corto**: allowlist email `testprueba@gmail.com` → `mode=platform` **pero** el diseño debe dejar el camino a config DB (no ifs eternos hardcode “Makeka” en cada página).
- Makeka default = comportamiento actual si no hay flag platform.

**Crear el user** `testprueba@gmail.com` en Supabase Auth (Dashboard o Admin API) si no existe; password de prueba **no** commitear. Dejar en el PR body: “user demo creado en cloud: sí/no + cómo”.

## Estado actual del código (no rehacer)

P0 manga↔hacienda **mergeado** en main (PRs #4–#12 + mobile shell #13–#14):

| Área | Path / nota |
|------|-------------|
| Migración estado + `animal_eventos` | `supabase/migrations/20260923000000_manga_hacienda_integracion.sql` (**repo ≠ cloud**; SQL Editor si falta) |
| Stock helpers | `src/lib/haciendaStock.ts` + tests |
| Eventos manga | `src/lib/animalEventos.ts`, hooks manga |
| Listado EID | `src/hooks/useHaciendaAnimales.ts` |
| Ficha | `src/components/hacienda/AnimalFichaDrawer.tsx` |
| Hacienda dual | `src/app/hacienda/page.tsx` + `HaciendaPorAnimal.tsx` |
| Potreros EID | `src/app/potreros/page.tsx` |
| SENASA stock | `src/app/senasa/page.tsx` |
| Shell mobile | `app-shell.tsx`, `mobile-bottom-nav.tsx`, `sidebar.tsx` |
| Login LAN | `login/page.tsx` usa `window.location.assign("/")`; `next.config.ts` `allowedDevOrigins` |
| Setup campo | `src/app/setup/page.tsx` ya tiene tipos `ganadero \| agricola \| mixto` |
| Schema | `establecimientos.tipo` check ya incluye ganadero/agricola/mixto; `user_id` unique 1:1 hoy |
| HID | `useHidCapture` = keyboard wedge XRS2i — **no** Web Bluetooth |

Specs/plans canónicos:

- `docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md`
- `docs/superpowers/plans/2026-09-23-manga-hacienda-integracion.md`
- `docs/superpowers/specs/2026-09-23-reunion-dueno-mateca.md`
- `docs/superpowers/specs/2026-08-12-rfid-xrs2i-design.md`
- SUPERSEDED: `2026-08-13-manga-hacienda-integracion-design.md` (no usar)
- Huevos: specs/plans 2026-08-17 (código mergeado; **no empujar** por encima de hacienda salvo dueño)

## Estrategia de ejecución (OBLIGATORIA)

Este ticket es **gigante**. **NO** un mega-PR. Convención del repo: **1 task plan = 1 branch = 1 commit (o pocos) = 1 PR a main**.

### Fase 0 — Inventario + plan escrito (PR docs primero)

Branch: `docs/est-8-gap-y-plataforma-plan`

1. Leer specs/plans + code map real.
2. Escribir:
   - `docs/superpowers/specs/2026-10-12-plataforma-multi-rubro-prd.md` (o fecha del día)
   - `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` con tasks numeradas checkeables
3. Gap analysis Makeka (Fase A): qué falta vs día a día real (auth, setup, manga, hacienda dual, potreros, SENASA, mobile, migraciones cloud aplicadas o no, bugs conocidos).
4. Diseño Fase B: modelo tenant/establecimiento, rubros, modules, branding, ruteo `testprueba@gmail.com`, core vs add-on.
5. PR docs only. Actualizar EST-8 en Linear con link al PR + resumen (si tenés Linear; si no, body del PR).

### Fase A — Terminar Makeka (ship gaps)

Orden sugerido (ajustá según gap real del inventario; no inventes features de marketing):

1. **Ops/schema:** verificar si migración `20260923…` está en cloud; si no, dejar SQL listo + instrucciones SQL Editor (Hermes/peer **no** puede `supabase login` interactivo a ciegas). No mentir “aplicada”.
2. **Auth/onboarding:** login, register, setup establecimiento, redirect post-login, sesión estable en LAN/celu.
3. **Flujos críticos campo:** manga HID/EID, alta con categoría, hacienda por-animal + por-cantidad, ficha/egreso, potreros counts, SENASA export/filtro stock.
4. **Mobile-first residuales:** hits ≥48px, bottom nav primarios, tablas→cards si es blocker, user/logout (ya #14).
5. **Smoke:** `npm run dev -- -H 0.0.0.0 -p 3000` + curl `/`→307 `/login` + browser. Celu LAN si IP en `allowedDevOrigins`.
6. **No** unificar stock libreta+EID (D4 PRD). **No** romper offline queue / RFID scans / ExportCSV.

Cada gap = branch `fix/…` o `feat/…` + PR chico.

### Fase B — Plataforma genérica (spike/MVP en mismo repo)

Objetivo mínimo del “done” EST-8 punto 2:

1. **Modelo de config** (migración + types):
   - Extender `establecimientos` y/o nueva `tenant_settings` / `org_modules`:
     - `nombre_display`, `logo_url` opcional
     - `rubros: text[]` o jsonb (`ganaderia`, `agricola`, …)
     - `modules_enabled: text[]` (ej. `manga`, `hacienda`, `potreros`, `senasa`, `produccion_huevos`, `insumos`, `finanzas`, `tareas`)
     - `brand_theme` opcional (CSS vars o tokens)
   - Resolver tension **unique(user_id)** actual vs multi-campo futuro: para MVP puede quedar 1 establecimiento/user; documentar multi-org como P2. No reescribir todo el RLS en un PR.
2. **Module registry** en código (un solo lugar):
   - ej. `src/lib/modules/registry.ts` — id, label, href, icon, rubros compatibles, `navSlot` (primary|more)
   - Sidebar + bottom nav **leen registry filtrado** por `modules_enabled` del establecimiento activo — **cero** listas hardcode eternas “Makeka” duplicadas.
3. **Branding shell:** título/logo/copy desde config; Makeka = seed/default values actuales (`La Makeka`, logo `/logo-makeka.png`, “AI · Ganadera”).
4. **Ruteo demo:**
   - User `testprueba@gmail.com` → establecimiento demo **genérico** (nombre tipo “Campo Demo” / “Plataforma”) con subset de módulos (ej. setup + inicio + 1 módulo agrícola stub + 1 ganadero o flags mixtos) **sin** datos productivos de Makeka.
   - Seed SQL o script documentado (no secretos).
5. **UI genérica mínima:**
   - Home/dashboard que no diga solo “La Makeka” hardcode cuando mode=platform.
   - Setup ya tiene tipo ganadero/agricola/mixto — conectar a `modules_enabled` defaults por tipo.
6. **Stub agrícola (hook futuro):** una ruta o sección placeholder “Agrícola” gated por módulo, sin fingir producción completa.
7. **Documentar** core vs add-on:

| Core | Add-on vertical |
|------|-----------------|
| Auth, profiles, establecimientos, shell, nav registry, insumos/tareas/finanzas genéricos si aplican | Manga HID/EID, Hacienda, SENASA, Potreros ganaderos, Producción huevos, futuros cultivos |

## Git / PR rules

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git remote get-url origin   # debe ser LAMAKEKA/lamakeka.git
git checkout main && git pull
git checkout -b <tipo>/<slug>
# … trabajo acotado …
npm test && npm run typecheck
# lint scoped si root es ruidoso: npx eslint src/…
git add -A  # NO: evitar .env, .next, tsbuildinfo basura, supabase/config.toml drift puertos
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "docs|feat|fix: …"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head <branch> \
  --title "…" --body "Closes/Refs EST-8 …"
```

- **Nunca** push a main directo.
- **Nunca** secrets en git/Linear/PR.
- **Nunca** `git reset --hard` sin OK humano.
- Si scope explota: proponer split Linear (EST-8a Makeka ship / EST-8b platform) en el PR docs — no callar y meter 40 archivos.

## Pitfalls (bake)

1. Remote con guion / cuenta gh equivocada.
2. Hydration en login = extensión password manager, no “fix” del form.
3. Login celu LAN: `allowedDevOrigins` + `location.assign("/")`.
4. Migración en repo ≠ aplicada en cloud; DDL vía SQL Editor del project `szffik…`.
5. `gh` lamakeka ≠ auth Supabase CLI.
6. Dual stock libreta+EID: tabs, no unificar MVP.
7. Client Supabase sin Database types: selects literales + cast, no string concat inferido.
8. Background watch_patterns con palabra `error` = ruido zsh; usar Ready/Local/EADDRINUSE.
9. Orca worktree `~/orca/workspaces/La Makeka` **no** es SoT; usar Documentos.
10. Huevos ya mergeados: no priorizar sobre hacienda.
11. Next 16 proxy en `src/proxy.ts` (no asumir middleware clásico sin leer).
12. Hardcode “Makeka” en 20 archivos = fracaso de Fase B; registry + config.

## Verify gates

Por PR de código:

```bash
npm test
npm run typecheck
# build si tocás routing/layout:
npm run build
```

Smoke browser (obligatorio para auth/shell/nav):

```bash
npm run dev -- -H 0.0.0.0 -p 3000
curl -sI http://localhost:3000/ | head -5          # 307 → /login
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login  # 200
```

- Login user Makeka real → shell Makeka (manga/hacienda visibles según hoy).
- Login `testprueba@gmail.com` → shell genérico / módulos según config demo.
- No regresión: hidratação falsa no es bug; HID path intacto.

## Done checklist EST-8

- [ ] PR docs: gap Makeka + PRD/plan plataforma + core vs add-on
- [ ] Gaps críticos Makeka cerrados en PRs chicos **o** listados con severity + ticket split si bloquean
- [ ] Migración/cloud status documentado
- [ ] Module registry + nav data-driven
- [ ] Config tenant/establecimiento (migración + defaults Makeka)
- [ ] User demo `testprueba@gmail.com` rutea a experiencia genérica
- [ ] Makeka users siguen en experiencia actual
- [ ] Smoke localhost (+ LAN si aplica)
- [ ] Comentario/actualización EST-8 con links de PRs

## Entrega al humano

Al final de cada fase: URLs de PRs, qué quedó pending, SQL pendiente de pegar en Dashboard, credenciales demo **sin** password en claro en git (decir “está en 1Password/chat del user” o que él setee).

**Primera acción ahora:** Fase 0 inventario + docs PR. No code de plataforma antes del plan escrito salvo bugs triviales de Makeka que bloqueen leer el app.
