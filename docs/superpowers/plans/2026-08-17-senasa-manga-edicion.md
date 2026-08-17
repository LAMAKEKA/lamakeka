# Edición en Manga + Sección SENASA — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar/rellenar manualmente los datos de cada animal (caravana) en Manga y agregar una sección "SENASA" que prepara y exporta los datos oficiales de trazabilidad (caravanas individuales).

**Architecture:** Se extiende el modelo `manga_animales` con campos de trazabilidad (potrero, categoría, fecha de aplicación, motivo) y `establecimientos` con `renspa`. Se agrega edición de animales en Manga y una página `/senasa` que lista caravanas, valida EID y exporta CSV + TXT. Todo en el stack actual (Next.js 16 App Router + Supabase + Tailwind).

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, TypeScript, Supabase (Postgres + RLS), Tailwind CSS v4, lucide-react.

## Global Constraints

- **Sin framework de tests:** el repo no tiene runner de tests (`package.json` no define `test`, ni jest/vitest). Verificación = `npm run lint` + `npm run build` + chequeo manual en browser. No se introduce vitest en esta fase.
- **Estilo visual:** replicar el patrón existente — estilos inline con `style={{}}` usando las variables CSS `--color-campo`, `--color-cuero`, `--color-tierra`, `--color-pampa` y las clases utilitarias ya usadas (`form-label`, `rounded-2xl`, `rounded-xl`, `px-4 py-3`, `text-sm`, `outline-none`). No introducir CSS nuevo salvo excepción justificada.
- **Textos en español (es-AR).** Fechas con `toLocaleDateString("es-AR", ...)`.
- **Columnas/categorías:** categorías bovinas = `Terneros, Terneras, Novillos, Novillitos, Vacas, Vaquillonas, Toros`. Motivos SENASA = `Acta de vacunación aftosa`, `Novedad por nacimiento`, `Reinscripción anual RENSPA`.
- **EID válido = 15 dígitos** (reutilizar `normalizeEid`/`isValidEid` de `src/lib/eid.ts`).
- **No romper el CSV CENASA actual** (`src/components/manga/ExportCSV.tsx`).
- **Commits frecuentes:** un commit por tarea, mensajes en estilo del repo (convencional: `feat:`/`fix:`/`docs:`).
- **Formato exacto del TXT de SIGSA pendiente de verificar** contra el Manual SENASA (el exportador lo marca como "beta" hasta confirmar). El CSV es el formato seguro por defecto.

---

### Task 1: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260817000000_oficial_senasa.sql`

**Interfaces:**
- Consumes: esquema actual (`establecimientos`, `manga_animales`, `potreros`).
- Produces: columnas `establecimientos.renspa`, y `manga_animales.potrero_id`, `.categoria`, `.fecha_aplicacion`, `.motivo_declaracion` + FK `manga_animales.potrero_id → potreros.id`.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Trazabilidad SENASA + gestión por potrero/categoría en manga.

ALTER TABLE public.establecimientos
  ADD COLUMN IF NOT EXISTS renspa text;

ALTER TABLE public.manga_animales
  ADD COLUMN IF NOT EXISTS potrero_id uuid,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS fecha_aplicacion date,
  ADD COLUMN IF NOT EXISTS motivo_declaracion text;

ALTER TABLE public.manga_animales
  ADD CONSTRAINT manga_animales_potrero_id_fkey
  FOREIGN KEY (potrero_id) REFERENCES public.potreros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS manga_animales_potrero_id_idx
  ON public.manga_animales USING btree (potrero_id);
```

- [ ] **Step 2: Aplicar la migración**

Run: `npx supabase db push`
Expected: salida sin errores; columnas creadas en `establecimientos` y `manga_animales`.

Si el CLI no está linkeado al proyecto, ejecutar el SQL manualmente en el editor SQL de Supabase y verificar que no falle.

- [ ] **Step 3: Verificar columnas**

Run: `npx supabase db lint` (si está disponible) o verificar en Supabase que `manga_animales` tiene las 4 columnas nuevas y `establecimientos.renspa`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260817000000_oficial_senasa.sql
git commit -m "feat: migración — campos trazabilidad SENASA en manga y establecimientos"
```

---

### Task 2: Constantes compartidas

**Files:**
- Create: `src/lib/senasa.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `CATEGORIAS_BOVINOS`, `MOTIVOS_DECLARACION`, tipos `CategoriaBovino`, `MotivoDeclaracion`.

- [ ] **Step 1: Crear el archivo**

```ts
export const CATEGORIAS_BOVINOS = [
  "Terneros",
  "Terneras",
  "Novillos",
  "Novillitos",
  "Vacas",
  "Vaquillonas",
  "Toros",
] as const;

export const MOTIVOS_DECLARACION = [
  "Acta de vacunación aftosa",
  "Novedad por nacimiento",
  "Reinscripción anual RENSPA",
] as const;

export type CategoriaBovino = (typeof CATEGORIAS_BOVINOS)[number];
export type MotivoDeclaracion = (typeof MOTIVOS_DECLARACION)[number];
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit` (o `npm run lint`)
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/senasa.ts
git commit -m "feat: constantes compartidas de categorías bovinas y motivos SENASA"
```

---

### Task 3: Extender `useSupabaseManga` y agregar `usePotreros`

**Files:**
- Modify: `src/hooks/useSupabaseManga.ts`
- Create: `src/hooks/usePotreros.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/client`.
- Produces:
  - `MangaAnimal` ahora incluye `potrero_id: string | null`, `categoria: string | null`, `fecha_aplicacion: string | null`, `motivo_declaracion: string | null`.
  - `useSupabaseManga()` retorna además `updateAnimal(payload: UpdateAnimalPayload): Promise<MangaAnimal | null>`.
  - `usePotreros()` retorna `{ potreros: PotreroOption[], fetchPotreros(establecimientoId: string) }`.

- [ ] **Step 1: Extender `MangaAnimal` y payloads en `useSupabaseManga.ts`**

Reemplazar la interfaz `MangaAnimal` (líneas 6-14) por:

```ts
export interface MangaAnimal {
  id: string;
  eid: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  lote: string | null;
  potrero_id: string | null;
  categoria: string | null;
  fecha_aplicacion: string | null;
  motivo_declaracion: string | null;
}
```

Reemplazar `CreateAnimalPayload` (líneas 42-50) por:

```ts
export interface CreateAnimalPayload {
  eid: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  lote: string | null;
  categoria: string | null;
  potreroId: string | null;
  fechaAplicacion: string | null;
  motivoDeclaracion: string | null;
  establecimientoId: string;
}

export interface UpdateAnimalPayload {
  id: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  lote: string | null;
  categoria: string | null;
  potreroId: string | null;
  fechaAplicacion: string | null;
  motivoDeclaracion: string | null;
}
```

- [ ] **Step 2: Actualizar `fetchAnimal` y `createAnimal`**

En `fetchAnimal`, reemplazar el `.select(...)` por:

```ts
.select("id, eid, vid, raza, sexo, fecha_nacimiento, lote, potrero_id, categoria, fecha_aplicacion, motivo_declaracion")
```

En `createAnimal`, actualizar la firma para recibir los nuevos campos y el `.insert(...)` + `.select(...)`:

```ts
const createAnimal = useCallback(
  async ({
    eid, vid, raza, sexo, fechaNacimiento, lote,
    categoria, potreroId, fechaAplicacion, motivoDeclaracion, establecimientoId,
  }: CreateAnimalPayload): Promise<MangaAnimal | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("manga_animales")
      .insert({
        establecimiento_id: establecimientoId,
        eid,
        vid,
        raza,
        sexo,
        fecha_nacimiento: fechaNacimiento,
        lote,
        categoria,
        potrero_id: potreroId,
        fecha_aplicacion: fechaAplicacion,
        motivo_declaracion: motivoDeclaracion,
      })
      .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote, potrero_id, categoria, fecha_aplicacion, motivo_declaracion")
      .single();

    if (error) {
      const { data: existing } = await supabase
        .from("manga_animales")
        .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote, potrero_id, categoria, fecha_aplicacion, motivo_declaracion")
        .eq("establecimiento_id", establecimientoId)
        .eq("eid", eid)
        .maybeSingle();
      return existing;
    }
    return data;
  },
  []
);
```

- [ ] **Step 3: Agregar `updateAnimal`**

Insertar antes del `return` final (después de `saveRegistro`) un nuevo callback:

```ts
const updateAnimal = useCallback(async (payload: UpdateAnimalPayload): Promise<MangaAnimal | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("manga_animales")
    .update({
      vid: payload.vid,
      raza: payload.raza,
      sexo: payload.sexo,
      fecha_nacimiento: payload.fechaNacimiento,
      lote: payload.lote,
      categoria: payload.categoria,
      potrero_id: payload.potreroId,
      fecha_aplicacion: payload.fechaAplicacion,
      motivo_declaracion: payload.motivoDeclaracion,
    })
    .eq("id", payload.id)
    .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote, potrero_id, categoria, fecha_aplicacion, motivo_declaracion")
    .single();
  if (error) return null;
  return data;
}, []);
```

Actualizar el `return` del hook para incluir `updateAnimal`:

```ts
return { loadingAnimal, saving, fetchAnimal, fetchRegistros, scanEid, createAnimal, updateAnimal, saveRegistro };
```

- [ ] **Step 4: Crear `usePotreros.ts`**

```ts
"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PotreroOption {
  id: string;
  nombre: string;
}

export function usePotreros() {
  const [potreros, setPotreros] = useState<PotreroOption[]>([]);

  const fetchPotreros = useCallback(async (establecimientoId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("potreros")
      .select("id, nombre")
      .eq("establecimiento_id", establecimientoId)
      .order("nombre");
    setPotreros(data ?? []);
  }, []);

  return { potreros, fetchPotreros };
}
```

- [ ] **Step 5: Verificar**

Run: `npm run lint`
Expected: sin errores de tipo ni lint.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSupabaseManga.ts src/hooks/usePotreros.ts
git commit -m "feat: updateAnimal en manga y hook usePotreros"
```

---

### Task 4: Ampliar `CrearAnimalForm` con campos nuevos

**Files:**
- Modify: `src/components/manga/CrearAnimalForm.tsx`

**Interfaces:**
- Consumes: `PotreroOption` de `@/hooks/usePotreros`; `CATEGORIAS_BOVINOS`, `MOTIVOS_DECLARACION` de `@/lib/senasa`.
- Produces: `AnimalNuevo` ahora incluye `categoria`, `potreroId`, `fechaAplicacion`, `motivoDeclaracion`.

- [ ] **Step 1: Actualizar imports y el tipo `AnimalNuevo`**

Reemplazar las primeras líneas del archivo (el bloque de imports y `AnimalNuevo`) por:

```ts
"use client";

import { useState } from "react";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { CATEGORIAS_BOVINOS, MOTIVOS_DECLARACION } from "@/lib/senasa";
import type { PotreroOption } from "@/hooks/usePotreros";

export interface AnimalNuevo {
  eid: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  lote: string | null;
  categoria: string | null;
  potreroId: string | null;
  fechaAplicacion: string | null;
  motivoDeclaracion: string | null;
}

interface CrearAnimalFormProps {
  eid: string;
  saving: boolean;
  potreros: PotreroOption[];
  onCreate: (animal: AnimalNuevo) => void;
  onCancel: () => void;
}
```

- [ ] **Step 2: Agregar estado y desestructurar `potreros`**

Reemplazar la firma del componente y su bloque de `useState` por:

```ts
export function CrearAnimalForm({ eid, saving, potreros, onCreate, onCancel }: CrearAnimalFormProps) {
  const [vid, setVid] = useState("");
  const [raza, setRaza] = useState("");
  const [sexo, setSexo] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [lote, setLote] = useState("");
  const [categoria, setCategoria] = useState("");
  const [potreroId, setPotreroId] = useState("");
  const [fechaAplicacion, setFechaAplicacion] = useState(new Date().toISOString().split("T")[0]);
  const [motivoDeclaracion, setMotivoDeclaracion] = useState("");
  const [error, setError] = useState<string | null>(null);
```

- [ ] **Step 3: Actualizar `handleSubmit`**

Reemplazar el `onCreate({ ... })` por:

```ts
onCreate({
  eid,
  vid: vid.trim() || null,
  raza: raza.trim() || null,
  sexo: sexo.trim() || null,
  fechaNacimiento: fechaNacimiento || null,
  lote: lote.trim() || null,
  categoria: categoria || null,
  potreroId: potreroId || null,
  fechaAplicacion: fechaAplicacion || null,
  motivoDeclaracion: motivoDeclaracion || null,
});
```

- [ ] **Step 4: Agregar los campos nuevos al JSX**

Insertar, justo después del bloque del campo `Lote` (antes de `{error && (...)}`), este bloque:

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="form-label">Categoría</label>
    <select
      value={categoria}
      onChange={(e) => setCategoria(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    >
      <option value="">Sin categoría</option>
      {CATEGORIAS_BOVINOS.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  </div>
  <div>
    <label className="form-label">Potrero</label>
    <select
      value={potreroId}
      onChange={(e) => setPotreroId(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    >
      <option value="">Sin potrero</option>
      {potreros.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
    </select>
  </div>
</div>

<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="form-label">Fecha de aplicación</label>
    <input
      type="date"
      value={fechaAplicacion}
      onChange={(e) => setFechaAplicacion(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    />
  </div>
  <div>
    <label className="form-label">Motivo de declaración</label>
    <select
      value={motivoDeclaracion}
      onChange={(e) => setMotivoDeclaracion(e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={INPUT_STYLE}
      onFocus={onFocusIn}
      onBlur={onBlurIn}
    >
      <option value="">Sin motivo</option>
      {MOTIVOS_DECLARACION.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  </div>
</div>
```

- [ ] **Step 5: Verificar**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/components/manga/CrearAnimalForm.tsx
git commit -m "feat: campos categoría, potrero, fecha aplicación y motivo en alta de animal"
```

---

### Task 5: Nuevo `EditarAnimalForm`

**Files:**
- Create: `src/components/manga/EditarAnimalForm.tsx`

**Interfaces:**
- Consumes: `MangaAnimal`, `UpdateAnimalPayload` de `@/hooks/useSupabaseManga`; `PotreroOption` de `@/hooks/usePotreros`; constantes de `@/lib/senasa`.
- Produces: componente `EditarAnimalForm` con prop `onSave(payload: UpdateAnimalPayload)`.

- [ ] **Step 1: Crear el componente**

```tsx
"use client";

import { useState } from "react";
import { Loader2, Pencil, AlertCircle } from "lucide-react";
import { CATEGORIAS_BOVINOS, MOTIVOS_DECLARACION } from "@/lib/senasa";
import type { MangaAnimal, UpdateAnimalPayload } from "@/hooks/useSupabaseManga";
import type { PotreroOption } from "@/hooks/usePotreros";

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "var(--color-pampa)",
  color: "var(--color-tierra)",
};

const onFocusIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "var(--color-cuero)";
  e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
};
const onBlurIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "rgba(212,197,169,0.8)";
  e.target.style.boxShadow = "none";
};

interface EditarAnimalFormProps {
  animal: MangaAnimal;
  potreros: PotreroOption[];
  saving: boolean;
  onSave: (payload: UpdateAnimalPayload) => void;
  onCancel: () => void;
}

export function EditarAnimalForm({ animal, potreros, saving, onSave, onCancel }: EditarAnimalFormProps) {
  const [vid, setVid] = useState(animal.vid ?? "");
  const [raza, setRaza] = useState(animal.raza ?? "");
  const [sexo, setSexo] = useState(animal.sexo ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(animal.fecha_nacimiento ?? "");
  const [lote, setLote] = useState(animal.lote ?? "");
  const [categoria, setCategoria] = useState(animal.categoria ?? "");
  const [potreroId, setPotreroId] = useState(animal.potrero_id ?? "");
  const [fechaAplicacion, setFechaAplicacion] = useState(animal.fecha_aplicacion ?? "");
  const [motivoDeclaracion, setMotivoDeclaracion] = useState(animal.motivo_declaracion ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sexo) {
      setError("Indicá el sexo del animal.");
      return;
    }
    onSave({
      id: animal.id,
      vid: vid.trim() || null,
      raza: raza.trim() || null,
      sexo: sexo.trim() || null,
      fechaNacimiento: fechaNacimiento || null,
      lote: lote.trim() || null,
      categoria: categoria || null,
      potreroId: potreroId || null,
      fechaAplicacion: fechaAplicacion || null,
      motivoDeclaracion: motivoDeclaracion || null,
    });
  }

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid var(--color-campo)",
        boxShadow: "0 2px 12px rgba(58,74,50,0.1)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Pencil size={16} style={{ color: "var(--color-campo)" }} />
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Editar animal
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="form-label">EID</label>
          <input
            type="text"
            value={animal.eid}
            readOnly
            className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
            style={{ ...INPUT_STYLE, opacity: 0.7 }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">VID (caravana visual)</label>
            <input type="text" value={vid} onChange={(e) => setVid(e.target.value)} placeholder="Ej: 245"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn} />
          </div>
          <div>
            <label className="form-label">Sexo *</label>
            <select value={sexo} onChange={(e) => setSexo(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn}>
              <option value="">Seleccionar...</option>
              <option value="Macho">Macho</option>
              <option value="Hembra">Hembra</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Raza</label>
            <input type="text" value={raza} onChange={(e) => setRaza(e.target.value)} placeholder="Ej: Angus"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn} />
          </div>
          <div>
            <label className="form-label">Fecha de nacimiento</label>
            <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn}>
              <option value="">Sin categoría</option>
              {CATEGORIAS_BOVINOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Potrero</label>
            <select value={potreroId} onChange={(e) => setPotreroId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn}>
              <option value="">Sin potrero</option>
              {potreros.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Fecha de aplicación</label>
            <input type="date" value={fechaAplicacion} onChange={(e) => setFechaAplicacion(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn} />
          </div>
          <div>
            <label className="form-label">Motivo de declaración</label>
            <select value={motivoDeclaracion} onChange={(e) => setMotivoDeclaracion(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn}>
              <option value="">Sin motivo</option>
              {MOTIVOS_DECLARACION.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Lote</label>
          <input type="text" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Ej: Lote 3"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onBlurIn} />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
            <AlertCircle size={15} className="shrink-0" />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)" }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--color-campo)", opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/manga/EditarAnimalForm.tsx
git commit -m "feat: formulario de edición de animal en manga"
```

---

### Task 6: Conectar edición en la página de Manga

**Files:**
- Modify: `src/app/manga/page.tsx`
- Modify: `src/components/manga/FichaAnimal.tsx`

**Interfaces:**
- Consumes: `usePotreros`, `EditarAnimalForm`, `updateAnimal` de `useSupabaseManga`.
- Produces: flujo de edición — botón "Editar" en ficha → `EditarAnimalForm` → `updateAnimal` actualiza `currentAnimal`.

- [ ] **Step 1: Agregar prop `onEdit` a `FichaAnimal.tsx`**

En `FichaAnimal.tsx`, cambiar la interfaz `FichaAnimalProps` para agregar `onEdit?: () => void;`, y la firma del componente para desestructurar `onEdit`:

```tsx
interface FichaAnimalProps {
  eid: string | null;
  animal: MangaAnimal | null;
  registros: RegistroManga[];
  loading: boolean;
  campos: MangaCampo[];
  onEdit?: () => void;
}
```

Y la firma:

```tsx
export function FichaAnimal({ eid, animal, registros, loading, campos, onEdit }: FichaAnimalProps) {
```

Agregar un botón "Editar" en el header (junto al título). Reemplazar el bloque del header que muestra el título (el `div` con `flex items-start justify-between mb-4`) para incluir el botón cuando `animal` existe:

```tsx
<div className="flex items-start justify-between mb-4">
  <div>
    <div className="flex items-center gap-2">
      <Tag size={14} style={{ color: "var(--color-campo)" }} />
      <p className="text-xs font-mono font-semibold" style={{ color: "rgba(26,26,24,0.5)" }}>
        EID {eid}
      </p>
    </div>
    {animal ? (
      <h2 className="text-xl font-bold mt-1" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
        {animal.vid ?? "Sin VID"}{" "}
        <span className="text-sm font-normal" style={{ color: "rgba(26,26,24,0.4)" }}>
          {animal.raza ?? ""}
        </span>
      </h2>
    ) : (
      <div className="flex items-center gap-1.5 mt-1">
        <AlertCircle size={14} style={{ color: "#d97706" }} />
        <p className="text-sm" style={{ color: "#d97706" }}>Animal no registrado en el sistema</p>
      </div>
    )}
  </div>

  <div className="flex items-center gap-1.5 shrink-0">
    {animal && onEdit && (
      <button
        onClick={onEdit}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{ color: "var(--color-campo)", border: "1px solid rgba(58,74,50,0.3)", backgroundColor: "rgba(58,74,50,0.04)" }}
      >
        <Pencil size={12} /> Editar
      </button>
    )}
    {animal && (animal.sexo || animal.lote) && (
      <div className="flex gap-1.5">
        {animal.sexo && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: animal.sexo.toLowerCase() === "macho" ? "rgba(37,99,235,0.08)" : "rgba(217,119,6,0.08)", color: animal.sexo.toLowerCase() === "macho" ? "#2563eb" : "#d97706" }}>
            {animal.sexo}
          </span>
        )}
        {animal.lote && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(58,74,50,0.1)", color: "var(--color-campo)" }}>
            {animal.lote}
          </span>
        )}
      </div>
    )}
  </div>
</div>
```

Agregar `Pencil` al import de lucide-react al inicio del archivo:

```tsx
import { Loader2, AlertCircle, Calendar, Tag, Beef, History, Pencil } from "lucide-react";
```

- [ ] **Step 2: Conectar en `page.tsx`**

Agregar imports:

```tsx
import { usePotreros } from "@/hooks/usePotreros";
import { EditarAnimalForm } from "@/components/manga/EditarAnimalForm";
```

En la desestructuración del hook `useSupabaseManga`, agregar `updateAnimal`:

```tsx
const { loadingAnimal, saving, fetchAnimal, fetchRegistros, scanEid, createAnimal, updateAnimal, saveRegistro } =
  useSupabaseManga();
```

Agregar `usePotreros` junto a los otros hooks (después de `useOfflineQueue`):

```tsx
const { potreros, fetchPotreros } = usePotreros();
```

Agregar estado de edición junto a los otros `useState`:

```tsx
const [editingAnimal, setEditingAnimal] = useState(false);
```

En el `useEffect` de init (el que busca el establecimiento), dentro del `if (estab)` agregar `fetchPotreros(estab.id);`:

```tsx
if (estab) {
  setEstablecimientoId(estab.id);
  fetchSesiones(estab.id);
  cacheAnimalIndex(estab.id);
  fetchPotreros(estab.id);
}
```

Actualizar la lista de dependencias del efecto para incluir `fetchPotreros`.

Agregar `handleUpdateAnimal` (después de `handleCreateAnimal`):

```tsx
async function handleUpdateAnimal(payload: Parameters<typeof updateAnimal>[0]) {
  const updated = await updateAnimal(payload);
  if (updated) {
    setCurrentAnimal(updated);
    setEditingAnimal(false);
  }
}
```

Actualizar el `selectEid` y `handleEid` para resetear `editingAnimal` cuando cambia el EID: en ambos, junto a `setCreatingAnimal(false)` agregar `setEditingAnimal(false);`.

Actualizar el render: pasar `onEdit={() => setEditingAnimal(true)}` a `FichaAnimal`, y renderizar `EditarAnimalForm` cuando `editingAnimal && currentAnimal`. Reemplazar el bloque:

```tsx
<FichaAnimal
  eid={selectedEid}
  animal={currentAnimal}
  registros={currentRegistros}
  loading={loadingAnimal || processing}
  campos={campos}
/>
```

por:

```tsx
<FichaAnimal
  eid={selectedEid}
  animal={currentAnimal}
  registros={currentRegistros}
  loading={loadingAnimal || processing}
  campos={campos}
  onEdit={() => setEditingAnimal(true)}
/>

{selectedEid && editingAnimal && currentAnimal && (
  <EditarAnimalForm
    animal={currentAnimal}
    potreros={potreros}
    saving={saving}
    onSave={handleUpdateAnimal}
    onCancel={() => setEditingAnimal(false)}
  />
)}
```

Actualizar `handleCreateAnimal` para pasar los nuevos campos al `createAnimal`:

```tsx
const created = await createAnimal({
  eid: animal.eid,
  vid: animal.vid,
  raza: animal.raza,
  sexo: animal.sexo,
  fechaNacimiento: animal.fechaNacimiento,
  lote: animal.lote,
  categoria: animal.categoria,
  potreroId: animal.potreroId,
  fechaAplicacion: animal.fechaAplicacion,
  motivoDeclaracion: animal.motivoDeclaracion,
  establecimientoId,
});
```

Actualizar el `CrearAnimalForm` para pasarle `potreros`:

```tsx
<CrearAnimalForm
  eid={selectedEid}
  saving={creatingAnimal}
  potreros={potreros}
  onCreate={handleCreateAnimal}
  onCancel={() => setSelectedEid(null)}
/>
```

- [ ] **Step 3: Verificar**

Run: `npm run lint`
Expected: sin errores de tipos.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`, abrir `/manga`, escanear un EID existente (o ingresar EID manual), confirmar que aparece el botón "Editar" y que al guardar se actualizan los campos.

- [ ] **Step 5: Commit**

```bash
git add src/app/manga/page.tsx src/components/manga/FichaAnimal.tsx
git commit -m "feat: edición de animales existentes en manga"
```

---

### Task 7: Sección SENASA (página, menú y export)

**Files:**
- Create: `src/lib/senasaExport.ts`
- Create: `src/app/senasa/page.tsx`
- Modify: `src/components/sidebar.tsx`

**Interfaces:**
- Consumes: `createClient`; `isValidEid` de `@/lib/eid`; `MOTIVOS_DECLARACION` de `@/lib/senasa`.
- Produce (de `senasaExport.ts`): `SenasaRow`, `buildSenasaCsv(rows): string`, `buildSenasaTxt(rows, renspa, fechaAplicacion, motivo): string`.

- [ ] **Step 1: Crear `src/lib/senasaExport.ts`**

```ts
export interface SenasaRow {
  eid: string;
  vid: string | null;
  sexo: string | null;
  raza: string | null;
  fecha_nacimiento: string | null;
  fecha_aplicacion: string | null;
  motivo_declaracion: string | null;
}

function escapeCsvCell(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildSenasaCsv(rows: SenasaRow[]): string {
  const headers = ["EID", "VID", "Sexo", "Raza", "Fecha Nacimiento", "Fecha Aplicación", "Motivo"];
  const lines = rows.map((r) =>
    [
      r.eid,
      r.vid ?? "",
      r.sexo ?? "",
      r.raza ?? "",
      r.fecha_nacimiento ?? "",
      r.fecha_aplicacion ?? "",
      r.motivo_declaracion ?? "",
    ].map(escapeCsvCell).join(",")
  );
  return "\uFEFF" + [headers.join(","), ...lines].join("\r\n");
}

// Formato SIGSA (beta): verificar contra el Manual de Declaración de Dispositivos
// de Identificación Electrónica (RFID) antes de usar la importación por archivo.
export function buildSenasaTxt(rows: SenasaRow[], renspa: string, fechaAplicacion: string, motivo: string): string {
  const cabecera = `${renspa}-${fechaAplicacion}-${motivo}`;
  const dispositivos = rows
    .map((r) => [r.eid, r.sexo ?? "", r.raza ?? "", r.fecha_nacimiento ?? ""].join("-"))
    .join(";");
  return `${cabecera};${dispositivos}`;
}
```

- [ ] **Step 2: Agregar ítem al menú (`sidebar.tsx`)**

En `sidebar.tsx`, agregar `ShieldCheck` al import de lucide-react:

```tsx
import {
  LayoutDashboard, Beef, Map, Package, CheckSquare, BarChart2, PieChart, MessageCircle, LogOut, ScanLine, ShieldCheck,
} from "lucide-react";
```

Agregar el ítem en `navItems` (después de Manga):

```tsx
{ href: "/senasa", label: "SENASA", icon: ShieldCheck },
```

- [ ] **Step 3: Crear `src/app/senasa/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Download, Loader2, AlertTriangle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidEid } from "@/lib/eid";
import { MOTIVOS_DECLARACION } from "@/lib/senasa";
import { buildSenasaCsv, buildSenasaTxt, type SenasaRow } from "@/lib/senasaExport";

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "#ffffff",
  color: "var(--color-tierra)",
};

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function SenasaPage() {
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [renspa, setRenspa] = useState("");
  const [savingRenspa, setSavingRenspa] = useState(false);
  const [renspaSaved, setRenspaSaved] = useState(false);
  const [rows, setRows] = useState<SenasaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMotivo, setFiltroMotivo] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: estab } = await supabase
      .from("establecimientos")
      .select("id, renspa")
      .limit(1)
      .single();
    if (!estab) { setLoading(false); return; }
    setEstablecimientoId(estab.id);
    setRenspa(estab.renspa ?? "");
    const { data } = await supabase
      .from("manga_animales")
      .select("eid, vid, sexo, raza, fecha_nacimiento, fecha_aplicacion, motivo_declaracion")
      .eq("establecimiento_id", estab.id)
      .order("eid");
    setRows((data ?? []) as SenasaRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveRenspa() {
    if (!establecimientoId) return;
    setSavingRenspa(true);
    const supabase = createClient();
    await supabase.from("establecimientos").update({ renspa: renspa.trim() || null }).eq("id", establecimientoId);
    setSavingRenspa(false);
    setRenspaSaved(true);
    setTimeout(() => setRenspaSaved(false), 2500);
  }

  const filtered = rows.filter((r) => {
    if (filtroMotivo && (r.motivo_declaracion ?? "") !== filtroMotivo) return false;
    if (filtroFechaDesde && r.fecha_aplicacion && r.fecha_aplicacion < filtroFechaDesde) return false;
    if (filtroFechaHasta && r.fecha_aplicacion && r.fecha_aplicacion > filtroFechaHasta) return false;
    return true;
  });

  const invalidos = filtered.filter((r) => !isValidEid(r.eid));
  const sinDeclarar = filtered.filter((r) => !r.fecha_aplicacion || !r.motivo_declaracion);

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    if (filtered.length === 0) { alert("No hay caravanas para exportar."); return; }
    download(`senasa_caravanas_${new Date().toISOString().split("T")[0]}.csv`, buildSenasaCsv(filtered), "text/csv;charset=utf-8;");
  }

  function handleExportTxt() {
    if (filtered.length === 0) { alert("No hay caravanas para exportar."); return; }
    if (!renspa) { alert("Completá el RENSPA antes de exportar el TXT."); return; }
    const fecha = filtroFechaDesde || new Date().toISOString().split("T")[0];
    const motivo = filtroMotivo || "Novedad por nacimiento";
    download("senasa_caravanas.txt", buildSenasaTxt(filtered, renspa, fecha, motivo), "text/plain;charset=utf-8;");
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Trazabilidad</p>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>SENASA</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>
              <Download size={15} /> CSV
            </button>
            <button onClick={handleExportTxt} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-campo)" }}>
              <Download size={15} /> TXT (SIGSA)
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col gap-4">
        {/* Config RENSPA */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} style={{ color: "var(--color-campo)" }} />
            <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>RENSPA del establecimiento</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input type="text" value={renspa} onChange={(e) => setRenspa(e.target.value)} placeholder="Ingresá el número de RENSPA"
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; }} />
            <button onClick={handleSaveRenspa} disabled={savingRenspa}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-campo)", opacity: savingRenspa ? 0.7 : 1 }}>
              {savingRenspa ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {renspaSaved ? "Guardado" : "Guardar"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
            <option value="">Todos los motivos</option>
            {MOTIVOS_DECLARACION.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
          <span className="text-sm" style={{ color: "rgba(26,26,24,0.3)" }}>→</span>
          <input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>Caravanas</p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-tierra)" }}>{filtered.length}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>Sin declarar</p>
            <p className="text-2xl font-bold" style={{ color: "#d97706" }}>{sinDeclarar.length}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(220,38,38,0.3)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>EID inválidos</p>
            <p className="text-2xl font-bold" style={{ color: "#dc2626" }}>{invalidos.length}</p>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color: "var(--color-campo)" }} /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShieldCheck size={28} style={{ color: "rgba(26,26,24,0.15)" }} />
              <p className="text-sm mt-3" style={{ color: "rgba(26,26,24,0.4)" }}>Sin caravanas registradas.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                    {["EID", "VID", "Sexo", "Raza", "Nacimiento", "Aplicación", "Motivo"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.5)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const inv = !isValidEid(r.eid);
                    return (
                      <tr key={r.eid} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(212,197,169,0.22)" : "none" }}>
                        <td className="px-5 py-3 text-sm font-mono" style={{ color: inv ? "#dc2626" : "var(--color-tierra)" }}>{r.eid}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.vid ?? "—"}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.sexo ?? "—"}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.raza ?? "—"}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{fmtFecha(r.fecha_nacimiento)}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{fmtFecha(r.fecha_aplicacion)}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>
                          {r.motivo_declaracion ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(58,74,50,0.1)", color: "var(--color-campo)" }}>{r.motivo_declaracion}</span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(217,119,6,0.08)", color: "#d97706" }}>Pendiente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {invalidos.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
            <AlertTriangle size={15} /> Hay {invalidos.length} EID inválidos (deben tener 15 dígitos). Corregilos en Manga.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `npm run lint` y luego `npm run build`
Expected: build sin errores.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev`, abrir `/senasa`, confirmar que lista caravanas, guardar RENSPA, y que los botones CSV y TXT descargan archivos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/senasaExport.ts src/app/senasa/page.tsx src/components/sidebar.tsx
git commit -m "feat: sección SENASA con listado, RENSPA y export CSV/TXT"
```

---

### Self-review del plan (contra el spec)

- **B (edición en manga):** cubierto por Tasks 3–6 (nuevos campos + `updateAnimal` + `EditarAnimalForm` + botón Editar).
- **A (SENASA):** cubierto por Tasks 1, 2, 7 (campos oficiales, RENSPA, página `/senasa`, export CSV + TXT).
- **RENSPA en establecimiento:** cubierto (Task 1 columna + Task 7 input de configuración).
- **Validación EID 15 dígitos:** cubierto (Task 7 usa `isValidEid`, muestra inválidos).
- **No romper CSV CENASA:** no se tocó `ExportCSV.tsx`.
- **Nota:** el formato exacto del TXT de SIGSA queda marcado como "beta" en `buildSenasaTxt` hasta verificar contra el Manual.
- Fases C, D, E y F quedan fuera de este plan (se planifican en documentos separados).
