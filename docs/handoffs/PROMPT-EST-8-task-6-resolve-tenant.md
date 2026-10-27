# EST-8 Task 6 — resolveTenant + TenantConfig (código puro)

**Leé y ejecutá este brief.** Español corto. **Solo** `src/lib/tenant/*` + tests. **No** wire sidebar/shell (Task 7). **No** SQL. **No** password demo.

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 6**
- Depende: **Task 5** registry en main — PR **#20** https://github.com/LAMAKEKA/lamakeka/pull/20  
  Si #20 aún OPEN: `git checkout main && git pull` luego  
  `git merge origin/feat/est-8-module-registry` (FF OK) **o** pedile al humano merge #20 primero.  
  **No** reimplementar registry. Importá desde `@/lib/modules/*`.

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `LAMAKEKA/lamakeka` (sin guion) |
| gh | `lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` post-#19 (+ #20 registry mergeado o mergeado en branch) |
| Cloud | Task 4 cols **aplicadas** — este PR no toca DB |

## Qué NO hacer

- No UI (`sidebar`, `mobile-bottom-nav`, `app-shell`, pages, setup).
- No SQL / migraciones.
- **Nunca** password de `testprueba` ni secrets en git/PR/Linear/docs.
- No hardcode módulos — usar `defaultModulesForTipo` / `defaultRubrosForTipo` / `MAKEKA_LEGACY_MODULES` de Task 5.
- No fetch Supabase real en unit tests (mapping **puro**).
- No push a main. 1 branch = 1 PR.
- No remote `LA-MAKEKA` con guion.
- No inventar segunda constante email en otro file.

## Objetivo

1. `TenantConfig` tipado.
2. `PLATFORM_DEMO_EMAIL = "testprueba@gmail.com"` **un solo export** (`platformDemo.ts`).
3. `mapEstablecimientoRow(row)` → TenantConfig con defaults Makeka-safe.
4. `applyDemoEmailFallback(config, email)` según reglas del plan (abajo).
5. Tests vitest + typecheck verdes.
6. Cero cambio runtime UI.

## Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
# si #20 no mergeó:
#   git merge origin/feat/est-8-module-registry
git checkout -b feat/est-8-resolve-tenant
```

Confirmá que existen:

```bash
test -f src/lib/modules/registry.ts && test -f src/lib/modules/defaults.ts && echo OK_MODULES
```

## Files

| Path | Acción |
|------|--------|
| `src/lib/tenant/platformDemo.ts` | create — solo email constant + helper `isPlatformDemoEmail` |
| `src/lib/tenant/types.ts` | create — `TenantConfig` (+ re-export email OK o import from platformDemo) |
| `src/lib/tenant/resolveTenant.ts` | create — map + fallback |
| `src/lib/tenant/resolveTenant.test.ts` | create |

## Contratos

### `platformDemo.ts`

```ts
/** Lab user only — NO password here, ever. */
export const PLATFORM_DEMO_EMAIL = "testprueba@gmail.com";

export function isPlatformDemoEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PLATFORM_DEMO_EMAIL;
}
```

### `types.ts`

```ts
export type EstablecimientoTipo = "ganadero" | "agricola" | "mixto";

export interface TenantConfig {
  establecimientoId: string;
  nombre: string;
  nombreDisplay: string;
  logoUrl: string;
  tagline: string;
  tipo: EstablecimientoTipo;
  rubros: string[];
  modulesEnabled: string[];
  isPlatformDemo: boolean;
  brandTheme: Record<string, string> | null;
}

// Prefer: export { PLATFORM_DEMO_EMAIL, isPlatformDemoEmail } from "./platformDemo";
// Do NOT duplicate the string literal.
```

### `resolveTenant.ts`

```ts
import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
} from "@/lib/modules/defaults";
import type { TenantConfig, EstablecimientoTipo } from "./types";
import { isPlatformDemoEmail } from "./platformDemo";

export type EstablecimientoRow = {
  id: string;
  nombre: string;
  tipo: string;
  nombre_display?: string | null;
  logo_url?: string | null;
  tagline?: string | null;
  rubros?: string[] | null;
  modules_enabled?: string[] | null;
  is_platform_demo?: boolean | null;
  brand_theme?: Record<string, unknown> | null;
};

export function normalizeTipo(tipo: string): EstablecimientoTipo {
  if (tipo === "agricola" || tipo === "mixto" || tipo === "ganadero") {
    return tipo;
  }
  return "ganadero";
}

export function mapEstablecimientoRow(row: EstablecimientoRow): TenantConfig {
  const tipo = normalizeTipo(row.tipo);
  const modules =
    row.modules_enabled && row.modules_enabled.length > 0
      ? [...row.modules_enabled]
      : [...defaultModulesForTipo(tipo)];
  const rubros =
    row.rubros && row.rubros.length > 0
      ? [...row.rubros]
      : [...defaultRubrosForTipo(tipo)];

  let brandTheme: Record<string, string> | null = null;
  if (row.brand_theme && typeof row.brand_theme === "object") {
    // only string values; drop nested junk
    brandTheme = {};
    for (const [k, v] of Object.entries(row.brand_theme)) {
      if (typeof v === "string") brandTheme[k] = v;
    }
    if (Object.keys(brandTheme).length === 0) brandTheme = null;
  }

  return {
    establecimientoId: row.id,
    nombre: row.nombre,
    nombreDisplay: (row.nombre_display?.trim() || row.nombre).trim(),
    logoUrl: row.logo_url?.trim() || "/logo-makeka.png",
    tagline: row.tagline?.trim() || "AI · Ganadera",
    tipo,
    rubros,
    modulesEnabled: modules,
    isPlatformDemo: !!row.is_platform_demo,
    brandTheme,
  };
}

/**
 * Email allowlist is **not** a substitute for is_platform_demo flag on row.
 * - config null → always null (caller sends user to setup); demo email does not invent a tenant
 * - config present + demo email → does **not** force isPlatformDemo true unless row flag already true
 *   (plan: "force isPlatformDemo visuals only if flag set")
 * Optional: expose `userIsDemoEmail` elsewhere later — keep this fn pure passthrough + null rules.
 */
export function applyDemoEmailFallback(
  config: TenantConfig | null,
  userEmail: string | null | undefined
): TenantConfig | null {
  void userEmail; // reserved; identity check via isPlatformDemoEmail if needed later
  // Spec lock:
  // 1) null stays null (setup path) even for PLATFORM_DEMO_EMAIL
  // 2) existing config unchanged (flag comes from DB)
  return config;
}
```

**Ajustá `applyDemoEmailFallback` si el plan se interpreta distinto**, pero **no** inventes tenant fantasma ni pises `modulesEnabled`. Tests deben clavar el comportamiento elegido y documentarlo en comment de 2 líneas.

Interpretación **canónica para este PR** (simple, testable):

| config | email demo? | result |
|--------|-------------|--------|
| null | any | `null` |
| TenantConfig | any | same object (or shallow copy) — **no** flip `isPlatformDemo` por email solo |

Si querés helper extra:

```ts
export function tenantIsDemoExperience(config: TenantConfig): boolean {
  return config.isPlatformDemo;
}
```

Email solo se usa en Task 9 seed / setup defaults — acá la constante vive lista para import.

## TDD — `resolveTenant.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  mapEstablecimientoRow,
  applyDemoEmailFallback,
  normalizeTipo,
} from "./resolveTenant";
import { PLATFORM_DEMO_EMAIL, isPlatformDemoEmail } from "./platformDemo";
import { defaultModulesForTipo, MAKEKA_LEGACY_MODULES } from "@/lib/modules/defaults";

const base = {
  id: "est-1",
  nombre: "La Makeka",
  tipo: "ganadero",
};

describe("normalizeTipo", () => {
  it("passes known tipos", () => {
    expect(normalizeTipo("mixto")).toBe("mixto");
  });
  it("unknown → ganadero", () => {
    expect(normalizeTipo("otro")).toBe("ganadero");
  });
});

describe("mapEstablecimientoRow", () => {
  it("defaults logo tagline display modules for ganadero empty modules", () => {
    const t = mapEstablecimientoRow(base);
    expect(t.logoUrl).toBe("/logo-makeka.png");
    expect(t.tagline).toBe("AI · Ganadera");
    expect(t.nombreDisplay).toBe("La Makeka");
    expect(t.modulesEnabled).toEqual([...MAKEKA_LEGACY_MODULES]);
    expect(t.rubros).toEqual(["ganaderia"]);
    expect(t.isPlatformDemo).toBe(false);
  });

  it("honors non-empty modules_enabled and display fields", () => {
    const t = mapEstablecimientoRow({
      ...base,
      nombre_display: "Makeka Display",
      logo_url: "/custom.png",
      tagline: "Custom",
      modules_enabled: ["inicio", "agricola"],
      rubros: ["agricola"],
      is_platform_demo: true,
      brand_theme: { primary: "#123", nested: { x: 1 } as unknown as string },
    });
    expect(t.nombreDisplay).toBe("Makeka Display");
    expect(t.logoUrl).toBe("/custom.png");
    expect(t.tagline).toBe("Custom");
    expect(t.modulesEnabled).toEqual(["inicio", "agricola"]);
    expect(t.rubros).toEqual(["agricola"]);
    expect(t.isPlatformDemo).toBe(true);
    expect(t.brandTheme).toEqual({ primary: "#123" });
  });

  it("agricola empty modules → defaultModulesForTipo agricola", () => {
    const t = mapEstablecimientoRow({
      id: "a1",
      nombre: "Campo Agri",
      tipo: "agricola",
      modules_enabled: [],
    });
    expect(t.modulesEnabled).toEqual([...defaultModulesForTipo("agricola")]);
    expect(t.modulesEnabled).not.toContain("manga");
  });
});

describe("platform demo email", () => {
  it("constant is lab email only", () => {
    expect(PLATFORM_DEMO_EMAIL).toBe("testprueba@gmail.com");
    expect(isPlatformDemoEmail("TestPrueba@gmail.com")).toBe(true);
    expect(isPlatformDemoEmail("otro@x.com")).toBe(false);
  });

  it("applyDemoEmailFallback null stays null", () => {
    expect(applyDemoEmailFallback(null, PLATFORM_DEMO_EMAIL)).toBeNull();
    expect(applyDemoEmailFallback(null, "x@y.com")).toBeNull();
  });

  it("does not force isPlatformDemo from email alone", () => {
    const t = mapEstablecimientoRow(base);
    const out = applyDemoEmailFallback(t, PLATFORM_DEMO_EMAIL);
    expect(out?.isPlatformDemo).toBe(false);
    expect(out?.modulesEnabled).toEqual(t.modulesEnabled);
  });
});
```

```bash
npm test -- src/lib/tenant/resolveTenant.test.ts   # FAIL then PASS
npm test
npm run typecheck
```

## Plan checkbox

Marcar Task 6 done en el plan (mismo PR, solo checkboxes Task 6).

## Commit + PR

```bash
git add src/lib/tenant/ docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
feat: resolveTenant y TenantConfig

Refs EST-8 Task 6
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head feat/est-8-resolve-tenant \
  --title "feat: EST-8 Task 6 resolveTenant" \
  --body "$(cat <<'EOF'
## Summary
Task 6: `TenantConfig` + `mapEstablecimientoRow` + `PLATFORM_DEMO_EMAIL` (no password). Sin UI.

Depends: Task 5 module registry (#20).

### Behavior
- Empty `modules_enabled` / `rubros` → defaults por `tipo` (Task 5)
- Logo/tagline/display defaults Makeka
- Demo email constant only; null config stays null; email alone does not flip `isPlatformDemo`

## Test plan
- [x] `npm test -- src/lib/tenant/resolveTenant.test.ts`
- [x] `npm test` + `npm run typecheck`
- [x] No sidebar/shell/SQL
- [x] No secrets

## Linear EST-8
(pegar si MCP falla)
Task 6 resolveTenant PR: <url> — pure map + demo email const; next Task 7 nav.

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8 con PR URL. Si MCP no resuelve EST-8 → dejar bloque en PR body (como #20).

## Done when

- [ ] 4 files tenant + tests PASS
- [ ] typecheck PASS
- [ ] email solo en `platformDemo.ts`
- [ ] defaults delegan a Task 5
- [ ] PR abierto sin UI
- [ ] EST-8 / PR body note

## Después

**Task 7** nav + shell data-driven (ahí se ve el cambio). Pedir prompt orquestador; no mezclar.

## Kickoff corto

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-6-resolve-tenant.md

EST-8 Task 6. Depende #20 registry (mergeá o merge branch). resolveTenant + types + demo email const.
No UI. No SQL. No password. TDD. Author lamakeka2026. 1 PR.
```
