# PRD — Plataforma multi-rubro + ship Makeka (EST-8)

**Producto:** La Makeka / Mateca  
**Fecha:** 2026-10-12  
**Linear:** EST-8  
**Estado:** aprobado para plan (decisiones locked humano 2026-10-12)  
**SoT previa:** `2026-09-23-reunion-dueno-mateca.md`, `2026-09-23-manga-hacienda-integracion-prd.md`  
**Plan de build:** `../plans/2026-10-12-est-8-makeka-ship-y-plataforma.md`

---

## 1. Problema

1. **Makeka (campo real)** debe poder operar el día a día sin gaps críticos del plan manga↔hacienda ya mergeado (PRs #4–#14), con migraciones cloud, auth/setup estables y flujos de campo verificados.
2. La visión del dueño es una **plataforma modular** de establecimientos rurales (ganadero / agrícola / mixto / huevos / futuros), no un monólito “solo La Makeka ganadera”.
3. Hoy el código es **single-brand, single-nav hardcode**: setup guarda `tipo` pero no filtra módulos; 18 hardcodes “La Makeka”; no hay `modules_enabled` ni tenant config.
4. No queremos **fork ni segundo repo**. Tampoco rewrite React Native.

## 2. Outcome EST-8

| # | Done cuando |
|---|-------------|
| 1 | Makeka opera día a día sin gaps **críticos** del plan actual, o cada gap crítico tiene severity + ticket split explícito. |
| 2 | Hay camino claro **y al menos un spike/MVP de config** para levantar otro campo/rubro **sin clonar el repo**. |

### No-objetivos (fuera de EST-8)

- Rewrite React Native / app nativa.
- Fees comerciales → **EST-5**.
- Unificar stock libreta + EID (D4 del PRD 2026-09-23).
- WhatsApp bot real, turismo, agricultura producción completa.
- Multi-org / multi-campo por usuario (P2; documentar tensión UNIQUE `user_id`).
- Reescritura masiva de RLS en un solo PR.
- Segundo deploy Vercel obligatorio en el spike.

## 3. Decisión locked — mismo repo, ruteo por identidad

| Identidad | Experiencia |
|-----------|-------------|
| Usuario Makeka real (dueño / operadores actuales) | App **como está hoy**: branding La Makeka, módulos ganaderos. **No romper.** |
| `testprueba@gmail.com` (laboratorio) | Shell **genérico / plataforma multi-rubro**: config + módulos por rubro/flags. Sin contaminar datos ni UX Makeka prod. |

- Misma Vercel + misma Supabase cloud OK; filas distintas.
- Si hace falta segunda org cloud: **documentar**, no aplicar DDL a ciegas.
- Remote: `LAMAKEKA/lamakeka` (sin guion). Nunca `LA-MAKEKA/lamakeka`.

## 4. Gap analysis Makeka (Fase A) — inventario 2026-10-12

### 4.1 Lo ya mergeado (NO rehacer)

| Área | Estado | Paths |
|------|--------|-------|
| Migración estado + `animal_eventos` | En **repo** | `supabase/migrations/20260923000000_manga_hacienda_integracion.sql` |
| Stock helpers + tests | Hecho | `src/lib/haciendaStock.ts` + `.test.ts` |
| Eventos manga | Hecho | `src/lib/animalEventos.ts`, hooks manga |
| Hacienda dual | Hecho | `hacienda/page.tsx`, `HaciendaPorAnimal`, tabs |
| Ficha drawer | Hecho | `AnimalFichaDrawer.tsx` |
| Potreros EID count/lista | Hecho | `potreros/page.tsx` |
| SENASA filtro stock | Hecho | `senasa/page.tsx` |
| Shell mobile + bottom nav | Hecho | `app-shell`, `mobile-bottom-nav`, `sidebar` (#13–#14) |
| Login LAN | Hecho | `location.assign("/")`, `allowedDevOrigins` |
| Setup tipos | Hecho UI | `setup/page.tsx` → `ganadero\|agricola\|mixto` |
| HID wedge | Hecho | `useHidCapture` — **no** Web Bluetooth |
| Huevos | Código mergeado | **No empujar** sobre hacienda salvo dueño |

### 4.2 Gaps / riesgos (priorizados)

| ID | Severity | Gap | Notas |
|----|----------|-----|-------|
| G1 | **P0** | Migración `20260923…` **repo ≠ cloud** | UI ya avisa en HaciendaPorAnimal si falta columna. Verificar en SQL Editor project `szffikjajxqxawxavshw`. No mentir “aplicada”. Agent no puede `supabase login` interactivo a ciegas. |
| G2 | P1 | Setup no enforced global | Solo `/` redirige a setup; otras rutas client fallan vacío si no hay estab. |
| G3 | P1 | Auth callback OTP → siempre `/setup` | `auth/callback/route.ts`; user con estab puede chocar UNIQUE. |
| G4 | P2 | Forgot password sin handler | Botón login dead. |
| G5 | P2 | `profiles.full_name` vs register metadata | Register manda `nombre`/`apellido`; trigger usa `full_name` → profile a menudo email-local. |
| G6 | P1 | `tipo` cosmético | Nav/pages no leen `establecimientos.tipo`. |
| G7 | P2 | Historial potreros mock | Comentario en `potreros/page.tsx`; no bloquea día a día. |
| G8 | P2 | Categorías CHECK `animales` vs `CATEGORIAS_BOVINOS` | Libreta puede fallar insert Terneras/Novillitos. |
| G9 | P1 | RLS laxo en libreta/finanzas/tareas/insumos | `USING (true)` — riesgo cross-tenant si hay >1 user. Makeka single-user hoy mitiga; plataforma demo lo expone. |
| G10 | P2 | Tests solo libs puras | 3 archivos vitest; cero manga/HID/auth UI. |
| G11 | P3 | WhatsApp PRONTO | Placeholder; fuera de ship. |
| G12 | Info | Hardcode brand ×18 en `src/` | Bloquea Fase B si no se centraliza. |
| G13 | Info | UNIQUE `user_id` en establecimientos | 1 estab/user; multi-campo = P2. |
| G14 | P1 campo | Prueba física bastón HID | Código listo; validación real pendiente dueño. |
| G15 | P2 | `animal_eventos` best-effort | Fallo = console.error, no rollback animal. |

### 4.3 Flujos críticos a smoke (no inventar features)

1. Login → home / setup gate  
2. Manga HID/EID + alta con categoría/potrero  
3. Hacienda por-animal + por-cantidad + ficha/egreso  
4. Potreros counts EID  
5. SENASA export/filtro stock  
6. Mobile bottom nav + logout (#14)  
7. Offline queue / ExportCSV / RFID API sin regresión  

### 4.4 Migración cloud — protocolo

```text
1. Abrir Supabase Dashboard → project szffikjajxqxawxavshw → SQL Editor
2. Verificar: SELECT column_name FROM information_schema.columns
   WHERE table_name = 'manga_animales' AND column_name = 'estado';
3. Verificar: SELECT to_regclass('public.animal_eventos');
4. Si falta → pegar contenido de
   supabase/migrations/20260923000000_manga_hacienda_integracion.sql
5. Documentar en PR body: aplicada sí/no + fecha
```

**No** asumir aplicada. **No** secrets en git/PR.

---

## 5. Diseño Fase B — plataforma multi-rubro (spike/MVP)

### 5.1 Principios

1. **Config > hardcode.** Un registry de módulos; nav lee config del establecimiento activo.
2. **Makeka = default seed**, no caso especial eterno en cada página.
3. **Demo platform** = otro establecimiento + flags, no otro codebase.
4. **Core vs add-on** explícito (tabla §5.6).
5. YAGNI: 1 estab/user en MVP; multi-org documentado P2.

### 5.2 Modelo de datos (migración)

Extender `establecimientos` (preferido MVP; evita join extra):

| Columna | Tipo | Default Makeka | Notas |
|---------|------|----------------|-------|
| `slug` | text nullable unique | null o `la-makeka` | URL/tenant key futuro |
| `nombre_display` | text nullable | = `nombre` | Branding shell |
| `logo_url` | text nullable | `/logo-makeka.png` | Público o storage path |
| `rubros` | text[] | `{ganaderia}` o según `tipo` | `ganaderia`, `agricola`, `huevos`, … |
| `modules_enabled` | text[] | ver defaults §5.4 | Feature flags nav + gates |
| `brand_theme` | jsonb nullable | null → CSS actual | tokens opcionales |
| `is_platform_demo` | boolean | false | true solo demo lab |
| `tagline` | text nullable | `AI · Ganadera` | Subtítulo sidebar |

**Backfill Makeka existente:**

```sql
UPDATE establecimientos SET
  nombre_display = COALESCE(nombre_display, nombre),
  logo_url = COALESCE(logo_url, '/logo-makeka.png'),
  rubros = COALESCE(rubros, CASE tipo
    WHEN 'agricola' THEN ARRAY['agricola']
    WHEN 'mixto' THEN ARRAY['ganaderia','agricola']
    ELSE ARRAY['ganaderia'] END),
  modules_enabled = COALESCE(modules_enabled, /* defaults por tipo */),
  tagline = COALESCE(tagline, 'AI · Ganadera'),
  is_platform_demo = COALESCE(is_platform_demo, false)
WHERE ...;
```

**Tensión UNIQUE(`user_id`):** MVP mantiene 1:1. Multi-campo = quitar unique + membership table (P2). Queries actuales `.limit(1)` documentadas como deuda.

**Alternativa rechazada para spike:** tabla `tenant_settings` separada — más joins sin beneficio hasta multi-org.

### 5.3 Module registry (código)

Un solo lugar: `src/lib/modules/registry.ts`.

```ts
export type ModuleId =
  | "inicio"
  | "manga"
  | "hacienda"
  | "potreros"
  | "senasa"
  | "produccion_huevos"
  | "agricola"       // stub Fase B
  | "insumos"
  | "finanzas"
  | "reportes"
  | "tareas"
  | "whatsapp";      // always gated / PRONTO

export type NavSlot = "primary" | "more" | "secondary";

export interface AppModule {
  id: ModuleId;
  label: string;
  href: string;
  icon: string;           // key lucide map en UI
  rubros: Array<"ganaderia" | "agricola" | "huevos" | "core">;
  navSlot: NavSlot;
  core: boolean;          // siempre candidato si enabled
  bottomNavOrder?: number;
}
```

- `sidebar.tsx` y `mobile-bottom-nav.tsx` **importan registry** y filtran por `modules_enabled` del estab activo.
- Rutas físicas pueden seguir existiendo; gate suave: si módulo off → redirect `/` o 404 amigable (P1 spike: solo ocultar nav).

### 5.4 Defaults `modules_enabled` por `tipo`

| tipo | modules_enabled (MVP) |
|------|------------------------|
| `ganadero` | `inicio, manga, hacienda, potreros, senasa, insumos, finanzas, reportes, tareas` |
| `agricola` | `inicio, agricola, insumos, finanzas, reportes, tareas` |
| `mixto` | unión ganadero + `agricola` (sin huevos por default) |
| demo platform (`is_platform_demo`) | `inicio, agricola, hacienda, insumos, finanzas, tareas` (subset smoke; **sin** datos Makeka) |

`produccion_huevos`: add-on; habilitar solo si rubro/seed lo pide (Makeka puede tenerlo off o on según dueño — default **off** en nav platform; Makeka actual lo muestra hoy → backfill Makeka **incluye** `produccion_huevos` para no regresar UX).

**Regla backfill Makeka real:** modules = lista actual del sidebar (incl. producción + whatsapp secondary) para **cero regresión nav**.

### 5.5 Branding shell

| Surface | Hoy | Spike |
|---------|-----|-------|
| Sidebar logo/title/tagline | hardcode | `logo_url`, `nombre_display`, `tagline` |
| App-shell fallback title | `"La Makeka"` | `nombre_display` |
| layout metadata | `"La Makeka"` | default Makeka; opcional dinámico P2 |
| login/register | La Makeka | **quedan brand producto** (login es del producto, no del tenant) salvo copy menor |
| setup | logo Makeka | producto; post-setup aplica tenant |

**Login product brand** ≠ **in-app tenant brand**. El spike prioriza shell autenticado.

### 5.6 Ruteo demo `testprueba@gmail.com`

**Camino preferido (DB):**

1. Crear user en Supabase Auth (Dashboard/Admin API). Password **no** en git.
2. Seed establecimiento con `is_platform_demo = true`, `nombre_display = 'Campo Demo'`, modules subset, rubros mixtos stub.
3. Tras login, layout/shell carga estab del user → registry filtra → UX genérica.

**Fallback spike corto (código):** allowlist email → fuerza defaults platform **solo si** no hay fila config; debe morir cuando seed exista.

```ts
// src/lib/tenant/resolveTenant.ts (conceptual)
// 1. load establecimientos by user_id
// 2. if row.is_platform_demo → platform theme defaults
// 3. else if email === PLATFORM_DEMO_EMAIL && !row → ensureDemoDefaults()
// 4. else → Makeka/current behavior (modules backfill)
```

**No** esparcir `if (email === 'testprueba…')` en cada page.

### 5.7 Stub agrícola

- Ruta `src/app/agricola/page.tsx` (o `/produccion/agricola`): placeholder “Módulo agrícola — próximamente” gated por `modules_enabled` includes `agricola`.
- No fingir lotes/siembra producción.
- Registry entry + icono trigo/sprout.

### 5.8 Core vs add-on

| Core (plataforma) | Add-on vertical |
|-------------------|-----------------|
| Auth, profiles, establecimientos (+ config columns) | Manga HID/EID + offline + RFID API |
| Shell (app-shell, sidebar, bottom nav) | Hacienda dual + ficha + eventos |
| Module registry + tenant resolve | Potreros ganaderos + mapa EID |
| Setup onboarding (tipo → defaults modules) | SENASA / RENSPA / export |
| Insumos, finanzas, tareas, reportes genéricos | Producción huevos |
| Stub agrícola placeholder | Futuros cultivos reales, turismo, WhatsApp bot |

### 5.9 Enfoques considerados

| Enfoque | Pros | Contras | Decisión |
|---------|------|---------|----------|
| A. Mismo repo + config DB + registry | Un deploy, Makeka intacto, camino multi-rubro | Cuidar no romper nav Makeka | **Elegido** |
| B. Fork repo / monorepo packages | Aislamiento total | Doble mantenimiento, veta humano | Rechazado |
| C. Solo allowlist email ifs | Rápido | Fracaso pitfall #12 | Solo fallback temporal |

---

## 6. Estrategia de PRs

**1 task plan = 1 branch = 1–pocos commits = 1 PR a main.**  
No mega-PR. Orden:

1. **Fase 0 (este doc + plan)** — PR docs only.  
2. **Fase A** — gaps Makeka P0/P1 en PRs chicos.  
3. **Fase B** — migración config → registry → nav → demo user → stub agrícola.

Si scope explota: split Linear **EST-8a** Makeka ship / **EST-8b** platform (proponer en PR, no callar).

## 7. Verify gates

Por PR código:

```bash
npm test
npm run typecheck
# build si routing/layout:
npm run build
```

Smoke:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
curl -sI http://localhost:3000/ | head -5          # 307 → /login
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login  # 200
```

- Login Makeka real → nav actual (manga/hacienda/…).  
- Login `testprueba@gmail.com` → nav genérica según config.  
- HID path intacto; no “fix” hydration password-manager.

## 8. Open questions (no bloquean spike)

1. ¿Makeka prod mantiene `produccion_huevos` en nav primary? → **Sí por default backfill** (cero regresión).  
2. ¿Cuándo multi-user RLS hardening? → ticket aparte post-demo.  
3. ¿Brand login genérico “Plataforma rural”? → P2; login sigue La Makeka producto.

## 9. Referencias código

- Nav hardcode: `src/components/sidebar.tsx`, `mobile-bottom-nav.tsx`, `app-shell.tsx`  
- Setup: `src/app/setup/page.tsx`  
- Schema: `supabase/migrations/20260813000000_initial_schema.sql` + SENASA/huevos/20260923  
- Proxy Next 16: `src/proxy.ts`  
- Gate home: `src/app/page.tsx`  
- Pitfalls: handoff EST-8 + skill mental la-makeka-dev-pitfalls  

---

**Fin PRD.** Implementación solo vía plan `2026-10-12-est-8-makeka-ship-y-plataforma.md`.
