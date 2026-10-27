# EST-8 Task 5 — Module registry + defaults (código puro)

**Leé y ejecutá este brief.** Español corto. **Solo** `src/lib/modules/*` + tests. **No** wire sidebar/bottom-nav/shell (Task 7). **No** resolveTenant (Task 6). **No** SQL.

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 5**
- PRD: registry multi-rubro / nav data-driven (prep)
- Ya en main: #15–#19  
  - #19 Task 4 platform SQL **cloud 20261012 aplicada** (`f74fdaf`)  
  - App **aún no lee** `modules_enabled` — este PR tampoco cablea UI

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `LAMAKEKA/lamakeka` (sin guion) |
| gh | `lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` @ post-#19 (`git pull`) |
| SB | cloud OK; **no** migración en este PR |

## Qué NO hacer

- No tocar `sidebar.tsx` / `mobile-bottom-nav.tsx` / `app-shell.tsx` / setup / pages.
- No `resolveTenant`, no demo seed, no user `testprueba`.
- No SQL / no SQL Editor.
- No unificar stock libreta+EID. No RN. No secrets.
- No push a main. 1 branch = 1 PR.
- No remote `LA-MAKEKA` con guion.
- No mega-refactor iconos lucide en UI (solo **string keys** en registry; UI mapeará en Task 7).
- No inventar módulos fuera del plan (lista cerrada abajo).

## Objetivo

1. Catálogo único `MODULE_REGISTRY` alineado a nav Makeka actual.
2. `filterModules(enabled)` respeta **orden del registry**, ignora ids desconocidos.
3. Defaults por `tipo` (`ganadero` | `agricola` | `mixto`) = mismos arrays que backfill Task 4.
4. `MAKEKA_LEGACY_MODULES` + `PLATFORM_DEMO_MODULES` exportados.
5. Tests vitest verdes + typecheck.
6. Cero cambio runtime UI (import nobody yet = OK).

## Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b feat/est-8-module-registry
```

## Files

| Path | Acción |
|------|--------|
| `src/lib/modules/registry.ts` | create |
| `src/lib/modules/defaults.ts` | create |
| `src/lib/modules/registry.test.ts` | create |

Opcional si queda más limpio: `src/lib/modules/types.ts` — o todo en registry/defaults.

## TDD

### Step 1 — tests primero (FAIL)

`src/lib/modules/registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterModules, MODULE_REGISTRY, getModule } from "./registry";
import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
  MAKEKA_LEGACY_MODULES,
  PLATFORM_DEMO_MODULES,
} from "./defaults";

describe("filterModules", () => {
  it("returns only enabled modules in registry order", () => {
    const ids = filterModules(["inicio", "hacienda", "nope"]).map((m) => m.id);
    expect(ids).toEqual(["inicio", "hacienda"]);
  });

  it("preserves registry order even if enabled is shuffled", () => {
    const ids = filterModules(["senasa", "inicio", "manga"]).map((m) => m.id);
    expect(ids).toEqual(["inicio", "manga", "senasa"]);
  });

  it("includeSecondary false skips secondary slot by default", () => {
    const ids = filterModules(["inicio", "whatsapp"]).map((m) => m.id);
    expect(ids).toEqual(["inicio"]);
  });

  it("includeSecondary true keeps whatsapp if enabled", () => {
    const ids = filterModules(["inicio", "whatsapp"], {
      includeSecondary: true,
    }).map((m) => m.id);
    expect(ids).toEqual(["inicio", "whatsapp"]);
  });
});

describe("getModule", () => {
  it("finds manga", () => {
    expect(getModule("manga")?.href).toBe("/manga");
  });
});

describe("defaults", () => {
  it("Makeka legacy / ganadero includes manga and hacienda", () => {
    const gan = defaultModulesForTipo("ganadero");
    expect(gan).toContain("manga");
    expect(gan).toContain("hacienda");
    expect(gan).toEqual([...MAKEKA_LEGACY_MODULES]);
  });

  it("agricola default excludes manga", () => {
    expect(defaultModulesForTipo("agricola")).not.toContain("manga");
    expect(defaultModulesForTipo("agricola")).toContain("agricola");
  });

  it("mixto includes manga and agricola", () => {
    const m = defaultModulesForTipo("mixto");
    expect(m).toContain("manga");
    expect(m).toContain("agricola");
  });

  it("defaultRubrosForTipo matches tipo", () => {
    expect(defaultRubrosForTipo("ganadero")).toEqual(["ganaderia"]);
    expect(defaultRubrosForTipo("agricola")).toEqual(["agricola"]);
    expect(defaultRubrosForTipo("mixto")).toEqual(["ganaderia", "agricola"]);
  });

  it("platform demo is non-empty proper subset of registry ids", () => {
    expect(PLATFORM_DEMO_MODULES.length).toBeGreaterThan(0);
    expect(MODULE_REGISTRY.length).toBeGreaterThan(PLATFORM_DEMO_MODULES.length);
    for (const id of PLATFORM_DEMO_MODULES) {
      expect(MODULE_REGISTRY.some((m) => m.id === id)).toBe(true);
    }
  });

  it("every MAKEKA_LEGACY id exists in registry", () => {
    for (const id of MAKEKA_LEGACY_MODULES) {
      expect(getModule(id)).toBeTruthy();
    }
  });
});
```

```bash
npm test -- src/lib/modules/registry.test.ts   # expect FAIL
```

### Step 2 — implement

#### `registry.ts` — shapes

```ts
export type ModuleId =
  | "inicio"
  | "manga"
  | "hacienda"
  | "potreros"
  | "senasa"
  | "produccion_huevos"
  | "agricola"
  | "insumos"
  | "finanzas"
  | "reportes"
  | "tareas"
  | "whatsapp";

export type Rubro = "ganaderia" | "agricola" | "huevos" | "core";
export type NavSlot = "primary" | "more" | "secondary";

/** String keys — Task 7 maps to lucide. Do not import react-icons here. */
export type ModuleIconName =
  | "layout-dashboard"
  | "beef"
  | "scan-line"
  | "map"
  | "shield-check"
  | "egg"
  | "sprout" // o "wheat" — documentá el string; UI Task 7
  | "package"
  | "bar-chart-2"
  | "pie-chart"
  | "check-square"
  | "message-circle";

export interface AppModule {
  id: ModuleId;
  label: string;
  href: string;
  icon: ModuleIconName;
  rubros: Rubro[];
  navSlot: NavSlot;
  core: boolean;
  /** Bottom primary order; undefined = not in bottom strip */
  bottomNavOrder?: number;
  badge?: string; // e.g. whatsapp "PRONTO"
}

export const MODULE_REGISTRY: readonly AppModule[] = [ /* ver tabla */ ];

export function getModule(id: ModuleId): AppModule | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id);
}

export function filterModules(
  enabled: readonly string[],
  opts?: { includeSecondary?: boolean }
): AppModule[] {
  const set = new Set(enabled);
  const includeSecondary = opts?.includeSecondary ?? false;
  return MODULE_REGISTRY.filter((m) => {
    if (!set.has(m.id)) return false;
    if (m.navSlot === "secondary" && !includeSecondary) return false;
    return true;
  });
}
```

#### Tabla catálogo (orden registry = orden canónico)

Alinear labels/href al **sidebar actual** (`src/components/sidebar.tsx`) + bottom nav.

| id | href | label | icon key | navSlot | bottomNavOrder | rubros | core |
|----|------|-------|----------|---------|----------------|--------|------|
| inicio | `/` | Inicio | layout-dashboard | primary | 1 | core | true |
| manga | `/manga` | Manga | scan-line | primary | 3 | ganaderia | false |
| hacienda | `/hacienda` | Hacienda | beef | primary | 2 | ganaderia | false |
| potreros | `/potreros` | Potreros | map | primary | 4 | ganaderia | false |
| senasa | `/senasa` | SENASA | shield-check | more | — | ganaderia | false |
| produccion_huevos | `/produccion` | Producción | egg | more | — | huevos | false |
| agricola | `/agricola` | Agrícola | sprout | more | — | agricola | false |
| insumos | `/insumos` | Insumos | package | more | — | core | false |
| finanzas | `/finanzas` | Finanzas | bar-chart-2 | more | — | core | false |
| reportes | `/reportes` | Reportes | pie-chart | more | — | core | false |
| tareas | `/tareas` | Tareas | check-square | more | — | core | false |
| whatsapp | `/whatsapp` | WhatsApp Bot | message-circle | secondary | — | core | false |

Notas:

- Bottom hoy: Inicio · Hacienda · **Manga FAB centro** · Campo(potreros) · Más → orders 1,2,3,4 como arriba (Task 7 sort by `bottomNavOrder`).
- Sidebar order hoy: Inicio, Manga, Hacienda, Potreros, SENASA, Producción, … — registry order arriba es OK; `filterModules` usa registry order (plan tests). Si querés mirror exact sidebar order, poné manga antes de hacienda en `MODULE_REGISTRY` **y** ajustá test de shuffle a ese orden. **Preferí orden plan Task 5 (inicio, manga, hacienda…)** = tabla de arriba.
- `agricola` href `/agricola` aún no existe page (Task 8 stub) — igual registralo.
- whatsapp `badge: "PRONTO"`.

#### `defaults.ts` — debe matchear backfill Task 4 SQL

```ts
import type { ModuleId } from "./registry";

/** = sidebar Makeka ganadero actual (sin whatsapp secondary) */
export const MAKEKA_LEGACY_MODULES: ModuleId[] = [
  "inicio",
  "manga",
  "hacienda",
  "potreros",
  "senasa",
  "produccion_huevos",
  "insumos",
  "finanzas",
  "reportes",
  "tareas",
];

/** Lab multi-rubro shell — subset demo (Task 9 seed). Sin secrets. */
export const PLATFORM_DEMO_MODULES: ModuleId[] = [
  "inicio",
  "hacienda",
  "manga",
  "potreros",
  "agricola",
  "insumos",
  "finanzas",
  "reportes",
  "tareas",
];

export function defaultModulesForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): ModuleId[] {
  switch (tipo) {
    case "agricola":
      return [
        "inicio",
        "agricola",
        "insumos",
        "finanzas",
        "reportes",
        "tareas",
      ];
    case "mixto":
      return [
        "inicio",
        "manga",
        "hacienda",
        "potreros",
        "senasa",
        "agricola",
        "produccion_huevos",
        "insumos",
        "finanzas",
        "reportes",
        "tareas",
      ];
    case "ganadero":
    default:
      return [...MAKEKA_LEGACY_MODULES];
  }
}

export function defaultRubrosForTipo(
  tipo: "ganadero" | "agricola" | "mixto"
): string[] {
  switch (tipo) {
    case "agricola":
      return ["agricola"];
    case "mixto":
      return ["ganaderia", "agricola"];
    case "ganadero":
    default:
      return ["ganaderia"];
  }
}
```

**Importante:** arrays = mismos ids que SQL Task 4 backfill. No agregar `whatsapp` a legacy defaults (secondary opt-in).

### Step 3 — verify

```bash
npm test -- src/lib/modules/registry.test.ts
npm test
npm run typecheck
```

Todo verde. No hace falta `build` salvo que typecheck se queje de paths.

### Step 4 — plan checkbox (opcional mismo PR)

Marcar Task 5 steps done en  
`docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md`  
(solo checkboxes Task 5; no reescribir el plan entero).

## Commit + PR

```bash
git add src/lib/modules/
# + plan checkboxes si tocaste
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
feat: module registry y defaults por tipo

Refs EST-8 Task 5
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head feat/est-8-module-registry \
  --title "feat: EST-8 Task 5 module registry" \
  --body "$(cat <<'EOF'
## Summary
Task 5: catálogo `MODULE_REGISTRY` + defaults por tipo + tests. **Sin wire UI.**

### Defaults
- ganadero = MAKEKA_LEGACY (nav actual)
- agricola / mixto = mismos arrays que backfill #19 SQL
- PLATFORM_DEMO_MODULES subset lab

## Test plan
- [x] `npm test -- src/lib/modules/registry.test.ts`
- [x] `npm test` + `npm run typecheck`
- [x] No cambios sidebar/shell
- [ ] Review humano orden bottomNavOrder vs UI actual

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8: PR URL + “Task 5 registry done, no UI wire”. Si MCP no ve EST → bloque en PR body.

## Done when

- [ ] 3 files modules + tests PASS
- [ ] typecheck PASS
- [ ] defaults ≡ Task 4 SQL module lists
- [ ] PR abierto, sin UI wiring
- [ ] EST-8 comentado

## Después (NO este PR)

- **Task 6** `resolveTenant` + types + `PLATFORM_DEMO_EMAIL`
- **Task 7** nav/shell data-driven (ahí se notan los modules)
- Pedir prompt al orquestador.

## Kickoff corto (humano → peer)

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-5-module-registry.md

EST-8 Task 5. main ya tiene #19. Registry + defaults + vitest. No UI. No SQL.
TDD. Author lamakeka2026. 1 PR.
```
