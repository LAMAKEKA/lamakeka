# EST-8 Task 7 — Nav + shell data-driven (cero regresión Makeka)

**Leé y ejecutá este brief.** Español corto. Wire **sidebar / bottom nav / shell branding** desde registry + tenant. Makeka debe verse **igual** que hoy (backfill Task 4 + MAKEKA_LEGACY).

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 7**
- Ya en main: #20 registry (`056cab8`), #21 resolveTenant (`0dd0826`), #19 platform SQL cloud **aplicada**

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `LAMAKEKA/lamakeka` (sin guion) |
| gh | `lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` @ post-#21 (`git pull`) |
| Dev | `npm run dev -- -H 0.0.0.0 -p 3000` |

## Qué NO hacer

- No Task 8 setup payload, no Task 9 stub agrícola page, no seed demo user.
- No SQL / migraciones.
- No password / secrets.
- No reescribir registry/resolveTenant salvo bug blocker de import.
- No unificar stock libreta+EID. No RN.
- No push a main. 1 branch = 1 PR.
- No remote `LA-MAKEKA` con guion.
- No romper logout mobile (`signOut` + `window.location.assign("/login")`).
- No hits <48px en nav. No quitar safe-area / bottom padding.
- No `git reset --hard` sin OK humano.

## Objetivo

1. `useTenant` (client): fetch estab del user → `mapEstablecimientoRow` → `TenantConfig | null`.
2. Fallback si error schema / sin row: brand Makeka + `MAKEKA_LEGACY_MODULES` (**no crash**).
3. Sidebar: items desde `filterModules(modulesEnabled)` + secondary whatsapp (legacy: seguir mostrando secondary aunque no esté en modules — ver reglas).
4. Bottom nav: modules con `bottomNavOrder` sorted; FAB = manga si enabled, else primer primary con order (no “Más”).
5. Shell branding: logo/tagline/nombreDisplay del tenant (sidebar header + mobile top bar logo opcional).
6. Títulos de página: preferí `getModule` por href / registry labels; fallback map actual.
7. Makeka smoke: mismos hrefs que sidebar legacy (Inicio…Tareas + WhatsApp PRONTO).

## Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b feat/est-8-nav-registry
```

## Files (expected)

| Path | Acción |
|------|--------|
| `src/hooks/useTenant.ts` | create |
| `src/lib/modules/iconMap.ts` | create — ModuleIconName → LucideIcon |
| `src/components/sidebar.tsx` | modify — data-driven |
| `src/components/mobile-bottom-nav.tsx` | modify — props o useTenant |
| `src/components/app-shell.tsx` | modify — pass tenant / branding |
| plan checkboxes Task 7 | optional same PR |

## Step 1 — `iconMap.ts`

```ts
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Beef,
  ScanLine,
  Map,
  ShieldCheck,
  Egg,
  Sprout,
  Package,
  BarChart2,
  PieChart,
  CheckSquare,
  MessageCircle,
} from "lucide-react";
import type { ModuleIconName } from "@/lib/modules/registry";

export const MODULE_ICON_MAP: Record<ModuleIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  beef: Beef,
  "scan-line": ScanLine,
  map: Map,
  "shield-check": ShieldCheck,
  egg: Egg,
  sprout: Sprout,
  package: Package,
  "bar-chart-2": BarChart2,
  "pie-chart": PieChart,
  "check-square": CheckSquare,
  "message-circle": MessageCircle,
};

export function iconFor(name: ModuleIconName): LucideIcon {
  return MODULE_ICON_MAP[name] ?? LayoutDashboard;
}
```

Si `Sprout` no existe en la versión lucide del package, usá `Wheat` o `Leaf` y **actualizá** el string en registry **solo si hace falta** (preferí no tocar registry: mapear `sprout` → icono existente).

```bash
node -e "const l=require('lucide-react'); console.log(!!l.Sprout, !!l.Wheat, !!l.Leaf)"
```

## Step 2 — `useTenant.ts`

Client hook. Pitfall Makeka: select **literal de columnas** + cast (no GenericStringError).

```ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  mapEstablecimientoRow,
  type EstablecimientoRow,
} from "@/lib/tenant/resolveTenant";
import type { TenantConfig } from "@/lib/tenant/types";
import { MAKEKA_LEGACY_MODULES } from "@/lib/modules/defaults";

export type TenantState = {
  tenant: TenantConfig | null;
  loading: boolean;
  /** true si usamos fallback legacy (error schema o sin datos útiles) */
  usedFallback: boolean;
};

const SELECT_FULL =
  "id, nombre, tipo, nombre_display, logo_url, tagline, rubros, modules_enabled, is_platform_demo, brand_theme";

const SELECT_MIN = "id, nombre, tipo";

function makekaFallback(partial?: { id?: string; nombre?: string; tipo?: string }): TenantConfig {
  const tipo =
    partial?.tipo === "agricola" || partial?.tipo === "mixto" || partial?.tipo === "ganadero"
      ? partial.tipo
      : "ganadero";
  return {
    establecimientoId: partial?.id ?? "",
    nombre: partial?.nombre ?? "La Makeka",
    nombreDisplay: partial?.nombre ?? "La Makeka",
    logoUrl: "/logo-makeka.png",
    tagline: "AI · Ganadera",
    tipo,
    rubros: tipo === "agricola" ? ["agricola"] : tipo === "mixto" ? ["ganaderia", "agricola"] : ["ganaderia"],
    modulesEnabled: [...MAKEKA_LEGACY_MODULES],
    isPlatformDemo: false,
    brandTheme: null,
  };
}

export function useTenant(): TenantState {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setTenant(null);
          setLoading(false);
        }
        return;
      }

      // Full select first (cloud Task 4 applied)
      const full = await supabase
        .from("establecimientos")
        .select(SELECT_FULL)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!full.error && full.data) {
        setTenant(mapEstablecimientoRow(full.data as EstablecimientoRow));
        setUsedFallback(false);
        setLoading(false);
        return;
      }

      // Schema error or empty → try minimal columns
      const min = await supabase
        .from("establecimientos")
        .select(SELECT_MIN)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!min.error && min.data) {
        // map with only core fields → defaults fill modules
        setTenant(
          mapEstablecimientoRow({
            id: (min.data as { id: string }).id,
            nombre: (min.data as { nombre: string }).nombre,
            tipo: (min.data as { tipo: string }).tipo,
          })
        );
        setUsedFallback(true);
        setLoading(false);
        return;
      }

      // No estab (setup gate should catch) — still provide Makeka brand for shell edge cases
      setTenant(makekaFallback());
      setUsedFallback(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tenant, loading, usedFallback };
}
```

Ajustá tipos cast al estilo del repo. **No** loguees row PII de más.

## Step 3 — Sidebar data-driven

Hoy: hardcode `navItems` + `secondaryItems` + logo fijo “La Makeka” / “AI · Ganadera”.

Cambios:

1. `const { tenant, loading } = useTenant();`
2. Mientras `loading` y aún no tenant: podés renderizar **MAKEKA_LEGACY** filtered (evita flash vacío) o skeleton corto — preferí legacy modules para cero flicker Makeka.
3. Primary+more:

```ts
import { filterModules, getModule } from "@/lib/modules/registry";
import { iconFor } from "@/lib/modules/iconMap";
import { MAKEKA_LEGACY_MODULES } from "@/lib/modules/defaults";

const enabled =
  tenant?.modulesEnabled?.length
    ? tenant.modulesEnabled
    : [...MAKEKA_LEGACY_MODULES];

const mainNav = filterModules(enabled); // primary+more, no secondary
```

4. Secondary whatsapp:
   - Si `enabled` incluye `whatsapp` → `filterModules(enabled, { includeSecondary: true })` y sacar solo secondary  
   - **Legacy Makeka UX:** hoy whatsapp está siempre en secondary con badge PRONTO **aunque** no esté en MAKEKA_LEGACY_MODULES.  
   **Regla Task 7:** seguir mostrando secondary whatsapp **si** `getModule("whatsapp")` y (`enabled.includes("whatsapp")` **OR** `!tenant?.isPlatformDemo`).  
   Es decir: demo platform puede ocultarlo si no está en array; Makeka real lo sigue viendo como hoy.  
   Alternativa más simple y cero regresión: **siempre** append secondary whatsapp como hoy (badge PRONTO). Preferí **siempre** para no pelear demo en este PR — Task 9 puede afinar.  
   **Decisión locked:** **siempre mostrar secondary whatsapp** (comportamiento actual). modules_enabled no lo saca en Task 7.

5. Map items:

```tsx
{mainNav.map((m) => {
  const Icon = iconFor(m.icon);
  const active = m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
  return (
    <Link key={m.id} href={m.href} ...>
      <Icon ... />
      {m.label}
      {m.badge ? <span>{m.badge}</span> : null}
    </Link>
  );
})}
```

6. Header branding:

```tsx
const title = tenant?.nombreDisplay || "La Makeka";
const tagline = tenant?.tagline || "AI · Ganadera";
const logo = tenant?.logoUrl || "/logo-makeka.png";
```

`Image src={logo}` — si logo externo futuro, next config remotePatterns; hoy paths locales OK.

7. Logout / profile block: **no tocar lógica**, solo layout.

## Step 4 — Mobile bottom nav

Hoy: 4 items fijos + Más; Manga FAB; label potreros = **“Campo”** (no “Potreros”).

Reglas:

1. Tomar modules enabled con `bottomNavOrder != null`, sort asc.
2. Cap visual: grid-cols-5 = hasta **4** slots nav + Más. Si hay >4 con order, tomar los 4 de menor order.
3. FAB: el item con `id === "manga"` si está en la lista bottom; si no, **ningún** FAB especial (todos estilo normal) **o** FAB en el de `bottomNavOrder === 3` si existe. Locked: **FAB solo si manga está entre los bottom items**.
4. Label override: `potreros` → mostrar **“Campo”** en bottom (registry label puede quedar “Potreros” en sidebar). Const local:

```ts
function bottomLabel(m: AppModule): string {
  if (m.id === "potreros") return "Campo";
  return m.label;
}
```

5. Props: preferí `useTenant` dentro del bottom nav (igual que sidebar) **o** pasar `modulesEnabled` desde AppShell — evita double-fetch si pasás tenant desde shell. **Preferí AppShell llama `useTenant` una vez y pasa `tenant` a Sidebar + MobileBottomNav.**

Refactor ligero:

```tsx
// app-shell
const tenantState = useTenant();
...
<Sidebar tenantState={tenantState} onClose={...} />
...
<MobileBottomNav tenantState={tenantState} onMore={...} />
```

Si no querés cambiar firmas mucho: cada uno llama `useTenant` (doble fetch) — aceptable MVP; preferí single fetch en shell.

6. Match active: `href === "/"` exact; else `pathname.startsWith(href)`.

## Step 5 — App shell branding / titles

1. Mobile header logo: `tenant?.logoUrl || "/logo-makeka.png"`.
2. `titleFor(path)`:  
   - buscá en registry `MODULE_REGISTRY` el módulo cuyo href match más largo  
   - else PAGE_TITLE legacy  
   - else `tenant?.nombreDisplay || "La Makeka"`
3. No shell en `/login|/register|/setup` — igual.

## Step 6 — Verify

```bash
npm test
npm run typecheck
npm run build   # preferido: layout/routing
```

Manual (si hay user Makeka):

- Login → bottom: Inicio, Hacienda, Manga(FAB), Campo, Más
- Sidebar: mismos links que antes + WhatsApp PRONTO + logout
- Sin crash si modules_enabled vacíos (defaults)

Sin user: documentá “UI wire done; smoke Makeka BLOCKED sin creds” — no inventar OK campo.

## Step 7 — Plan checkboxes

Marcar Task 7 steps en el plan.

## Commit + PR

```bash
git add src/hooks/useTenant.ts src/lib/modules/iconMap.ts \
  src/components/sidebar.tsx src/components/mobile-bottom-nav.tsx \
  src/components/app-shell.tsx \
  docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
feat: sidebar y bottom nav desde module registry

Refs EST-8 Task 7
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head feat/est-8-nav-registry \
  --title "feat: EST-8 Task 7 nav data-driven" \
  --body "$(cat <<'EOF'
## Summary
Task 7: sidebar + bottom nav + shell branding desde `MODULE_REGISTRY` + `useTenant` / `mapEstablecimientoRow`.

### Makeka regression
- Defaults = MAKEKA_LEGACY + backfill cloud #19
- Bottom: Inicio · Hacienda · Manga FAB · Campo · Más
- Secondary WhatsApp PRONTO se mantiene
- Logout mobile intacto

### Fallback
- Select full → min → Makeka fallback (no crash si schema raro)

## Test plan
- [x] npm test + typecheck (+ build si corre)
- [ ] Humano: login Makeka → nav idéntica
- [x] No SQL / no secrets
- [x] No setup/agricola stub (Task 8–9)

## Linear EST-8
Task 7 nav PR: <url>
(MCP may not resolve EST-8 — paste this)

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8 con PR URL. Si MCP falla → bloque en PR body.

## Done when

- [ ] useTenant + iconMap
- [ ] sidebar/bottom/shell sin arrays href hardcode de negocio (overrides label Campo OK)
- [ ] test + typecheck (+ build)
- [ ] Makeka path no pierde ítems legacy
- [ ] PR + nota EST-8

## Después

**Task 8** setup escribe `modules_enabled`.  
**Task 9** stub `/agricola` + seed docs demo.  
No mezclar en este PR.

## Kickoff corto

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-7-nav-data-driven.md

EST-8 Task 7. main ya tiene #20+#21. Nav/shell desde registry+tenant.
Cero regresión Makeka. No setup/agricola/SQL. Author lamakeka2026. 1 PR.
```
