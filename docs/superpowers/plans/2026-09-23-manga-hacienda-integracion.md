# Plan — Integración Manga ↔ Hacienda ↔ Potreros

> **For agentic workers:** ejecutar task-by-task. Checkboxes `- [ ]` para tracking.  
> **PRD:** `docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md`  
> **Decisiones D1–D10 cerradas** — no re-litigar stock unificado (P2).

**Goal:** Que los animales con EID de manga alimenten Hacienda y Potreros (stock + ficha + eventos), sin romper el flujo libreta por cantidad ni manga HID/SENASA.

**Architecture:** `manga_animales` = master individual + `estado`; nueva `animal_eventos`; UI Hacienda con tabs Por animal | Por cantidad; Potreros con count/lista EID; ficha reutilizable.

**Tech:** Next 16 App Router, React 19, TS, Supabase, Tailwind 4, vitest, lucide. Estilo inline + CSS vars del proyecto. Textos es-AR.

## Global constraints

- Remote: `LAMAKEKA/lamakeka` · cuenta `lamakeka2026`.
- No romper: `useHidCapture`, `/api/rfid/scans`, offline queue, `ExportCSV` CENASA, `/senasa` export.
- Categorías: `CATEGORIAS_BOVINOS` en `src/lib/senasa.ts` (única fuente).
- EID: `normalizeEid` / `isValidEid`.
- Verificación por tarea: `npm test` y/o `npm run typecheck` + smoke mental de paths tocados.
- Un commit por tarea (o por step lógico si la tarea es grande).
- Supabase: migración en `supabase/migrations/`; aplicar con `npx supabase db push` **solo si el user lo pide / hay link**; si no, dejar SQL listo y documentar.
- No usar sudo. No inventar RENSPA/formatos SIGSA.

---

### Task 1: Migración — estado + animal_eventos

**Files:**
- Create: `supabase/migrations/20260923000000_manga_hacienda_integracion.sql`

**SQL (contenido):**

```sql
-- Integración manga ↔ hacienda: estado del animal + eventos individuales

ALTER TABLE public.manga_animales
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manga_animales_estado_check'
  ) THEN
    ALTER TABLE public.manga_animales
      ADD CONSTRAINT manga_animales_estado_check
      CHECK (estado = ANY (ARRAY[
        'activo'::text,
        'sin_ubicar'::text,
        'vendido'::text,
        'muerto'::text,
        'transferido'::text,
        'baja'::text
      ]));
  END IF;
END $$;

-- Backfill: sin potrero → sin_ubicar (solo si sigue activo por default)
UPDATE public.manga_animales
SET estado = 'sin_ubicar'
WHERE potrero_id IS NULL
  AND estado = 'activo';

CREATE INDEX IF NOT EXISTS manga_animales_estado_idx
  ON public.manga_animales (establecimiento_id, estado);

CREATE INDEX IF NOT EXISTS manga_animales_estab_potrero_estado_idx
  ON public.manga_animales (establecimiento_id, potrero_id, estado);

CREATE TABLE IF NOT EXISTS public.animal_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establecimiento_id uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES public.manga_animales(id) ON DELETE CASCADE,
  eid text NOT NULL,
  tipo text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  usuario text,
  created_by uuid,
  sesion_id uuid,
  registro_manga_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT animal_eventos_tipo_check CHECK (tipo = ANY (ARRAY[
    'alta'::text,
    'cambio_potrero'::text,
    'cambio_categoria'::text,
    'venta'::text,
    'muerte'::text,
    'transferencia_salida'::text,
    'observacion'::text,
    'peso'::text,
    'sanidad'::text,
    'prenez'::text,
    'otro'::text
  ]))
);

CREATE INDEX IF NOT EXISTS animal_eventos_animal_fecha_idx
  ON public.animal_eventos (establecimiento_id, animal_id, fecha DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS animal_eventos_eid_idx
  ON public.animal_eventos (establecimiento_id, eid);

ALTER TABLE public.animal_eventos ENABLE ROW LEVEL SECURITY;

-- RLS: copiar patrón de manga_animales / registros_manga del initial_schema.
-- Si las policies existentes usan auth.uid() + join establecimientos, replicar.
-- Ejemplo genérico (ajustar al patrón real del repo al implementar):

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'animal_eventos' AND policyname = 'animal_eventos_select'
  ) THEN
    CREATE POLICY animal_eventos_select ON public.animal_eventos
      FOR SELECT TO authenticated
      USING (
        establecimiento_id IN (
          SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'animal_eventos' AND policyname = 'animal_eventos_insert'
  ) THEN
    CREATE POLICY animal_eventos_insert ON public.animal_eventos
      FOR INSERT TO authenticated
      WITH CHECK (
        establecimiento_id IN (
          SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
```

**Al implementar:** abrir `20260813000000_initial_schema.sql` y **copiar el patrón RLS exacto** de `manga_animales` / `registros_manga` (puede haber policies más ricas que user_id directo). No inventar un modelo de membership distinto.

- [ ] **Step 1:** Crear migración con SQL final alineado a RLS real.
- [ ] **Step 2:** Documentar en el commit message si `db push` quedó pendiente de user.
- [ ] **Step 3:** Commit `feat: migración estado animal + animal_eventos`

---

### Task 2: Constantes + helpers de stock + tests

**Files:**
- Create: `src/lib/haciendaStock.ts`
- Create: `src/lib/haciendaStock.test.ts`
- Update: `src/lib/senasa.ts` (exportar estados si conviene)

**API helpers (pura, testeable):**

```ts
export const ESTADOS_STOCK = ["activo", "sin_ubicar"] as const;
export const ESTADOS_BAJA = ["vendido", "muerto", "transferido", "baja"] as const;

export function enStock(estado: string): boolean;
export function countByCategoria(animales: { categoria: string | null; estado: string }[]): Record<string, number>;
export function countByPotrero(animales: { potrero_id: string | null; estado: string }[]): Record<string, number>;
export function countSinUbicar(animales: { estado: string }[]): number;
export function resolveEstadoAlta(potreroId: string | null): "activo" | "sin_ubicar";
```

- [ ] **Step 1:** Implementar helpers.
- [ ] **Step 2:** Tests vitest (casos: vacío, mix estados, null categoría → bucket "Sin categoría").
- [ ] **Step 3:** `npm test` verde.
- [ ] **Step 4:** Commit `feat: helpers stock EID hacienda`

---

### Task 3: Escritura de eventos desde manga

**Files:**
- Create: `src/lib/animalEventos.ts` (insert helpers client-side)
- Update: `src/hooks/useSupabaseManga.ts` (`createAnimal`, `updateAnimal`)
- Update: `src/components/manga/CrearAnimalForm.tsx` (UX: categoría requerida; potrero opcional → sin_ubicar)

**Reglas:**

- `createAnimal`: set `estado = resolveEstadoAlta(potreroId)`; insert evento `alta` con snapshot básico.
- `updateAnimal`: si cambia `potrero_id` → evento `cambio_potrero` `{ from, to }`; si cambia `categoria` → `cambio_categoria`; si payload trae egreso (task 6) → tipo correspondiente.
- Fallo al insertar evento **no debe rollbackear** el update del animal en MVP, pero sí `console.error` / retorno warning (documentar). Ideal: intentar evento después del update OK.

- [ ] **Step 1:** `animalEventos.ts` con `insertAnimalEvento(...)`.
- [ ] **Step 2:** Wire create/update.
- [ ] **Step 3:** CrearAnimalForm: categoría obligatoria; label potrero “si no eliges, queda sin ubicar”.
- [ ] **Step 4:** `npm run typecheck`.
- [ ] **Step 5:** Commit `feat: eventos alta y cambios desde manga`

---

### Task 4: Hook listado hacienda por animal

**Files:**
- Create: `src/hooks/useHaciendaAnimales.ts`

```ts
// fetchAnimales(establecimientoId, { q?, categoria?, potreroId?, soloStock? })
// returns rows: id, eid, vid, categoria, potrero_id, estado, raza, sexo, fecha_nacimiento, updated_at
// + join nombre potrero si se puede (select con embed potreros(nombre))
```

- [ ] **Step 1:** Hook + tipos exportados.
- [ ] **Step 2:** Commit `feat: hook useHaciendaAnimales`

---

### Task 5: UI ficha reutilizable (drawer)

**Files:**
- Create: `src/components/hacienda/AnimalFichaDrawer.tsx`
- Reutilizar campos de `EditarAnimalForm` / patrón visual manga (no copiar ciego: extraer lo necesario).

**Contenido MVP drawer:**

- Header: EID, VID, estado chip
- Datos: categoría, potrero select, raza, sexo, nacimiento
- Acciones: Guardar · Marcar venta/muerte/transferencia (pueden ser botones que llaman update estado — detalle task 6)
- Sección “Últimos registros manga” (fetchRegistros)
- Sección “Eventos” (query animal_eventos limit 20) — puede quedar placeholder “Próximamente” solo si el fetch ya está; preferir lista real simple

- [ ] **Step 1:** Drawer presentational + save via `updateAnimal` o supabase directo + eventos.
- [ ] **Step 2:** Commit `feat: AnimalFichaDrawer`

---

### Task 6: Egreso individual

**Files:**
- Update: `AnimalFichaDrawer` + `animalEventos` / `useSupabaseManga.updateAnimal`

- Botones o select de estado de baja.
- Confirmación simple (`window.confirm` aceptable en MVP del repo).
- Evento con tipo `venta|muerte|transferencia_salida`.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Commit `feat: egreso individual animal EID`

---

### Task 7: Hacienda — tabs Por animal | Por cantidad

**Files:**
- Update: `src/app/hacienda/page.tsx` (grande: tocar con cuidado)

**Enfoque seguro:**

1. Extraer el contenido actual a un subcomponente interno `HaciendaPorCantidad` **en el mismo archivo** o `HaciendaPorCantidad.tsx` si baja complejidad.
2. Agregar tabs al nivel page.
3. Nueva sección `HaciendaPorAnimal`: KPIs (total stock, sin ubicar, por categoría) + tabla + search + open drawer.

**No** reescribir preñez en esta task; dejar tab/bloque preñez como está hoy.

- [ ] **Step 1:** Tabs + Por animal wired a hook + drawer.
- [ ] **Step 2:** Smoke visual mental / typecheck.
- [ ] **Step 3:** Commit `feat: hacienda pestaña por animal EID`

---

### Task 8: Potreros — count EID + lista

**Files:**
- Update: `src/app/potreros/page.tsx`
- Optional: `src/hooks/usePotreros.ts`

**UI:**

- En card de potrero: mostrar `Cabezas EID: N` (count desde query o prop cargada en batch).
- Una query: `manga_animales` stock group by potrero_id **o** fetch all stock animals once y count client-side con helpers (OK si rodeos chicos).
- Expand/modal: lista EID + categoría; click abre mismo `AnimalFichaDrawer`.
- Label del campo manual `cabezas`: “Estimado libreta” para no confundir.

- [ ] **Step 1:** Batch counts + lista.
- [ ] **Step 2:** Commit `feat: potreros lista y cabezas EID`

---

### Task 9: SENASA filtro estado + backfill UX

**Files:**
- Update: `src/app/senasa/page.tsx`
- Update: `src/lib/senasaExport.ts` si filtra client-side

- Default: export/listado solo `enStock(estado)`.
- Toggle opcional “Incluir bajas” (P0 chico si es barato; si no, solo stock).

- [ ] **Step 1:** Filtro.
- [ ] **Step 2:** Commit `fix: SENASA lista solo animales en stock`

---

### Task 10: Cierre calidad

- [ ] **Step 1:** `npm run lint && npm run typecheck && npm test`
- [ ] **Step 2:** Revisar que `/manga` compile y tipos de create/update sigan alineados.
- [ ] **Step 3:** Actualizar spec 2026-08-13 con banner “superseded”.
- [ ] **Step 4:** Commit `docs: cerrar integración manga-hacienda P0` si faltan docs.

---

## P1 (después del P0, mismo PRD §6)

1. Timeline unificado ficha (eventos + registros).
2. Espejo peso/sanidad desde `registros_manga.datos` → `animal_eventos`.
3. `logAudit` en updates manga_animales.
4. Reportes: card stock EID.
5. Alinear CHECK categorías tabla `animales` con `CATEGORIAS_BOVINOS`.

## P2 (taller dueño)

- Motor saldo unificado libreta + EID anti-doble-conteo.
- Preñez individual.
- Rename tabla.

---

## Definition of done (P0)

- [ ] Migración en repo (aplicada en cloud o documentada pendiente).
- [ ] Hacienda muestra animales EID con KPIs correctos.
- [ ] Potrero muestra lista/count EID.
- [ ] Alta manga con potrero aparece en ambos.
- [ ] Egreso saca del stock.
- [ ] Libreta por cantidad intacta.
- [ ] Manga HID + exports sin regresión.
- [ ] Tests helpers + typecheck OK.

## Prompt de handoff implementación

```text
Implementá P0 del plan:
docs/superpowers/plans/2026-09-23-manga-hacienda-integracion.md
según PRD:
docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md
Repo: ~/Documentos/La Makeka · LAMAKEKA/lamakeka · lamakeka2026
Empezá por Task 1. Commits chicos. No reabras D4 (tabs duales).
Al final: lint + typecheck + test y resumen de lo hecho + si falta db push.
```
