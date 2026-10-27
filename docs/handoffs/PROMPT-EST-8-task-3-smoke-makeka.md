# EST-8 Task 3 — Smoke Makeka flujos críticos (checklist)

**Leé y ejecutá este brief.** Español corto. Default = **docs + evidencia**, no feature nueva.

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 3**
- PRD: smoke §4.3 + gaps residuales G4+
- Ya en main: #15 docs, #16 cloud 20260923 **aplicada**, #17 setup gate + callback (G2–G3)

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `LAMAKEKA/lamakeka` (sin guion) |
| gh | `lamakeka2026` |
| Author commits | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` @ post-#17 (`git pull`) |
| Prod ref | https://lamakeka.vercel.app (solo si main deployó; **preferí localhost**) |
| SB | cloud `szffikjajxqxawxavshw` — migración estado/eventos **OK** |

## Objetivo

1. Correr **smoke manual** de flujos día a día Makeka en localhost (y LAN celu si podés).
2. Llenar tabla OK / FAIL / SKIP con notas.
3. Triage: **P0 blocker** → PR `fix/est-8-…` **aparte** (1 bug = 1 branch = 1 PR). **P2+** → listar, no bloquear Fase B.
4. Publicar resultados en **PR docs** (preferido) y/o comentario EST-8.
5. **No** inventar password en git. Credenciales = las del dueño / las que el humano pase por canal seguro (chat), nunca commit.

## Qué NO es Task 3

- Module registry / `modules_enabled` (Task 4+)
- User `testprueba@gmail.com` demo (Task 9)
- Forgot password wire (G4 / A2) salvo que sea P0 del smoke
- Unificar stock libreta+EID
- RN rewrite, fees, mega-refactor
- “Todos los lint del monorepo” mass-fix

## Branch (docs)

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b docs/est-8-smoke-makeka
```

Si encontrás P0: **otra** branch desde main, no mezclar fix + docs smoke en el mismo PR salvo que el humano pida lo contrario.

## Setup dev

```bash
# .env.local debe existir (3 keys SB) — no lo printees
git remote get-url origin   # LAMAKEKA/lamakeka.git
# puerto 3000 libre
npm run dev -- -H 0.0.0.0 -p 3000
```

Checks base:

```bash
curl -sI http://localhost:3000/ | head -5          # → /login sin cookie
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login  # 200
```

Celu LAN: `http://<LAN-IP>:3000` (a menudo `192.168.1.7`). Si log dice `Blocked cross-origin` → `allowedDevOrigins` en `next.config.ts` + restart.

**Hydration en login** con `keeper-lock` / password manager = **extensión**, no bug app. Probar ventana privada si duda.

Login post-#17: password OK → home o setup según estab. Callback OTP → setup solo si no hay estab.

## Credenciales

- Pedile al humano user Makeka real si no las tenés.
- **Nunca** las escribas en el PR, docs, Linear, commits, screenshots con pass visible.
- En la tabla: `user: dueño Makeka` / `session OK` alcanza.

## Checklist smoke (llenar)

Crear:

`docs/superpowers/ops/2026-10-12-smoke-makeka-est-8-task-3.md`

Plantilla:

```markdown
# Smoke Makeka — EST-8 Task 3

**Fecha:** YYYY-MM-DD  
**Ambiente:** localhost:3000 (LAN: sí/no · IP …)  
**Commit main:** `<sha corto>`  
**Build/dev:** OK / notas  
**cloud 20260923:** aplicada (Task 1)  
**Gate setup #17:** presente  

## Auth / shell

| # | Flujo | Result | Nota |
|---|-------|--------|------|
| A1 | Sin cookie `/` → login | | |
| A2 | Login password → home o setup | | sin password en doc |
| A3 | Sin estab (si hay user lab) no entra `/manga` → setup | | post-#17 |
| A4 | Con estab `/setup` → home | | |
| A5 | Bottom nav: Inicio·Hacienda·Manga·Campo·Más | | mobile width o DevTools |
| A6 | Logout mobile (drawer Más/sidebar) → login | | #14 |

## Campo

| # | Flujo | Result | Nota |
|---|-------|--------|------|
| C1 | Home métricas cargan (no crash) | | |
| C2 | `/manga` UI + input HID/scan path visible | | no hace falta bastón físico |
| C3 | Alta animal: categoría obligatoria + potrero opcional | | |
| C4 | Hacienda tab **Por animal** lista EID | | |
| C5 | Ficha drawer abre; timeline si hay eventos | | |
| C6 | Egreso saca de stock (estado no activo) | | |
| C7 | Hacienda tab **Por cantidad** intacta | | no unificar stocks |
| C8 | `/potreros` cabezas/count EID | | |
| C9 | `/senasa` default stock; toggle bajas | | |
| C10 | Export SENASA/CSV no rompe | | |
| C11 | Offline queue UI/path no crash | | skip OK si no hay cola |

## Regresión hard

| # | Flujo | Result | Nota |
|---|-------|--------|------|
| R1 | `/api/rfid/scans` no 500 en GET/OPTIONS sano | | no gate setup |
| R2 | No doble-conteo forzado libreta+EID | | tabs duales |
| R3 | Typecheck/test verdes en main | | `npm test && npm run typecheck` |

**Result values:** `OK` | `FAIL` | `SKIP` | `BLOCKED`

## Bugs encontrados

| ID | Sev | Síntoma | Repro | Acción |
|----|-----|---------|-------|--------|
| B1 | P0/P1/P2 | … | … | fix PR / defer EST-8 |

## Conclusión ship Makeka (outcome EST-8 §1)

- [ ] Sin gaps **críticos** abiertos **o** cada P0 tiene PR/fix en vuelo
- [ ] Lista P2+ no bloquea Fase B
- Recomendación: `seguir Fase B (Task 4+)` | `parar: fix P0 …`
```

También actualizar checkboxes Task 3 en el plan (mismo PR docs).

## Cómo smokear (mapa UI)

| Área | Path |
|------|------|
| Login | `/login` — `window.location.assign("/")` post-session |
| Setup | `/setup` |
| Home | `/` server; redirect setup si no estab |
| Manga | `/manga` — HID `useHidCapture`, forms alta |
| Hacienda | `/hacienda` — `vistaHacienda` por-animal \| por-cantidad |
| Ficha | `AnimalFichaDrawer` |
| Potreros | `/potreros` |
| SENASA | `/senasa` |
| Shell | `app-shell`, `mobile-bottom-nav`, `sidebar` |
| Proxy gate | `src/proxy.ts` + `hasEstablecimiento` |

**Bastón físico (G14):** si no hay hardware → `SKIP` C2 detalle HID wedge real; igual verificar UI de captura/input.

**Datos:** preferí no borrar producción. Si egreso de prueba, usá animal de test o revertí estado. Documentá qué tocaste.

## Si aparece FAIL P0

1. No sigas inflando el docs PR con fixes grandes.
2. `git stash`/terminá docs smoke con el FAIL anotado.
3. Branch `fix/est-8-<slug>` desde **main**, fix mínimo, verify, PR aparte.
4. Ejemplos P0: no se puede login; manga no carga; hacienda por-animal 500 por schema; setup gate loop infinito; logout roto.

P1: usable con workaround. P2: molesto, defer.

## Verify automático (siempre)

```bash
npm test
npm run typecheck
```

Build opcional si no hay code change (docs-only PR).

## Commit + PR docs

```bash
git add docs/superpowers/ops/2026-10-12-smoke-makeka-est-8-task-3.md \
        docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
docs: EST-8 Task 3 smoke Makeka flujos críticos

Refs EST-8
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head docs/est-8-smoke-makeka \
  --title "docs: EST-8 Task 3 smoke Makeka" \
  --body "$(cat <<'EOF'
## Summary
Task 3 smoke post #17 gate + cloud 20260923 aplicada.

### Resultado
- Críticos abiertos: sí/no
- Recomendación: Fase B / fix P0

### Tabla
(ver `docs/superpowers/ops/2026-10-12-smoke-makeka-est-8-task-3.md`)

## Test plan
- [x] Smoke manual localhost
- [x] Sin secrets en docs
- [ ] Humano revisa FAILs

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8 con link PR + 3–5 líneas: cuántos OK/FAIL, P0 abiertos, go/no-go Fase B.  
Si MCP no ve EST, bloque copy-paste en PR body.

## Si el peer NO tiene credenciales ni browser humano

1. Hacer lo automatizable: curl auth redirects, `npm test`/`typecheck`, review estático de rutas post-#17.
2. Marcar filas campo como `BLOCKED — falta user Makeka / browser humano`.
3. Igual abrir PR docs con plantilla + sección “pendiente humano”.
4. **No** inventar resultados OK de manga/hacienda sin evidencia.

Preferible: el humano se loguea en la sesión / pasa “ya miré X” y el peer consolida.

## Done when

- [ ] Archivo ops smoke mergeable en PR
- [ ] Tabla con resultados honestos
- [ ] P0 triageados (PR fix o explícitos)
- [ ] Recomendación Fase B go/no-go
- [ ] EST-8 actualizado (comment o texto listo)
- [ ] Cero passwords en git

## Después de Task 3

Si go → **Task 4** migración `establecimiento` platform config (`modules_enabled`, brand, demo flags).  
Pedir prompt Task 4 al orquestador; no mezclar en este PR.

## Kickoff corto

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-3-smoke-makeka.md

EST-8 Task 3. main ya tiene #17. Smoke localhost Makeka (docs PR).
No plataforma. P0 = fix PR aparte. Sin secrets. Tabla en docs/superpowers/ops/.
Go/no-go Fase B al final.
```
