# Smoke Makeka — EST-8 Task 3

**Fecha:** 2026-10-12  
**Ambiente:** localhost:3000 (LAN IP host: `192.168.1.7` · smoke celu: no en esta corrida)  
**Commit main:** `264e6e2` (#17 gate setup + callback)  
**Build/dev:** OK — Next 16.2.6 Ready ~851ms; `npm test` 33/33; `npm run typecheck` OK  
**cloud 20260923:** aplicada (Task 1 / #16)  
**Gate setup #17:** presente en `src/proxy.ts` + `src/app/auth/callback/route.ts` + `src/lib/estab/hasEstablecimiento.ts`  
**Credenciales campo:** no disponibles en sesión agente → filas login-gated = **BLOCKED** (no inventadas OK)

## Método

1. Automático: vitest + tsc + curl redirects sin cookie + review estático rutas post-#17.  
2. Browser: `/login` UI carga (heading + form Ingresar).  
3. **No** se logueó user Makeka real (sin password en sesión). Campo manual pendiente humano.

## Auth / shell

| # | Flujo | Result | Nota |
|---|-------|--------|------|
| A1 | Sin cookie `/` → login | **OK** | `curl -sI /` → 307 `location: /login` |
| A2 | Login password → home o setup | **BLOCKED** | Falta user Makeka en sesión agente |
| A3 | Sin estab no entra `/manga` → setup | **OK** (code) | `proxy.ts` L72–81: user + !hasEstab + path≠setup → `/setup`; API exento setup |
| A4 | Con estab `/setup` → home | **OK** (code) | `pathname === "/setup" && hasEstab` → `/` |
| A5 | Bottom nav Inicio·Hacienda·Manga·Campo·Más | **OK** (code) | `mobile-bottom-nav.tsx` 5 slots; Manga FAB centro |
| A6 | Logout mobile → login | **OK** (code) | `sidebar` `signOut` + `window.location.assign("/login")` (#14) |
| A7 | Login page UI | **OK** | Browser: “La Makeka AI / Iniciar sesión / Ingresar” 200 |
| A8 | Callback OTP con estab no re-setup | **OK** (code) | `resolvePostAuthDest` → `has ? next : "/setup"`; `safeNextPath` |

## Campo

| # | Flujo | Result | Nota |
|---|-------|--------|------|
| C1 | Home métricas cargan | **BLOCKED** | Requiere sesión |
| C2 | `/manga` UI + HID path | **OK** (code) / **BLOCKED** (UI live) | `useHidCapture` wired; bastón físico **SKIP** (no hardware) |
| C3 | Alta animal cat obligatoria + potrero opcional | **OK** (code) | `CrearAnimalForm` bloquea sin categoría; `resolveEstadoAlta` sin potrero → `sin_ubicar` |
| C4 | Hacienda **Por animal** lista EID | **OK** (code) / **BLOCKED** (UI) | default `vistaHacienda=por-animal` + `HaciendaPorAnimal` |
| C5 | Ficha drawer + timeline | **OK** (code) / **BLOCKED** (UI) | `AnimalFichaDrawer` presente |
| C6 | Egreso saca de stock | **OK** (code) / **BLOCKED** (UI) | drawer egreso + `ESTADOS_STOCK` |
| C7 | Hacienda **Por cantidad** intacta | **OK** (code) | tab dual; no unificación counts |
| C8 | `/potreros` cabezas EID | **OK** (code) / **BLOCKED** (UI) | `.in("estado", ESTADOS_STOCK)` |
| C9 | `/senasa` default stock; toggle bajas | **OK** (code) / **BLOCKED** (UI) | `incluirBajas` + filter stock |
| C10 | Export SENASA/CSV no rompe | **OK** (code) / **BLOCKED** (UI) | `ExportCSV` en manga; SENASA export path en page |
| C11 | Offline queue no crash | **OK** (code) / **SKIP** (cola vacía) | `useOfflineQueue` + pending UI en manga |

## Regresión hard

| # | Flujo | Result | Nota |
|---|-------|--------|------|
| R1 | `/api/rfid/scans` no 500 | **OK** | Sin cookie: **307→/login** (no 500). Route solo **POST** (auth 401 interno si llega). OPTIONS igual 307 sin sesión. `ping-db` público 200 JSON |
| R2 | No doble-conteo libreta+EID | **OK** (code) | tabs duales hacienda |
| R3 | typecheck/test main | **OK** | vitest 33; tsc exit 0 |
| R4 | API sin setup-gate loop | **OK** (code) | `user && !isApiPath` para check estab — RFID no redirige a setup |

## Bugs encontrados

| ID | Sev | Síntoma | Repro | Acción |
|----|-----|---------|-------|--------|
| — | — | Ningún P0 evidenciado en auto/code | — | — |
| N1 | P2/info | GET/OPTIONS `/api/rfid/scans` sin sesión → 307 login (no JSON 401) | curl sin cookie | Aceptable hoy; si client RFID necesita CORS preflight sin cookie, revisar matcher — **no bloquea Fase B** |
| N2 | process | Campo live (C1–C11 UI) sin user Makeka | — | Humano: login localhost + completar filas BLOCKED |

## Conclusión ship Makeka (outcome EST-8 §1)

- [x] Sin gaps **críticos** abiertos con evidencia en esta corrida (P0 = 0)  
- [ ] Campo live **pendiente** user dueño (BLOCKED ≠ FAIL)  
- [x] Lista P2+ no bloquea Fase B  
- **Recomendación:** `seguir Fase B (Task 4+)` en paralelo a smoke humano de campo  
- Si humano encuentra P0 al loguear → PR `fix/est-8-…` aparte

## Cómo completar filas BLOCKED (humano, 10–15 min)

```bash
cd "/home/marti/Documentos/La Makeka"
# dev ya puede estar en :3000
# PC: http://localhost:3000/login
# Celu: http://192.168.1.7:3000/login  (allowedDevOrigins)
```

Login user Makeka real → recorrer C1–C11 → editar esta tabla (OK/FAIL) en follow-up PR o comment EST-8. **No** pegar password en git/Linear.
