# EST-8 Task 8 — Setup escribe modules_enabled + defaults

**Leé y ejecutá este brief.** Español corto. **Solo** `src/app/setup/page.tsx` (+ plan checkbox). No nav rewrite, no stub agrícola, no SQL Editor.

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 8**
- Ya en main: #19 platform SQL cloud aplicada, #20 registry, #21 resolveTenant, **#22 nav data-driven** (`7dbc89f`)

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `LAMAKEKA/lamakeka` (sin guion) |
| gh | `lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` @ post-#22 (`git pull`) |
| File | `src/app/setup/page.tsx` (~367 líneas hoy) |

## Qué NO hacer

- No Task 9 (`/agricola`, seed demo docs) en este PR.
- No tocar sidebar/bottom-nav/shell/useTenant salvo import roto imposible.
- No SQL migration nueva.
- **Nunca** password de `testprueba` en git/PR/Linear.
- No cambiar gate `proxy.ts` / callback.
- No push a main. 1 branch = 1 PR.
- No remote `LA-MAKEKA` con guion.
- No reintroducir arrays de módulos a mano — usar `defaultModulesForTipo` / `defaultRubrosForTipo`.

## Objetivo

Al **crear** establecimiento en setup:

1. Insertar columnas platform (`nombre_display`, `logo_url`, `tagline`, `rubros`, `modules_enabled`, `is_platform_demo`).
2. `modules_enabled` / `rubros` = defaults por `tipo` (Task 5) — agrícola **sin** manga.
3. `is_platform_demo` = true solo si `user.email` normalizado === `PLATFORM_DEMO_EMAIL`.
4. Si cloud rechaza columnas nuevas (schema viejo): fallback insert legacy mínimo + mensaje claro (no mentir éxito parcial sin avisar).
5. typecheck + tests existentes verdes.

## Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b feat/est-8-setup-modules
```

## Estado actual (main)

`handleSubmit` hoy:

```ts
const { error: dbError } = await supabase.from("establecimientos").insert({
  nombre,
  ubicacion,
  tipo,
  user_id: user.id,
});
```

Solo 4 campos. Nav Task 7 rellena modules vía `mapEstablecimientoRow` defaults si columnas vacías — igual hay que **persistir** en create para tenants nuevos y demo.

## Implementación

### Imports

```ts
import {
  defaultModulesForTipo,
  defaultRubrosForTipo,
} from "@/lib/modules/defaults";
import { PLATFORM_DEMO_EMAIL, isPlatformDemoEmail } from "@/lib/tenant/platformDemo";
import type { EstablecimientoTipo } from "@/lib/tenant/types";
```

`TipoCampo` local ya es `"ganadero" | "agricola" | "mixto"` — compatible con `EstablecimientoTipo`. Preferí castear o unificar tipo local → `EstablecimientoTipo`.

### Payload full

```ts
const tipoSafe = tipo as EstablecimientoTipo; // after null check

const fullPayload = {
  nombre: nombre.trim(),
  ubicacion: ubicacion.trim(),
  tipo: tipoSafe,
  user_id: user.id,
  nombre_display: nombre.trim(),
  logo_url: "/logo-makeka.png",
  tagline:
    tipoSafe === "agricola"
      ? "AI · Campo"
      : tipoSafe === "mixto"
        ? "AI · Mixto"
        : "AI · Ganadera",
  rubros: defaultRubrosForTipo(tipoSafe),
  modules_enabled: defaultModulesForTipo(tipoSafe),
  is_platform_demo: isPlatformDemoEmail(user.email),
};
```

Usá `isPlatformDemoEmail` (trim+lower), **no** `===` crudo suelto — o `user.email === PLATFORM_DEMO_EMAIL` si preferís y documentás case-sensitivity; locked: **`isPlatformDemoEmail(user.email)`**.

### Insert con fallback schema

```ts
let { error: dbError } = await supabase.from("establecimientos").insert(fullPayload);

if (dbError) {
  // Schema sin cols platform u otro error → try legacy mínimo
  const legacy = {
    nombre: fullPayload.nombre,
    ubicacion: fullPayload.ubicacion,
    tipo: fullPayload.tipo,
    user_id: fullPayload.user_id,
  };
  const legacyRes = await supabase.from("establecimientos").insert(legacy);
  if (legacyRes.error) {
    setError("No se pudo guardar el establecimiento. Intentá de nuevo.");
    setLoading(false);
    return;
  }
  // Éxito legacy: avisar que falta schema platform (no bloquear entrada)
  // Opción A: silent + console.warn
  // Opción B: setError soft no — user ya entra
  // Locked: console.warn una vez; user sigue a /
  console.warn(
    "[setup] insert platform cols failed; saved legacy row only",
    dbError.message
  );
  dbError = null;
}

if (dbError) {
  setError("No se pudo guardar el establecimiento. Intentá de nuevo.");
  setLoading(false);
  return;
}

router.push("/");
router.refresh();
```

**No** muestres el mensaje de error de Postgres crudo al user (PII/noise). Warn en console alcanza.

Detectar “columna no existe” es frágil multi-idioma; el fallback **siempre** en cualquier error del full insert está OK **solo si** no es unique violation de `user_id`.

Mejor:

```ts
const isUnique =
  dbError.code === "23505" ||
  /duplicate|unique/i.test(dbError.message ?? "");

if (isUnique) {
  setError("Ya tenés un establecimiento. Redirigiendo…");
  router.push("/");
  router.refresh();
  return;
}

// then legacy fallback for other errors
```

Si full insert falla por unique → no legacy second insert.

### Post-success navigation

Hoy: `router.push("/")` + `refresh`. Mantener. Proxy setup gate: con estab → home.

## Tests

No hay test E2E setup obligatorio. Opcional unit del pure payload builder:

```ts
// src/lib/tenant/setupPayload.ts (optional extract)
export function buildEstablecimientoInsert(...) { ... }
```

**Preferí** extract pequeño testeable si el page queda gordo:

`src/lib/tenant/buildEstablecimientoInsert.ts` + test 3 casos ganadero/agricola/mixto + demo email flag.

Si no extract: solo typecheck + `npm test` suite existente.

```bash
npm test
npm run typecheck
```

Build opcional (page only).

## Plan checkbox

Marcar Task 8 done en el plan (mismo PR).

## Commit + PR

```bash
git add src/app/setup/page.tsx
# + buildEstablecimientoInsert + test si creaste
# + plan checkboxes
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
feat: setup setea modules_enabled por tipo

Refs EST-8 Task 8
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head feat/est-8-setup-modules \
  --title "feat: EST-8 Task 8 setup modules_enabled" \
  --body "$(cat <<'EOF'
## Summary
Task 8: `/setup` inserta `modules_enabled` / `rubros` / brand defaults por `tipo` + `is_platform_demo` vía `PLATFORM_DEMO_EMAIL` (no password).

### Behavior
- ganadero → MAKEKA_LEGACY modules
- agricola → sin manga
- mixto → ganadería + agrícola modules
- full insert fail (non-unique) → legacy 4-col fallback + console.warn
- unique user_id → mensaje / redirect home

## Test plan
- [x] npm test + typecheck
- [ ] Humano: setup user lab tipo agricola → modules sin manga en DB (opcional SQL select)
- [x] No secrets / no Task 9

## Linear EST-8
Task 8 setup PR: <url>
(MCP may fail — paste)

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8 con PR URL. Si MCP no ve EST → body del PR.

## Done when

- [ ] setup insert incluye platform cols + defaults por tipo
- [ ] demo email → `is_platform_demo` true (sin password en repo)
- [ ] fallback legacy + unique handling
- [ ] test/typecheck OK
- [ ] PR abierto
- [ ] EST-8 / PR note

## Después

**Task 9** stub `/agricola` + `supabase/seed/platform_demo.md` (sin password).  
Pedir prompt orquestador; no mezclar.

## Kickoff corto

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-8-setup-modules.md

EST-8 Task 8. main ya tiene #22. Setup insert modules_enabled/rubros/brand por tipo.
No agricola stub. No SQL. No password. Author lamakeka2026. 1 PR.
```
