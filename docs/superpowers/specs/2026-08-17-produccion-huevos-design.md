# La Makeka — Producción de huevos (Fase 3)

Fecha: 2026-08-17
Estado: aprobado (brainstorming cerrado con el productor)
Padre: `docs/superpowers/specs/2026-08-17-oficial-produccion-turismo-design.md`

## Objetivo

Que el productor cargue la producción diaria de huevos por lote, lleve el plantel de
gallinas y vea postura y mortalidad. Turismo queda para un ciclo posterior.

## Decisiones

| # | Tema | Decisión |
|---|------|----------|
| 1 | Alcance v1 | Lotes + carga diaria + merma + movimientos + métricas de postura/mortalidad + pestaña Reportes + categorías Finanzas. |
| 2 | Costo/huevo y margen | **Fuera de esta versión.** Las categorías de Finanzas se agregan para etiquetar; no alimentan métricas. |
| 3 | Unidad de carga | Solo **maples de 30 huevos**. No hay cajón. |
| 4 | Merma | **Obligatoria**, en huevos sueltos. `0` es válido. Vacío o negativo no guarda. |
| 5 | UI | Una página `/produccion`, mismo patrón que Hacienda. Ítem nuevo en el menú. |
| 6 | Turismo | No se implementa en este ciclo. |
| 7 | Hacienda / Manga / SENASA | No se tocan. |

## Fuera de alcance

- Costo por huevo, margen, costo mensual por lote.
- Cajones u otras conversiones.
- Edición offline / cola IndexedDB.
- WhatsApp, dashboard cards de producción (salvo que Reportes ya las cubra).
- Módulo Turismo.

## Modelo de datos

Misma tenencia que el resto: `establecimiento_id` + RLS
(`establecimiento_id IN (SELECT id FROM establecimientos WHERE user_id = auth.uid())`).
Soft-delete con `deleted_at timestamptz` (null = vivo).

### `lotes_gallinas`

| Columna | Tipo | Reglas |
|---------|------|--------|
| id | uuid PK | `gen_random_uuid()` |
| establecimiento_id | uuid FK | → `establecimientos.id` ON DELETE CASCADE, NOT NULL |
| nombre | text | NOT NULL, trim no vacío |
| cantidad | integer | NOT NULL, `>= 0` — plantel actual |
| galpon | text | opcional |
| fecha_alta | date | NOT NULL, default `CURRENT_DATE` |
| activo | boolean | NOT NULL, default true |
| deleted_at | timestamptz | null = vivo |
| created_at / updated_at | timestamptz | default `now()` |

Índice: `(establecimiento_id)` donde `deleted_at IS NULL`.

### `produccion_huevos`

| Columna | Tipo | Reglas |
|---------|------|--------|
| id | uuid PK | |
| establecimiento_id | uuid FK | NOT NULL |
| lote_id | uuid FK | → `lotes_gallinas.id` ON DELETE RESTRICT |
| fecha | date | NOT NULL |
| maples | integer | NOT NULL, `>= 0` |
| merma | integer | NOT NULL, `>= 0` — huevos sueltos |
| observaciones | text | opcional |
| created_at / updated_at | timestamptz | |

Unique: `(lote_id, fecha)` — un registro por lote por día.
Índice: `(establecimiento_id, fecha DESC)`.

No se persiste `huevos`. Siempre `huevosVendibles = maples * 30`.

### `movimientos_gallinas`

| Columna | Tipo | Reglas |
|---------|------|--------|
| id | uuid PK | |
| establecimiento_id | uuid FK | NOT NULL |
| lote_id | uuid FK | → `lotes_gallinas.id` ON DELETE RESTRICT |
| tipo | text | CHECK `alta` / `muerte` / `venta` |
| cantidad | integer | NOT NULL, `> 0` |
| fecha | date | NOT NULL |
| motivo | text | opcional |
| created_at | timestamptz | |

La app aplica el movimiento en dos writes (insert movimiento + update cantidad), en este orden:

1. Leer `cantidad` actual del lote.
2. Calcular `nueva = alta ? cantidad+n : cantidad-n`. Si `nueva < 0`, no escribir nada y mostrar error.
3. `UPDATE lotes_gallinas.cantidad = nueva` y `INSERT movimientos_gallinas`.

No hay RPC ni trigger. Condición de carrera entre dos pestañas se acepta en v1.

## Constantes

```ts
export const HUEVOS_POR_MAPLE = 30;
export type TipoMovimientoGallina = "alta" | "muerte" | "venta";
```

`maplesToHuevos(n) = n * 30`. Enteros, no decimales.

## Métricas

Período = filtro de fechas de Reportes (default: mes actual). Plantel del lote = `lotes_gallinas.cantidad` al momento del cálculo (snapshot actual, no histórico).

- **Huevos vendibles** = `sum(maples) * 30`
- **Merma** = `sum(merma)`
- **Huevos puestos** = vendibles + merma
- **Postura** (huevos/gallina/día) = `huevosPuestos / plantel / diasDelPeriodo` si `plantel > 0` y `dias > 0`; si no, `null` (mostrar "—", no 0).
- **Mortalidad** = `sum(movimientos.cantidad where tipo='muerte') / plantelInicial` donde `plantelInicial = plantelActual + muertes + ventas - altas` del período. Si `plantelInicial <= 0`, `null`.

Costo/huevo y margen: no calcular, no mostrar.

## UI

### Menú

Nuevo ítem primario: `{ href: "/produccion", label: "Producción" }` con ícono `Egg` de lucide, entre Hacienda y Potreros. Active = `pathname === href` o `pathname.startsWith("/produccion")`.

### Página `/produccion` (client, auth via proxy)

Mismo look que Hacienda/SENASA: CSS vars `--color-campo`, `--color-cuero`, `--color-tierra`, `--color-pampa`; estilos inline; textos es-AR; fechas `dd/mm/yyyy`.

1. **Lotes** — cards: nombre, galpón, N gallinas, postura 7 días. Acciones: Nuevo lote, Editar, Desactivar (`activo=false`). Lotes inactivos no aparecen en el selector de carga.
2. **Carga del día** — lote (select activos), fecha (default hoy), maples (integer ≥0), merma (integer ≥0, required), observaciones. Submit.
   - Si ya existe `(lote_id, fecha)`: diálogo "Ya hay carga para este lote en esa fecha. ¿Reemplazar?" → UPDATE o cancelar.
3. **Historial** — tabla: fecha, lote, maples, huevos (`maples*30`), merma. Más reciente primero.
4. **Movimientos** — form: lote, tipo, cantidad, fecha, motivo. Lista reciente. Rechazo explícito si plantel quedaría negativo.

### Reportes

Nueva pestaña `produccion` ("Producción") en `src/app/reportes/page.tsx`. Lee `lotes_gallinas`, `produccion_huevos`, `movimientos_gallinas`. Muestra postura, mortalidad, maples y merma del período. Sin costo/margen.

### Finanzas (solo categorías)

Agregar, sin lógica extra:

- Ingresos: `"Venta de huevos"`
- Gastos: `"Alimentación aves"`, `"Sanidad aves"`

Colores en `CAT_COLORS` / `CAT_PIE_COLORS`. No crear movimientos automáticos.

## Errores (copy)

| Caso | Mensaje |
|------|---------|
| Merma vacía | "La merma es obligatoria. Si no hubo, poné 0." |
| Merma o maples no entero / negativo | "Maples y merma tienen que ser números enteros de 0 en adelante." |
| Lote inactivo | "Ese lote está desactivado." |
| Plantel negativo | "No hay tantas gallinas en el lote." |
| Nombre de lote vacío | "El lote necesita un nombre." |
| Error de red | "No se pudo guardar. " + `error.message` |

## Archivos previstos

- Create: `supabase/migrations/20260817010000_produccion_huevos.sql`
- Create: `src/lib/produccion.ts` — constantes + `maplesToHuevos` + postura + mortalidad
- Create: `src/lib/produccion.test.ts`
- Create: `src/hooks/useProduccion.ts` — fetch/create/update lotes, producción, movimientos
- Create: `src/app/produccion/page.tsx`
- Modify: `src/components/sidebar.tsx` — nav item
- Modify: `src/app/reportes/page.tsx` — tab Producción
- Modify: `src/app/finanzas/page.tsx` — categorías + colores

## Tests (vitest)

`src/lib/produccion.test.ts`:

- `maplesToHuevos(0) === 0`, `maplesToHuevos(4) === 120`
- Postura con plantel 0 o días 0 → `null`
- Postura: 2 maples + 10 merma, 20 gallinas, 1 día → `(60+10)/20/1 = 3.5`
- Mortalidad con plantelInicial ≤ 0 → `null`
- Mortalidad: plantel actual 90, 5 muertes, 0 ventas, 0 altas → `5/95`

Verificación extra: `npm run lint` + `npm run typecheck` (o `npm test` + lint del CI).

## Relación con el roadmap padre

Cubre el sub-proyecto **D. Producción** del spec 2026-08-17, con estas precisiones:

- Unidad = maple 30 (el padre decía `unidad` libre).
- Merma obligatoria en unidades.
- Costo/huevo y margen diferidos (el padre los listaba; esta fase no los implementa).
- Turismo (E) y Hacienda-desde-caravanas (C) no entran.
