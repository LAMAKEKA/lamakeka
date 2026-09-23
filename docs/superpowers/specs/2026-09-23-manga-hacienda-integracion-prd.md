# PRD — Integración Manga ↔ Hacienda ↔ Potreros

**Producto:** La Makeka / Mateca  
**Fecha:** 2026-09-23  
**Estado:** aprobado para implementación (decisiones cerradas abajo)  
**Supersede:** cierra `2026-08-13-manga-hacienda-integracion-design.md`  
**Contexto dueño:** `2026-09-23-reunion-dueno-mateca.md`  
**Plan de build:** `../plans/2026-09-23-manga-hacienda-integracion.md`

---

## 1. Problema

Hoy hay **dos verdades** del rodeo:

| Mundo | Tabla | Qué sabe |
|-------|--------|----------|
| Manga / SENASA | `manga_animales` + `registros_manga` | Individuo con EID, ficha, sesión, potrero_id, categoría |
| Hacienda “libreta” | `animales` | Movimientos por **cantidad** (categoría + potrero texto) |
| Potreros | `potreros.cabezas` | Número manual, no ligado a caravanas |

El dueño quiere: **bastón → Mateca → gestión del campo** (no solo CSV SENASA).  
El padre sigue pensando en **cantidades por categoría**; eso no se tira, se integra.

## 2. Objetivo

Una sola representación usable del establecimiento:

1. **Stock actual** por potrero y categoría, derivado de animales individuales cuando existen.
2. **Ficha individual** (EID) visible desde Hacienda y Potreros.
3. **Historial de eventos** del animal (manga + movimientos de hacienda a nivel individuo).
4. **Convivencia** con el flujo libreta (movimientos agregados) para lo que aún no tiene caravana o se carga a mano.
5. **No romper** manga HID, offline, export CENASA/SENASA.

### No-objetivo (esta fase)

- Agricultura, turismo, WhatsApp bot.
- App nativa SPP del bastón.
- Reescribir finanzas/insumos.
- Forzar que el 100% del rodeo tenga EID el día 1.
- Cambiar marca Mateca vs La Makeka.

## 3. Usuarios / actores

| Actor | Necesidad |
|-------|-----------|
| Operador manga (dueño / peón) | Leer caravana, alta/edición, sesión de trabajo |
| Gestor de campo (padre / dueño) | Ver “cuántos hay”, por potrero/categoría, sin EID obligatorio |
| Quien declara SENASA | Listado individual confiable + export |
| Futuro multi-establecimiento | Mismo modelo; RLS ya por establecimiento |

## 4. Decisiones cerradas (NO re-litigar)

### D1 — Fuente de verdad del individuo

**`manga_animales` es el master del animal con identificación electrónica.**  
No se crea una segunda tabla “animales_individuales”. Se renombra en UI a “Animales” / ficha; en DB se mantiene el nombre por ahora (migración de rename = fase posterior opcional).

### D2 — Vínculo potrero / categoría

Ya existe en DB (migración SENASA):

- `manga_animales.potrero_id` → FK `potreros.id`
- `manga_animales.categoria` texto (mismas categorías bovinas)

**Reglas:**

- Alta en manga: **categoría obligatoria** y **potrero obligatorio** cuando el animal entra al stock del campo (excepto estado “sin ubicar” — ver D5).
- Cambio de potrero = **evento de movimiento** (no solo update silencioso), con fecha + usuario.
- `lote` sigue siendo texto libre operativo (no reemplaza potrero).

### D3 — Categoría: explícita, no solo derivada

Categoría **explícita** en ficha (`CATEGORIAS_BOVINOS` en `src/lib/senasa.ts`):

`Terneros | Terneras | Novillos | Novillitos | Vacas | Vaquillonas | Toros`

Sexo + fecha_nacimiento informan, pero **no calculan solos** la categoría en MVP (el campo la define).  
Unificar el check de DB de `animales` (hoy sin Terneras/Novillitos en constraint viejo) con esta lista.

### D4 — Modelo dual de stock (convivencia libreta + EID)

```
Stock visible en Hacienda =
  A) Individuos activos en manga_animales (con potrero + categoría)
  +
  B) Saldo agregado “sin caravana” derivado de movimientos tabla animales
     SOLO para lo que el usuario carga como libreta
```

**MVP más simple y seguro (elegido):**

- **Pestaña / vista “Por animal” (EID):** lista y KPIs **solo** desde `manga_animales` activos.
- **Pestaña / vista “Por cantidad (libreta)”:** el `/hacienda` actual casi intacto (movimientos `animales`).
- **Potreros:**  
  - `cabezas_eid` = COUNT individuos activos con ese `potrero_id` (calculado, no editable).  
  - `cabezas` manual se muestra como “libreta / estimado” o se depreca en UI con label claro; **no borrar columna** aún.

Así el padre no pierde su flujo y el dueño gana el mundo caravana sin mezclar números a ciegas.

> Post-MVP (no ahora): motor de “saldo unificado” con reglas de no doble conteo. Requiere política explícita del dueño.

### D5 — Estados del animal individual

Agregar `manga_animales.estado`:

| estado | Cuenta en stock | Notas |
|--------|-----------------|-------|
| `activo` | sí | default |
| `sin_ubicar` | sí (KPI aparte) | tiene EID, sin potrero |
| `vendido` | no | egreso |
| `muerto` | no | egreso |
| `transferido` | no | salió del establecimiento |
| `baja` | no | genérico |

Movimientos individuales se registran en **`animal_eventos`** (nueva tabla), no reutilizando `animales` agregados.

### D6 — Eventos individuales

Tabla `animal_eventos`:

- `id`, `establecimiento_id`, `animal_id` (FK manga_animales), `eid` (denorm)
- `tipo`: `alta | cambio_potrero | cambio_categoria | venta | muerte | transferencia_salida | observacion | peso | sanidad | prenez | otro`
- `fecha`, `datos` jsonb, `usuario`, `created_by`, `sesion_id` nullable, `registro_manga_id` nullable
- Alta automática al crear animal; cambio potrero/categoría desde ficha o manga; puente opcional desde `registros_manga.datos` en fase 2 del plan

### D7 — Potreros

- Detalle de potrero: **lista de animales activos** (EID, categoría, último peso/sesión si hay).
- KPI cabezas EID = count.
- Mapa sin cambios estructurales.
- Historial de potrero: puede alimentarse luego de `animal_eventos` tipo `cambio_potrero`; MVP puede mostrar solo lista actual.

### D8 — SENASA / CENASA

- No tocar columnas del export actual salvo bugs.
- Filtros SENASA: solo `estado in (activo, sin_ubicar)` salvo que el export pida históricos (entonces toggle).
- Formato TXT SIGSA sigue “beta” hasta validación manual.

### D9 — Responsable / auditoría

- `created_by` / `updated_by` en cambios de ficha cuando falte.
- Reutilizar `audit_log` para updates de `manga_animales` (como hacienda libreta).
- `animal_eventos.usuario` = nombre legible (patrón manga).

### D10 — Multi-establecimiento

Todo filtrado por `establecimiento_id`. No hardcodear un solo estab en queries nuevas (el código actual a veces hace `.limit(1)` — las piezas nuevas no deben empeorar eso; fix global = deuda aparte).

## 5. User stories (testables)

### US1 — Stock por caravana en Hacienda

Como gestor, en `/hacienda` veo pestaña **“Por animal”** con:

- total activos, por categoría, por potrero
- búsqueda por EID / VID
- click → ficha

**AC:** con N animales activos en DB, los KPIs coinciden con `COUNT(*)` filtrado; sin EID en libreta no aparecen acá.

### US2 — Ficha del animal

Desde hacienda o potrero abro ficha: datos master + potrero + categoría + estado + últimos registros manga + timeline de `animal_eventos`.

**AC:** editar potrero genera evento `cambio_potrero` y actualiza stock del potrero origen/destino.

### US3 — Potrero con lista real

En `/potreros`, al entrar a un potrero (o expandir), veo animales EID de ese `potrero_id` y el número de cabezas EID.

**AC:** mover un animal en ficha saca de la lista A y entra en B sin refresh manual roto (refetch al cerrar modal / realtime opcional no requerido).

### US4 — Manga alimenta stock

Alta en manga con potrero+categoría → el animal aparece en hacienda “Por animal” y en el potrero.

**AC:** sin categoría o sin potrero → queda `sin_ubicar` y aparece en KPI “sin ubicar”, no en un potrero inventado.

### US5 — Libreta intacta

Pestaña **“Por cantidad”** permite el flujo actual de ingresos/ventas/muertes por cantidad.

**AC:** crear movimiento agregado no crea filas en `manga_animales`.

### US6 — Egreso individual

Desde ficha: marcar vendido / muerto / transferido → sale del stock y deja evento + queda consultable en histórico.

**AC:** no aparece en counts activos; sí en SENASA histórico si se filtra.

### US7 — Sesión de manga no rompe

Flujo HID + sesión + offline + export CSV manga sigue igual.

**AC:** `npm test` / lint / typecheck verdes; smoke manga con EID manual.

## 6. Requisitos numerados

### P0

| ID | Requisito |
|----|-----------|
| R1 | Migración: `manga_animales.estado` + check + default `activo`; backfill. |
| R2 | Migración: tabla `animal_eventos` + RLS espejo de manga + índices `(establecimiento_id, animal_id, fecha)`. |
| R3 | Al create/update animal en manga: escribir eventos alta / cambio_potrero / cambio_categoria. |
| R4 | Hook `useHaciendaAnimales` (o similar): listar/filtrar/contar desde `manga_animales`. |
| R5 | UI Hacienda: tabs `Por animal` \| `Por cantidad` \| `Preñez` (preñez puede quedar como hoy). |
| R6 | UI ficha animal reutilizable (drawer/página) consumible desde hacienda y potreros. |
| R7 | Potreros: cabezas EID calculadas + lista de animales del potrero. |
| R8 | Egreso individual (estado + evento). |
| R9 | Categoría y potrero requeridos para pasar de `sin_ubicar` → `activo` “ubicado”. |
| R10 | Tests unitarios de helpers de stock (counts, filtros estado). |
| R11 | No regresión manga/SENASA export. |

### P1

| ID | Requisito |
|----|-----------|
| R12 | Timeline unificado en ficha (eventos + últimos registros_manga). |
| R13 | Desde registro manga, si `datos` trae peso/vacuna, opcionalmente espejo a `animal_eventos` (sanidad/peso). |
| R14 | Audit_log en update de manga_animales. |
| R15 | Reportes: card “stock EID por categoría”. |
| R16 | Unificar constraint categorías en tabla `animales` con `CATEGORIAS_BOVINOS`. |

### P2

| ID | Requisito |
|----|-----------|
| R17 | Saldo unificado libreta+EID con reglas anti-doble-conteo (requiere taller con dueño). |
| R18 | Preñez a nivel individuo. |
| R19 | Rename DB `manga_animales` → `animales_eid` (cosmético). |
| R20 | Realtime stock. |

## 7. Modelo de datos (delta)

```text
manga_animales
  + estado text not null default 'activo'
  + updated_at timestamptz (si no existe)
  + updated_by uuid null
  (ya tiene potrero_id, categoria, …)

animal_eventos (nueva)
  id uuid pk
  establecimiento_id uuid not null
  animal_id uuid not null → manga_animales
  eid text not null
  tipo text not null
  fecha date not null default current_date
  datos jsonb not null default '{}'
  usuario text
  created_by uuid
  sesion_id uuid null
  registro_manga_id uuid null
  created_at timestamptz default now()
```

**Vista opcional (P1):** `v_stock_por_potrero_categoria`  
`select potrero_id, categoria, count(*) from manga_animales where estado in ('activo','sin_ubicar') group by 1,2`

## 8. Flujos

### Alta por bastón (ya existe, se endurece)

```
HID EID → ¿existe?
  no → CrearAnimalForm (sexo, categoría*, potrero*, …)
      → insert manga_animales estado=activo|sin_ubicar
      → animal_eventos.alta
  sí → ficha + FormularioDinamico sesión
      → registros_manga
```

### Cambio de potrero

```
Ficha → nuevo potrero_id
  → update manga_animales
  → animal_eventos.cambio_potrero { from, to }
  → KPIs potrero/hacienda al refetch
```

### Egreso

```
Ficha → Vendido|Muerto|Transferido
  → estado=…
  → animal_eventos.venta|muerte|transferencia_salida
  → fuera de counts
```

## 9. UI (alcance)

| Pantalla | Cambio |
|----------|--------|
| `/hacienda` | Tabs; nueva grilla individuos; drawer ficha |
| `/potreros` | Count EID + panel lista animales |
| `/manga` | Validación categoría/potrero; eventos en create/update (sin rediseño grande) |
| `/senasa` | Filtro por estado activo |
| `/reportes` | P1: bloque stock EID |
| Componentes nuevos | `AnimalFichaDrawer`, `HaciendaPorAnimal`, helpers stock |

Estilo: variables existentes (`--color-campo`, etc.), español es-AR, sin rediseño de marca.

## 10. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Doble conteo libreta + EID | Tabs separados en MVP (D4) |
| `potreros.cabezas` desactualizado | Mostrar EID calculado como primario en UI nueva |
| Datos manga sin categoría/potrero | `sin_ubicar` + CTA completar |
| `.limit(1)` establecimiento | No expandir el anti-patrón; documentar deuda |
| Performance lista grande | paginación / search por EID; índice estado+potrero |

## 11. Métricas de éxito (campo propio)

- Sesión de manga de un día queda reflejada en hacienda “Por animal” sin Excel.
- Padre puede seguir cargando cantidades en “Por cantidad”.
- Potrero X muestra la lista que el dueño espera al terminar la manga.
- Cero regresiones en export SENASA del set de prueba.

## 12. Orden de build

Ver plan: `docs/superpowers/plans/2026-09-23-manga-hacienda-integracion.md`

Resumen:

1. Migración estado + eventos  
2. Helpers + tests stock  
3. Escritura de eventos desde manga hooks  
4. UI Hacienda por animal + ficha  
5. UI Potreros lista/count  
6. Egresos + SENASA filtro  
7. P1 timeline / reportes / audit  

## 13. Prompt maestro (retomar)

```text
Trabajá en ~/Documentos/La Makeka (remote LAMAKEKA/lamakeka, cuenta lamakeka2026).
Leé y ejecutá:
- docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md
- docs/superpowers/plans/2026-09-23-manga-hacienda-integracion.md
Decisiones D1–D10 están CERRADAS. No reabras dual-stock unificado (es P2).
Stack: Next 16 + Supabase cloud + Tailwind 4. npm test/lint/typecheck.
No rompas /manga HID ni export SENASA/CENASA.
Commits chicos feat:/fix:. Español es-AR en UI.
```
