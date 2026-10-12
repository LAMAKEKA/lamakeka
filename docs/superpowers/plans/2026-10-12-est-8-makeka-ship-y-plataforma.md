# EST-8 — Makeka ship + plataforma multi-rubro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar gaps críticos de Makeka para día a día y dejar spike/MVP de config multi-rubro en el mismo repo (registry + establecimiento config + demo `testprueba@gmail.com`), sin fork ni regresión del path Makeka.

**Architecture:** Makeka sigue siendo el default seed. Se extiende `establecimientos` con columnas de tenant/branding/modules; un `src/lib/modules/registry.ts` alimenta sidebar y bottom nav; `resolveTenant` carga config del user. Demo lab = user + fila `is_platform_demo` (allowlist email solo fallback).

**Tech Stack:** Next 16.2.x, React 19, Tailwind 4, Supabase cloud (`szffikjajxqxawxavshw`), Vitest, npm scripts del package `la-makeka-ai`.

## Global Constraints

- Remote: `https://github.com/LAMAKEKA/lamakeka.git` (org **sin** guion). Nunca `LA-MAKEKA/lamakeka`.
- gh user: `lamakeka2026` (`gh auth switch --user lamakeka2026` antes de push/PR).
- Commit author: `lamakeka2026 <lamakeka2026@gmail.com>`.
- 1 task = 1 branch = 1 PR a **main**. No push directo a main. No mega-PR.
- No secrets en git/Linear/PR. No password demo en claro.
- No unificar stock libreta+EID (D4). No RN rewrite. Fees → EST-5.
- No rehacer P0 manga/hacienda PRs #4–#14.
- Migración cloud: SQL Editor manual; no mentir “aplicada”.
- Next 16: mirar `node_modules/next/dist/docs/` si tocás APIs; proxy en `src/proxy.ts`.
- Path SoT: `/home/marti/Documentos/La Makeka` (no Orca worktree).
- Verify por PR código: `npm test` && `npm run typecheck` (+ `npm run build` si layout/routing).
- Spec: `docs/superpowers/specs/2026-10-12-plataforma-multi-rubro-prd.md`.

---

## File map (Fase B y A relevantes)

| File | Responsibility |
|------|----------------|
| `docs/superpowers/specs/2026-10-12-plataforma-multi-rubro-prd.md` | PRD + gap (Fase 0) |
| `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` | Este plan |
| `supabase/migrations/20261012000000_establecimiento_platform_config.sql` | Columnas tenant/modules |
| `src/lib/modules/registry.ts` | Catálogo módulos |
| `src/lib/modules/defaults.ts` | defaults por `tipo` + backfill Makeka |
| `src/lib/tenant/resolveTenant.ts` | Carga estab + flags demo |
| `src/lib/tenant/types.ts` | Tipos TenantConfig |
| `src/components/sidebar.tsx` | Nav desde registry filtrado |
| `src/components/mobile-bottom-nav.tsx` | Bottom nav data-driven |
| `src/components/app-shell.tsx` | Branding desde tenant |
| `src/app/setup/page.tsx` | Setea modules_enabled al crear |
| `src/app/agricola/page.tsx` | Stub agrícola |
| `supabase/seed/platform_demo.md` | Instrucciones seed demo (no secrets) |

---

### Task 0: Fase 0 docs (este PR)

**Files:**

- Create: `docs/superpowers/specs/2026-10-12-plataforma-multi-rubro-prd.md`
- Create: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md`

- [x] **Step 1:** Inventario code map + specs (gap G1–G15 en PRD §4).
- [x] **Step 2:** Escribir PRD + este plan.
- [ ] **Step 3:** Commit + PR docs only.

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout -b docs/est-8-gap-y-plataforma-plan   # si no existe
git add docs/superpowers/specs/2026-10-12-plataforma-multi-rubro-prd.md \
        docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" \
  -m "$(cat <<'EOF'
docs: EST-8 gap Makeka + PRD/plan plataforma multi-rubro

Refs EST-8
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head docs/est-8-gap-y-plataforma-plan \
  --title "docs: EST-8 gap Makeka + plan plataforma multi-rubro" \
  --body "$(cat <<'EOF'
## Summary
- Gap analysis Makeka post P0 manga/hacienda (#4–#14)
- PRD plataforma multi-rubro (mismo repo, ruteo demo)
- Plan tasks checkeables Fase A ship + Fase B spike

## Test plan
- [x] Docs only — no code
- [ ] Review humano PRD §4 gaps + §5 diseño

Refs EST-8
EOF
)"
```

**Done when:** PR docs abierto; EST-8 linkeado si Linear disponible.

---

### Task 1: Ops — verificar migración 20260923 en cloud (G1)

**Branch:** `docs/est-8-migracion-cloud-status` **o** comentario en PR A0 si solo docs; si se confirma SQL pendiente, branch `chore/est-8-migracion-cloud-notes`.

**Files:**

- Modify (opcional): `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` sección “Cloud status”
- No cambiar SQL de `20260923000000_…` salvo bug real

- [x] **Step 1:** VERIFY en cloud `szffikjajxqxawxavshw` (2026-10-12) vía PostgREST service role — ver § Cloud status (Task 1).
- [x] **Step 2:** APPLY **no necesario** — columnas + tabla ya expuestas (HTTP 200).
- [x] **Step 3:** Documentado: `cloud 20260923: aplicada`.
- [x] **Step 4:** Commit docs status (este PR Task 1).

**Done when:** Status explícito en PR; HaciendaPorAnimal deja de mostrar warning de migración si se aplicó.

---

### Task 2: Auth/setup hardening mínimo (G2–G3)

**Branch:** `fix/est-8-setup-gate-callback`

**Files:**

- Modify: `src/proxy.ts`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/page.tsx` (solo si hace falta alinear)
- Optional: helper `src/lib/estab/hasEstablecimiento.ts`

**Interfaces:**

- Produces: usuario autenticado sin estab → redirect `/setup` en rutas app (no public, no api estáticas)
- Consumes: Supabase session cookie ya usada en proxy

- [ ] **Step 1:** Leer `src/proxy.ts` y listar public routes actuales.
- [ ] **Step 2:** Tras auth, si path no es `/setup` ni public/api, chequear existencia de establecimiento (query mínima o claim). Si no hay → `NextResponse.redirect(/setup)`.
  - Cuidado performance: preferir check liviano; no bloquear `/api/rfid/scans` ni assets.
- [ ] **Step 3:** En `auth/callback/route.ts`: si OTP/code y user **ya** tiene establecimiento → `/` no `/setup`.
- [ ] **Step 4:** `npm run typecheck` && smoke:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
curl -sI http://localhost:3000/ | head -5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
```

- [ ] **Step 5:** Commit + PR

```bash
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" \
  -m "fix: gate setup global y callback sin re-setup"
```

**Done when:** User sin estab no entra a `/manga` vacío; user con estab no es mandado a setup en callback.

---

### Task 3: Smoke Makeka flujos críticos (checklist, puede ser PR docs o issue)

**Branch:** `docs/est-8-smoke-makeka` **o** comentario en EST-8

No código salvo bugs blocker encontrados (entonces PR `fix/…` aparte, 1 bug = 1 PR).

- [x] **Step 1:** Login user Makeka real — **parcial:** sin credenciales en sesión agente; UI `/login` OK; campo live **BLOCKED** (humano).
- [x] **Step 2:** Checklist — ver ops completo:

`docs/superpowers/ops/2026-10-12-smoke-makeka-est-8-task-3.md`  
(auto: test/typecheck/curl/gate code; browser login; campo UI BLOCKED)

| Flujo | OK? | Nota |
|-------|-----|------|
| Home carga métricas | BLOCKED | falta sesión dueño |
| Manga: scan/HID path UI | OK code / BLOCKED UI | `useHidCapture`; bastón SKIP |
| Alta animal cat+potrero | OK code | cat obligatoria; sin potrero → sin_ubicar |
| Hacienda por-animal lista | OK code / BLOCKED UI | default tab EID |
| Ficha + egreso saca stock | OK code / BLOCKED UI | AnimalFichaDrawer |
| Hacienda por-cantidad intacta | OK code | tabs duales |
| Potreros cabezas EID | OK code / BLOCKED UI | ESTADOS_STOCK |
| SENASA export stock | OK code / BLOCKED UI | incluirBajas |
| Bottom nav + logout mobile | OK code | #13/#14 |
| Offline queue no rompe | OK code / SKIP cola | |
| Auth gate `/`→login | OK | 307 |
| Setup gate #17 | OK code | proxy + callback |
| test+typecheck | OK | 33 tests; tsc 0 |

- [x] **Step 3:** Bugs P0 → ninguno evidenciado. P2 N1: RFID sin cookie 307 login (doc ops). Campo live = follow-up humano.
- [x] **Step 4:** Docs smoke results (este PR).

**Done when:** Tabla smoke en PR/EST-8; blockers triageados.  
**Status 2026-10-12:** go Fase B con caveat smoke campo humano pendiente (no P0).

---

### Task 4: Migración config establecimiento (Fase B schema)

**Branch:** `feat/est-8-establecimiento-platform-config`

**Files:**

- Create: `supabase/migrations/20261012000000_establecimiento_platform_config.sql`

- [ ] **Step 1:** Escribir migración idempotente:

```sql
-- EST-8 platform config on establecimientos
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
UPDATE public.establecimientos e
SET
  nombre_display = COALESCE(e.nombre_display, e.nombre),
  logo_url = COALESCE(e.logo_url, '/logo-makeka.png'),
  tagline = COALESCE(e.tagline, 'AI · Ganadera'),
  rubros = CASE
    WHEN e.rubros IS NOT NULL AND array_length(e.rubros, 1) >= 1 THEN e.rubros
    WHEN e.tipo = 'agricola' THEN ARRAY['agricola']::text[]
    WHEN e.tipo = 'mixto' THEN ARRAY['ganaderia','agricola']::text[]
    ELSE ARRAY['ganaderia']::text[]
  END,
  modules_enabled = CASE
    WHEN e.modules_enabled IS NOT NULL AND array_length(e.modules_enabled, 1) >= 1
      THEN e.modules_enabled
    WHEN e.tipo = 'agricola' THEN ARRAY[
      'inicio','agricola','insumos','finanzas','reportes','tareas'
    ]::text[]
    WHEN e.tipo = 'mixto' THEN ARRAY[
      'inicio','manga','hacienda','potreros','senasa','agricola',
      'produccion_huevos','insumos','finanzas','reportes','tareas'
    ]::text[]
    ELSE ARRAY[
      'inicio','manga','hacienda','potreros','senasa',
      'produccion_huevos','insumos','finanzas','reportes','tareas'
    ]::text[]
  END
WHERE true;
```

- [ ] **Step 2:** PR con instrucciones SQL Editor (mismo protocolo Task 1). **No** afirmar aplicada en cloud.
- [ ] **Step 3:** Commit

```bash
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" \
  -m "feat: columnas platform config en establecimientos"
```

**Done when:** SQL en repo; backfill preserva nav Makeka; UNIQUE user_id intacto.

---

### Task 5: Module registry + defaults (código puro)

**Branch:** `feat/est-8-module-registry`

**Files:**

- Create: `src/lib/modules/registry.ts`
- Create: `src/lib/modules/defaults.ts`
- Create: `src/lib/modules/registry.test.ts`

**Interfaces:**

```ts
// registry.ts
export type ModuleId =
  | "inicio" | "manga" | "hacienda" | "potreros" | "senasa"
  | "produccion_huevos" | "agricola" | "insumos" | "finanzas"
  | "reportes" | "tareas" | "whatsapp";

export type Rubro = "ganaderia" | "agricola" | "huevos" | "core";
export type NavSlot = "primary" | "more" | "secondary";

export interface AppModule {
  id: ModuleId;
  label: string;
  href: string;
  icon: ModuleIconName; // union de keys mapeadas en UI
  rubros: Rubro[];
  navSlot: NavSlot;
  core: boolean;
  bottomNavOrder?: number; // undefined = no bottom primary
}

export declare const MODULE_REGISTRY: readonly AppModule[];
export declare function getModule(id: ModuleId): AppModule | undefined;
export declare function filterModules(
  enabled: readonly string[],
  opts?: { includeSecondary?: boolean }
): AppModule[];
```

```ts
// defaults.ts
export declare function defaultModulesForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): ModuleId[];
export declare function defaultRubrosForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): string[];
export declare const MAKEKA_LEGACY_MODULES: ModuleId[]; // = sidebar actual
export declare const PLATFORM_DEMO_MODULES: ModuleId[];
```

- [ ] **Step 1:** Write failing tests en `registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterModules, MODULE_REGISTRY } from "./registry";
import { defaultModulesForTipo, PLATFORM_DEMO_MODULES } from "./defaults";

describe("filterModules", () => {
  it("returns only enabled modules in registry order", () => {
    const ids = filterModules(["inicio", "hacienda", "nope"]).map((m) => m.id);
    expect(ids).toEqual(["inicio", "hacienda"]);
  });

  it("Makeka legacy set includes manga and hacienda", () => {
    const gan = defaultModulesForTipo("ganadero");
    expect(gan).toContain("manga");
    expect(gan).toContain("hacienda");
  });

  it("agricola default excludes manga", () => {
    expect(defaultModulesForTipo("agricola")).not.toContain("manga");
  });

  it("platform demo is non-empty subset", () => {
    expect(PLATFORM_DEMO_MODULES.length).toBeGreaterThan(0);
    expect(MODULE_REGISTRY.length).toBeGreaterThan(PLATFORM_DEMO_MODULES.length);
  });
});
```

- [ ] **Step 2:** `npm test -- src/lib/modules/registry.test.ts` → FAIL
- [ ] **Step 3:** Implement registry alineado a nav actual:

| id | href | label | bottomNavOrder |
|----|------|-------|----------------|
| inicio | `/` | Inicio | 1 |
| hacienda | `/hacienda` | Hacienda | 2 |
| manga | `/manga` | Manga | 3 (FAB center hoy) |
| potreros | `/potreros` | Potreros / Campo | 4 |
| senasa | `/senasa` | SENASA | more |
| produccion_huevos | `/produccion` | Producción | more |
| agricola | `/agricola` | Agrícola | more |
| insumos | `/insumos` | Insumos | more |
| finanzas | `/finanzas` | Finanzas | more |
| reportes | `/reportes` | Reportes | more |
| tareas | `/tareas` | Tareas | more |
| whatsapp | `/whatsapp` | WhatsApp Bot | secondary |

- [ ] **Step 4:** `npm test` PASS + `npm run typecheck`
- [ ] **Step 5:** Commit

```bash
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" \
  -m "feat: module registry y defaults por tipo"
```

**Done when:** tests verdes; un solo catálogo; sin wiring UI aún (OK).

---

### Task 6: resolveTenant + types

**Branch:** `feat/est-8-resolve-tenant`

**Files:**

- Create: `src/lib/tenant/types.ts`
- Create: `src/lib/tenant/resolveTenant.ts`
- Create: `src/lib/tenant/resolveTenant.test.ts` (unit con mocks puros si no hay SB; o pure helpers)
- Create: `src/lib/tenant/platformDemo.ts` — constante email, **no** password

**Interfaces:**

```ts
// types.ts
export interface TenantConfig {
  establecimientoId: string;
  nombre: string;
  nombreDisplay: string;
  logoUrl: string;
  tagline: string;
  tipo: "ganadero" | "agricola" | "mixto";
  rubros: string[];
  modulesEnabled: string[];
  isPlatformDemo: boolean;
  brandTheme: Record<string, string> | null;
}

export const PLATFORM_DEMO_EMAIL = "testprueba@gmail.com";
```

```ts
// resolveTenant.ts
export declare function mapEstablecimientoRow(row: {
  id: string;
  nombre: string;
  tipo: string;
  nombre_display?: string | null;
  logo_url?: string | null;
  tagline?: string | null;
  rubros?: string[] | null;
  modules_enabled?: string[] | null;
  is_platform_demo?: boolean | null;
  brand_theme?: Record<string, string> | null;
}): TenantConfig;

export declare function applyDemoEmailFallback(
  config: TenantConfig | null,
  userEmail: string | null | undefined
): TenantConfig | null;
// Si email === PLATFORM_DEMO_EMAIL y config null → null (setup creará);
// Si email demo y config existe → force isPlatformDemo visuals only if flag set.
```

- [ ] **Step 1:** Tests de `mapEstablecimientoRow` defaults (logo Makeka, tagline, modules vacíos → defaults por tipo).
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** `npm test` + typecheck.
- [ ] **Step 4:** Commit `feat: resolveTenant y TenantConfig`

**Done when:** mapping puro testeado; email constant en un solo file.

---

### Task 7: Nav + shell data-driven (cero regresión Makeka)

**Branch:** `feat/est-8-nav-registry`

**Files:**

- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/mobile-bottom-nav.tsx`
- Modify: `src/components/app-shell.tsx`
- Optional: `src/hooks/useTenant.ts` (client fetch estab + map)

**Comportamiento:**

1. `useTenant` / fetch: `establecimientos` limit 1 del user → `mapEstablecimientoRow`.
2. Si columnas aún no existen en cloud (error schema): **fallback** `MAKEKA_LEGACY_MODULES` + brand Makeka (no crashear).
3. Sidebar: `filterModules(modulesEnabled)` + secondary whatsapp si enabled o legacy secondary.
4. Bottom nav: modules con `bottomNavOrder` sorted; FAB manga si manga enabled else primer primary.
5. Branding: `nombreDisplay`, `logoUrl`, `tagline`.

- [ ] **Step 1:** Implement useTenant con selects literales + cast (pitfall client types).
- [ ] **Step 2:** Reemplazar arrays hardcode; map icon string → componente lucide en un `iconMap`.
- [ ] **Step 3:** Smoke visual: user Makeka ve **mismos** ítems que antes (backfill Task 4).
- [ ] **Step 4:** `npm run typecheck` && `npm test` && prefer `npm run build`
- [ ] **Step 5:** Commit `feat: sidebar y bottom nav desde module registry`

**Done when:** Makeka nav idéntica en smoke; no hardcode listas de href en sidebar.

---

### Task 8: Setup escribe modules_enabled + defaults

**Branch:** `feat/est-8-setup-modules`

**Files:**

- Modify: `src/app/setup/page.tsx`

- [ ] **Step 1:** Al insertar establecimiento, setear:

```ts
import { defaultModulesForTipo, defaultRubrosForTipo } from "@/lib/modules/defaults";

const payload = {
  nombre,
  ubicacion,
  tipo,
  user_id: user.id,
  nombre_display: nombre,
  logo_url: "/logo-makeka.png", // producto default; demo se pisa en seed
  tagline: tipo === "agricola" ? "AI · Campo" : "AI · Ganadera",
  rubros: defaultRubrosForTipo(tipo),
  modules_enabled: defaultModulesForTipo(tipo),
  is_platform_demo: user.email === PLATFORM_DEMO_EMAIL,
};
```

- [ ] **Step 2:** Si columnas no migradas en cloud, catch y insert mínimo legacy (nombre, ubicacion, tipo, user_id) + mensaje “actualizá schema”.
- [ ] **Step 3:** typecheck + commit `feat: setup setea modules_enabled por tipo`

**Done when:** nuevo estab agrícola no habilita manga en config (aunque cloud nav lo respete post Task 7).

---

### Task 9: Stub agrícola + seed demo docs

**Branch:** `feat/est-8-agricola-stub-demo`

**Files:**

- Create: `src/app/agricola/page.tsx`
- Create: `supabase/seed/platform_demo.md` (instrucciones; **sin** password)
- Modify: registry already has agricola (Task 5)

- [ ] **Step 1:** Page client o server simple:

```tsx
// Placeholder gated: si tenant sin módulo agricola, redirect /
// UI: título "Agrícola", copy "Módulo en construcción — lotes y cultivos pronto."
// Sin fake data productiva.
```

- [ ] **Step 2:** `platform_demo.md` pasos:

```markdown
# Seed platform demo
1. Auth: crear user testprueba@gmail.com (Dashboard) — password en 1Password/chat, NUNCA git
2. Login una vez → /setup → nombre "Campo Demo", tipo mixto
3. SQL opcional:
   UPDATE establecimientos SET
     is_platform_demo = true,
     nombre_display = 'Campo Demo',
     tagline = 'Plataforma multi-rubro',
     logo_url = '/logo-makeka.png', -- o asset genérico futuro
     modules_enabled = ARRAY['inicio','agricola','hacienda','insumos','finanzas','tareas'],
     rubros = ARRAY['ganaderia','agricola']
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'testprueba@gmail.com');
4. Smoke: login demo → nav sin manga/senasa si no en array; Makeka user intacto
```

- [ ] **Step 3:** typecheck + commit `feat: stub agricola y docs seed demo`

**Done when:** ruta existe; seed documentado; user demo **creado sí/no** declarado en PR body.

---

### Task 10: Cierre EST-8 + Linear

**Branch:** n/a (comentario) o `docs/est-8-cierre`

- [ ] **Step 1:** Checklist done del handoff:

```text
- [ ] PR docs Fase 0
- [ ] Gaps críticos cerrados o severity+split
- [ ] Migración cloud status documentado
- [ ] Module registry + nav data-driven
- [ ] Config tenant migración + defaults Makeka
- [ ] testprueba rutea genérico
- [ ] Makeka users experiencia actual
- [ ] Smoke localhost
- [ ] EST-8 actualizado con links PRs
```

- [ ] **Step 2:** Si Linear EST-8 no resoluble por API, body del último PR lista URLs.
- [ ] **Step 3:** Proponer split EST-8a/8b solo si quedó trabajo gordo pending.

**Done when:** humano tiene URLs PRs, SQL pendiente, y “user demo creado: sí/no”.

---

## PRs fuera de scope (no hacer en EST-8)

- RLS hardening masivo (G9) — ticket aparte post multi-user.
- Forgot password (G4), profile full_name (G5) — P2 opcionales si sobra.
- Historial potreros real (G7), unificar stock (D4), fees (EST-5).
- Tests E2E manga/HID.

## Opcional P2 (si humano pide)

### Task A1: fix categorías CHECK animales (G8)

```sql
-- alineación CATEGORIAS_BOVINOS — PR fix/ chico
```

### Task A2: forgot password wire Supabase reset

---

## Cloud status (llenar en ejecución)

| Migración | Repo | Cloud `szffik…` | Fecha check |
|-----------|------|-----------------|-------------|
| `20260923000000_manga_hacienda_integracion.sql` | sí | **aplicada** | 2026-10-12 |
| `20261012000000_establecimiento_platform_config.sql` | Task 4 | _pendiente_ | |

## Cloud status (Task 1)

| Item | Valor |
|------|--------|
| Project ref | `szffikjajxqxawxavshw` |
| Migración | `20260923000000_manga_hacienda_integracion.sql` |
| Status | **`aplicada`** |
| Verificado | 2026-10-12 |
| Evidence | PostgREST (service role, host del project ref): `GET /rest/v1/manga_animales?select=estado` → **200**; `select=updated_at,updated_by` → **200**; `GET /rest/v1/animal_eventos?select=id` → **200**. Bodies `[]` (sin filas o vacíos), no error de columna/relación inexistente (PostgREST 400/PGRST si faltara schema). |
| Acción humana | APPLY SQL Editor: **no** (ya presente). Re-VERIFY SQL Editor opcional con el bloque del handoff Task 1 si se quiere constraint/RLS explícitos. |
| Nota método | Agent no usó Dashboard SQL Editor; verify vía API REST del mismo project. No secrets en este doc. |

---

## Definition of done EST-8

1. PR docs mergeado o abierto con gap + PRD + plan.  
2. Makeka: G1 resuelto o documentado; smoke flujos OK o bugs triageados.  
3. Platform: migración config + registry + nav + setup defaults + demo path documentado.  
4. Login Makeka ≠ login demo en módulos visibles.  
5. `npm test` + `npm run typecheck` verdes en PRs código.

## Execution handoff

```text
Ejecutá el plan:
docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
según PRD:
docs/superpowers/specs/2026-10-12-plataforma-multi-rubro-prd.md
Repo: ~/Documentos/La Makeka · LAMAKEKA/lamakeka · lamakeka2026
Empezá por Task 0 (si no mergeada) luego Task 1.
1 task = 1 branch = 1 PR. No mega-PR. No RN. No fees. No unificar stock.
```
