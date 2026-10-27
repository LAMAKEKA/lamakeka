# EST-8 Task 2 — Auth/setup gate global + callback sin re-setup (G2–G3)

**Leé y ejecutá este brief.** Español corto. Un PR chico. No plataforma multi-rubro acá.

## Ticket

- Linear: **EST-8** https://linear.app/estudio-nomade/issue/EST-8/makeka-terminar-app-generica-multi-rubro-ganaderiaagricola
- Plan: `docs/superpowers/plans/2026-10-12-est-8-makeka-ship-y-plataforma.md` → **Task 2**
- PRD gaps: **G2** (setup solo en `/`) · **G3** (OTP callback siempre `/setup`)
- Ya en main: Fase 0 PR #15, Task 1 PR #16 (`cloud 20260923: aplicada`)

## Repo

| | |
|---|---|
| Local | `/home/marti/Documentos/La Makeka` |
| Remote | `https://github.com/LAMAKEKA/lamakeka.git` (**sin** guion) |
| gh | `lamakeka2026` → `gh auth switch --user lamakeka2026` |
| Author | `lamakeka2026 <lamakeka2026@gmail.com>` |
| Base | `main` al día (`git pull`) |
| Stack | Next **16.2.x** — file convention es **`src/proxy.ts`** (no `middleware.ts` clásico). Docs: `node_modules/next/dist/docs/` |

## Síntoma (user words / PRD)

1. **G2:** Solo el home (`/`) manda a `/setup` si no hay establecimiento. User logueado sin estab puede ir a `/manga`, `/hacienda`, etc. y ve UI vacía/rota.
2. **G3:** `auth/callback` en flujo OTP (`token_hash`+`type`) **siempre** redirige a `/setup`. User que **ya** tiene estab choca con `UNIQUE (user_id)` al re-insertar o queda atrapado en setup.

## Acceptance

- [ ] User autenticado **sin** fila en `establecimientos` → cualquier ruta de app (excepto allowlist) → **redirect `/setup`**.
- [ ] User autenticado **con** estab → OTP/callback **no** lo manda a setup; va a `/` (o `next` seguro).
- [ ] User con estab que abre `/setup` → redirect `/` (evita re-submit UNIQUE). Preferido en este PR.
- [ ] **No** romper: login password (`location.assign("/")`), register, RFID `POST/GET /api/rfid/scans`, assets, LAN `allowedDevOrigins`.
- [ ] `/auth/callback` debe poder correr **sin** sesión previa (verifyOtp / exchangeCode) — hoy **no** está en `publicPaths` del proxy → latent bug; **incluir** en allowlist auth-public.
- [ ] `npm run typecheck` OK. Smoke curl + browser mental.
- [ ] 1 branch = 1 PR a main. Conventional commit.

## Arquitectura actual (LEER ANTES de patch)

### `src/proxy.ts` (gate auth only hoy)

```ts
const publicPaths = ["/login", "/register", "/api/ping-db"];
// !user && !public → /login
// user && public → /
// return next
```

Matcher ya excluye `_next/static`, images, favicon, extensiones svg/png/…

**Next 16:** export `proxy` + `config.matcher` en este archivo. No crear `middleware.ts` paralelo.

### `src/app/auth/callback/route.ts`

- OTP `token_hash`+`type` → `verifyOtp` → **siempre** `${origin}/setup` ← **G3 bug**
- `code` → `exchangeCodeForSession` → `${origin}${next}` (`next` default `/`)
- error → `/login?error=auth_callback_error`

### `src/app/page.tsx` (home server)

Ya hace:

```ts
if (!user) redirect("/login");
const { data: estab } = await supabase.from("establecimientos").select("id, nombre").limit(1).single();
if (!estab) redirect("/setup");
```

Otras rutas **client** no tienen este gate → G2.

### `src/app/setup/page.tsx`

Client form → `insert` establecimientos `{ nombre, ubicacion, tipo, user_id }`.  
Schema: **UNIQUE `user_id`** en `establecimientos` (1 estab/user). Re-setup = error.

### Session clients

- Browser: `src/lib/supabase/client.ts`
- RSC: `src/lib/supabase/server.ts`
- Proxy: `createServerClient` inline (mismo patrón cookies getAll/setAll) — **mantener** el patrón de setAll que refresca `supabaseResponse` (no romper session refresh).

## Qué hacer

### Branch

```bash
cd "/home/marti/Documentos/La Makeka"
gh auth switch --user lamakeka2026
git checkout main && git pull origin main
git checkout -b fix/est-8-setup-gate-callback
```

### Step 1 — Helper liviano (recomendado)

Crear `src/lib/estab/hasEstablecimiento.ts` (o `src/lib/estab/getEstablecimientoId.ts`):

```ts
// firma orientativa — adaptar imports
export async function hasEstablecimientoForUser(
  supabase: { from: ... }, // SupabaseClient tipado flojo OK si el repo no tiene Database types
  userId: string
): Promise<boolean>
```

Query mínima:

```ts
const { data, error } = await supabase
  .from("establecimientos")
  .select("id")
  .eq("user_id", userId)
  .limit(1)
  .maybeSingle(); // preferí maybeSingle sobre single() para no tirar error PGRST116
return !!data?.id;
```

- Usar **`user_id = auth user`** (no confiar solo en RLS + limit 1 sin filtro si hay dudas).
- Sin cache fancy en este PR.
- Opcional test unitario **solo** si mockeás fácil; no es blocker (repo casi sin tests de UI).

### Step 2 — `src/proxy.ts` setup gate

Tras confirmar `user`:

1. Ampliar allowlists:

**Auth-public** (sin login requerido) — al menos:

- `/login`
- `/register`
- `/auth/callback`  ← **crítico**
- `/api/ping-db`

Considerar prefijos:

- `pathname.startsWith("/auth/")` si solo existe callback
- APIs que deben vivir sin estab: al menos **no** forzar setup en:
  - `/api/rfid/scans` (bastón; user suele estar logueado **con** estab, pero no romper si el check falla por red)
  - Cualquier `/api/*` de health

Recomendación KISS:

```text
isAuthPublic =
  /login|register|auth/callback|api/ping-db
  OR pathname.startsWith("/auth/")

isApiPath = pathname.startsWith("/api/")

// setup gate solo para document navigations de app UI
needsEstabGate =
  user
  && !isAuthPublic
  && pathname !== "/setup"
  && !isApiPath   // evita latencia/extra query en cada scan API
```

2. Si `needsEstabGate` y `!(await hasEstablecimiento(...))` → `NextResponse.redirect` `/setup` **copiando cookies** del `supabaseResponse` (usar el response de redirect y re-aplicar cookies set por setAll, o redirect desde el mismo response pattern que ya usan para login).

Patrón seguro típico:

```ts
const url = request.nextUrl.clone();
url.pathname = "/setup";
const redirectResponse = NextResponse.redirect(url);
// copiar cookies de supabaseResponse a redirectResponse si hubo refresh
supabaseResponse.cookies.getAll().forEach((c) => {
  redirectResponse.cookies.set(c.name, c.value);
});
return redirectResponse;
```

(Ajustá a la API real de cookies del Response en runtime; lo importante es **no perder** session cookies en el redirect.)

3. Si `user && pathname === "/setup" && hasEstab` → redirect `/`.

4. Mantener:

- `!user && !isAuthPublic` → `/login`
- `user && isAuthPublic && pathname` in login/register → `/` (no redirigir `/auth/callback` al home antes de procesar — **callback no debe tratarse como “public logged-in bounce”**).

**Cuidado fino:** hoy `user && isPublicPath → /` aplica a login/register. Si metés `/auth/callback` en la misma lista, un user **ya** logueado que cae en callback con `code` podría bounce a `/` **antes** de exchange. Mejor **separar**:

```text
authEntryPaths = login, register          // bounce to / if session
callbackPaths  = /auth/callback (+ /auth/*)
apiExempt      = /api/*
```

Lógica:

```
if (!user && !authEntry && !callback && !maybe public api health) → login
if (user && authEntry) → /
if (callback) → next()  // deja que route.ts maneje
if (user && path==/setup && hasEstab) → /
if (user && needsEstabGate && !hasEstab) → /setup
return supabaseResponse
```

### Step 3 — `src/app/auth/callback/route.ts` (G3)

Tras `verifyOtp` OK (y tras `exchangeCodeForSession` OK si querés unificar):

```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) → login error

const has = await hasEstablecimientoForUser(supabase, user.id);
const dest = has ? (safeNext || "/") : "/setup";
return NextResponse.redirect(`${origin}${dest}`);
```

**safeNext:** si usás `next` query param, permitir solo paths relativos que empiecen con `/` y **no** `//` (open redirect). Default `/`.

Para OTP hoy ignora `next` y fuerza setup — pasar a la misma resolución `has ? next| / : /setup`.

No hace falta tocar UI de setup salvo copy de error UNIQUE (opcional P2).

### Step 4 — `src/app/page.tsx`

Solo si queda redundante o inconsistente. Podés **dejar** el check del home (defense in depth) o extraer el mismo helper. No reescribir el dashboard.

### Step 5 — Verify

```bash
npm run typecheck
npm test
# si tocás proxy/routing:
npm run build   # recomendado en este PR

npm run dev -- -H 0.0.0.0 -p 3000
curl -sI http://localhost:3000/ | head -5          # 307 → /login sin cookie
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login  # 200
curl -sI http://localhost:3000/manga | head -5     # sin cookie → login
```

Browser / lógica:

| Caso | Esperado |
|------|----------|
| Sin sesión → `/hacienda` | `/login` |
| Sesión sin estab → `/manga` | `/setup` |
| Sesión sin estab → `/setup` | 200 form |
| Sesión con estab → `/setup` | `/` |
| OTP callback user con estab | `/` no setup |
| OTP callback user nuevo | `/setup` |
| Login password Makeka | home como hoy (`location.assign`) |
| `/api/rfid/scans` | no roto (no gate setup obligatorio en API) |

No inventar password en el PR. Si no hay user de prueba, documentar casos verificados por curl + code review.

### Step 6 — Commit + PR

```bash
git add src/proxy.ts src/app/auth/callback/route.ts src/lib/estab/
# + page.tsx solo si cambió
git status   # sin .env, .next, tsbuildinfo
git commit --author="lamakeka2026 <lamakeka2026@gmail.com>" -m "$(cat <<'EOF'
fix: gate setup global y callback sin re-setup

G2: proxy redirige a /setup si auth sin establecimiento.
G3: auth/callback resuelve destino según estab existente.
/auth/callback queda reachable sin sesión previa.

Refs EST-8
EOF
)"
git push -u origin HEAD
gh pr create --repo LAMAKEKA/lamakeka --base main --head fix/est-8-setup-gate-callback \
  --title "fix: setup gate global + auth callback sin re-setup" \
  --body "$(cat <<'EOF'
## Summary
EST-8 Task 2 / G2–G3:
- Proxy: user sin establecimiento → `/setup` en rutas app (no API RFID)
- `/auth/callback` allowlist sin sesión + destino post-OTP según estab
- User con estab en `/setup` → `/`

## Test plan
- [x] typecheck / test (/ build si corriste)
- [ ] curl sin cookie → login
- [ ] mental/browser: sin estab no entra a /manga
- [ ] callback con estab → home
- [ ] RFID API no gated a setup

Refs EST-8
EOF
)"
```

## Linear

Comentar EST-8 con URL del PR (si MCP no ve EST, texto en PR body para copiar).

## Fuera de scope (NO hacer)

- Forgot password (G4 / Task A2)
- `profiles.full_name` metadata (G5)
- Module registry / `modules_enabled` (Task 4+)
- User `testprueba@gmail.com` seed (Task 9)
- RLS rewrite libreta (G9)
- RN, fees, stock unificado
- Mega-refactor de todas las pages client a RSC

## Pitfalls

1. Meter `/auth/callback` en el mismo bucket que login y bounce logged-in → rompe OAuth/OTP.
2. Perder cookies en `NextResponse.redirect` → sesión muere post-login.
3. `.single()` sin fila → error; usar `.maybeSingle()`.
4. Gate setup en **cada** `/api/rfid/scans` + query extra = latencia bastón; **exempt API**.
5. Open redirect con `next=https://evil`.
6. Remote con guion / gh user equivocado.
7. Hydration login = extensión password manager, no “fix” del form.
8. UNIQUE user_id: sin redirect setup→home, el form “falla raro”.

## Done when

- PR abierto, CI green (lint/typecheck/test)
- Acceptance checklist cumplida
- Makeka user con estab: path actual intacto
- User nuevo: obligado a setup antes de manga/hacienda

## Kickoff corto (humano → peer)

```
Leé y ejecutá SOLO:
/home/marti/Documentos/La Makeka/docs/handoffs/PROMPT-EST-8-task-2-setup-gate-callback.md

EST-8 Task 2 G2–G3. Branch fix/est-8-setup-gate-callback.
proxy.ts + auth/callback (+ helper estab). No plataforma.
Cuidado: /auth/callback public sin bounce; APIs RFID sin gate setup.
1 PR a main, author lamakeka2026.
```
