# Spec — Datos de campo (agrícola + ganadería) y UI mobile-first

**Producto:** La Makeka / Mateca  
**Fecha:** 2026-10-27  
**Estado:** research + gap (listo para priorizar backlog; **no** es plan de build aún)  
**Fuentes:**
- Agroptima (ISAGRI): home, Software agrícola, Cuaderno de campo, Funcionalidades  
  https://www.agroptima.com/ · /es/software-agricola · /es/cuaderno-de-campo · /es/funcionalidades
- Dominio AR / dueño: `2026-09-23-reunion-dueno-mateca.md`, PRD manga↔hacienda, PRD multi-rubro EST-8
- Código/schema actual: `supabase/migrations/*`, `src/lib/modules/*`, rutas `src/app/*`

**Locks de producto que este doc NO reabre:**
- Mismo repo Next 16 + Supabase cloud (`LAMAKEKA/lamakeka`)
- **No** rewrite React Native / Expo / Nuxt
- Tabs duales libreta + EID (D4)
- Prioridad dueño: **Hacienda + bastón → estabilizar → agri/huevos**
- Multi-rubro por `modules_enabled` (PR #32)

---

## 0. TL;DR

| Pregunta | Respuesta corta |
|----------|-----------------|
| ¿Qué datos “siempre” necesita un campo agrícola? | Parcelas/lotes + labores + insumos/fitos + stock + costes + cumplimiento (cuaderno) + offline |
| ¿Y un ganadero AR? | Rodeo (libreta y/o EID) + potreros + sanidad/repro + movimientos + SENASA + finanzas/insumos + offline manga |
| ¿Qué tiene Makeka hoy? | Ganadería **fuerte** (manga/EID/SENASA/hacienda dual/potreros); agri **MVP lotes**; finanzas/insumos genéricos; offline **solo manga** |
| ¿Rediseño con RN/Nuxt? | **No.** Evolucionar shell Next mobile-first (tokens + cards + densidad) |
| Siguiente paso útil | Priorizar **capa de datos** (entidades faltantes) en 2–3 PRs chicos **después** de estabilizar hacienda; UI visual en paralelo sin tocar dominio |

---

## 1. Benchmark Agroptima (agrícola, UE/ES — traducir a AR)

Agroptima es **software agrícola en la nube + app móvil offline**. No es ganadero. Pilares de producto (marketing + páginas de solución):

### 1.1 Roles que conecta
- **Campo:** partes de trabajo / labores en pocos clics, offline
- **Oficina/admin:** recibe partes al instante, evita papeles tardíos con error
- **Gerencia:** costes reales por cultivo/campaña, no decisiones a ciegas

### 1.2 Entidades de datos que “siempre” aparecen

| Dominio | Datos mínimos | Notas Agroptima |
|---------|---------------|-----------------|
| **Explotación** | nombre, ubicación, campaña | multi-cultivo: horto, viña, olivar, cereales, servicios |
| **Parcelas / campos** | polígono o import (Excel/Shapes), superficie, código catastral/SIGPAC, cultivo, variedad, agrupación | mapa coloreado por cultivo/PAC/variedad |
| **Labores / partes** | fecha, parcela, tipo labor (siembra, abono, fito, cosecha…), dosis, producto, trabajador(es), máquina, tiempo, observaciones | base del cuaderno + coste |
| **Productos** | catálogo fitos/fertilizantes, caducidad, dosis por cultivo, stock almacén | BD MAPAMA + alertas legales |
| **Trabajadores** | identidad, tiempos, cuadrillas | rendimiento kg/h, costes mano de obra |
| **Maquinaria** | equipo, horas, asignación a labor | coste horario |
| **Stock almacén** | entradas/salidas automáticas desde labores | planificación compras |
| **Costes** | € por labor → rollup por parcela/cultivo/campaña; €/kg; margen pre-cosecha | “cuánto llevo invertido antes de cosechar” |
| **Cumplimiento** | Cuaderno de Explotación (CUE/SIEX), cuaderno fertilización, GlobalGAP/Eco | export oficial 1 clic |
| **Offline** | app completa sin cobertura + sync | claim fuerte de producto |
| **Analytics** | filtros, informes, calendario cultivos | gerencia |

### 1.3 Qué **no** copiar ciego a Makeka AR
- SIGPAC / MAPAMA / CUE-SIEX = **España/UE**. En AR el análogo normativo es otro (SENASA ganadero; agrícola = AFIP/SENASA agroquímicos / registros provinciales — **validar con dueño**, no inventar).
- App nativa stores: Makeka ya opera **PWA/browser + HID** en celu; nativa no es requisito de datos.
- Precisión satelital / NDVI / riego por sensores: **nice-to-have P3**, no “dato siempre”.

### 1.4 Traducción AR de “dato siempre” agrícola

| Need universal | Nombre Makeka sugerido | MVP vs luego |
|----------------|------------------------|--------------|
| Unidad espacial de cultivo | `lotes_agricolas` (ya) + opcional polígono/GPS | MVP: ficha; P1: mapa |
| Campaña / zafra | `campania` o año en lote | P1 |
| Labor / parte de trabajo | **`labores_agricolas`** (no existe) | **P1 datos** |
| Producto aplicado + dosis | catálogo insumos (existe genérico) + link labor | P1 |
| Stock que baja al aplicar | `insumos_movimientos` (existe) atado a labor | P1 |
| Cosecha / rendimiento | `cosechas` o labor tipo cosecha + kg/ha | P1–P2 |
| Coste por lote/cultivo | `gastos` con `lote_id` / tag | P1 |
| Cuaderno exportable | vista/export PDF-Excel de labores+insumos | P2 compliance |
| Offline labores | extender IndexedDB más allá de manga | P2 |
| Personal / máquinas | tablas livianas o campos en labor | P2 |

---

## 2. Ganadería — datos que “siempre” necesita el productor (AR + líderes)

Prioridad dueño ya alineada. Capas:

### 2.1 Identidad del establecimiento
| Campo | Makeka hoy | Gap |
|-------|------------|-----|
| Nombre, ubicación, tipo | `establecimientos` | OK |
| RENSPA | col `renspa` | UI/validación incompleta |
| Rubros / modules | `rubros`, `modules_enabled` | OK post #32 |
| Branding | `nombre_display`, `logo_url`, `tagline` | OK |

### 2.2 Rodeo / stock
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Conteo por categoría×potrero (libreta) | `animales` movimientos | OK dual tab |
| Individuo EID | `manga_animales` + estado stock | OK |
| Categorías productivas | `CATEGORIAS_BOVINOS` + CHECK | historial libreta G8 parcialmente |
| Timeline eventos | `animal_eventos` | OK (best-effort G15) |
| Peso / GDP | evento `peso` en timeline | **UI GDP no** |
| Origen / destino venta | egreso ficha | parcial |
| Trazabilidad frigorífico | — | P2+ |

### 2.3 Espacio / pasturas
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Potrero nombre, ha, estado, cabezas | `potreros` | OK |
| GPS punto | lat/long | OK básico |
| Polígono mapa | leaflet parcial | P1 mapa real |
| Rotación / historial ocupación | historial mock G7 | **P1** `potrero_historial` lib existe tests |
| Carga animal / oferta forrajera | — | P2 |
| Descanso/mantenimiento | estado enum | OK |

### 2.4 Reproducción
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Diagnóstico preñez por lote/categoría | `prenez` agregada | OK legacy |
| Preñez individual | evento `prenez` | sin calendario partos UI |
| Celos / IA / toro | — | P2 |
| Alertas parto / secado | — | P2 |

### 2.5 Sanidad
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Tratamiento en manga (jsonb / evento) | `registros_manga`, evento `sanidad` | sin calendario vacunas |
| Producto + dosis + retiro | parcial en datos manga_campos | P1 ficha sanidad |
| Alertas próximas dosis | — | P2 |
| Export SENASA | `/senasa` + export | OK camino |

### 2.6 Alimentación
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Stock alimento | `insumos` cat ALIMENTO | OK stock |
| Ración / costo por cabeza | — | P2 |
| Balanceado vs pastura | — | P2 |

### 2.7 Economía
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Ingreso/gasto monto fecha concepto | `gastos` | OK flat |
| Margen por lote animal / potrero | — | P1 tags `ref_id` |
| IVA | reunión lo pide | **gap col** |
| Reportes PDF/Excel | `/reportes` + xlsx | parcial |

### 2.8 Operación campo
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Offline manga + cola sync | `offlineDb` IndexedDB | **solo manga** |
| HID bastón | `useHidCapture` | prueba física P0 campo |
| Roles (admin/peón/vet) | 1 user/estab | P2 multi-user |
| Tareas | `tareas` | prioridad baja dueño |

### 2.9 Cumplimiento AR
| Need | Makeka hoy | Gap |
|------|------------|-----|
| Stock filtrado SENASA | `/senasa` | OK |
| Export CSV/CENASA path | `senasaExport` | no inventar TXT SIGSA final |
| DTE / guías | — | P2 externo |

---

## 3. Inventario Makeka actual (código = verdad)

### 3.1 Módulos (`src/lib/modules/registry.ts`)

| id | Ruta | Rubro | Madurez datos |
|----|------|-------|---------------|
| inicio | `/` | core | dashboard |
| manga | `/manga` | ganadería | **alto** (EID, HID, offline, registros) |
| hacienda | `/hacienda` | ganadería | **alto** dual |
| potreros | `/potreros` | ganadería | medio-alto |
| senasa | `/senasa` | ganadería | medio-alto |
| produccion_huevos | `/produccion` | huevos | alto Makeka-only |
| agricola | `/agricola` | agrícola | **bajo** (CRUD lotes) |
| insumos | `/insumos` | core | medio |
| finanzas | `/finanzas` | core | medio flat |
| reportes | `/reportes` | core | medio |
| tareas | `/tareas` | core | bajo-medio |
| whatsapp | `/whatsapp` | core | placeholder |

Defaults: `GANADERO_GENERIC` sin huevos; `AGRICOLA_GENERIC` = agri+core; `MIXTO` = gana+agri; `MAKEKA_LEGACY` = gana+huevos.

### 3.2 Tablas núcleo (schema)

**Core / tenant**
- `profiles`, `establecimientos` (+ platform cols EST-8), `audit_log`, `tareas`

**Ganadería**
- `animales` (libreta cantidad)
- `manga_animales` (EID individuo + potrero_id, categoria, estado, SENASA cols)
- `registros_manga`, `manga_campos`
- `animal_eventos`
- `potreros`
- `prenez` (agregada)

**Agrícola**
- `lotes_agricolas` — nombre, cultivo, ha, estado, fecha_siembra, notas  
  **Sin:** labores, cosecha, polígono, campaña, fitos link

**Huevos (Makeka)**
- `lotes_gallinas`, `produccion_huevos`, `movimientos_gallinas`

**Economía / stock**
- `gastos` (ingreso|gasto flat)
- `insumos`, `insumos_movimientos`

### 3.3 Offline
- Solo `manga-offline` (animals cache + pending scans).  
- Labores agri, finanzas, libreta: **online-only**.

---

## 4. Gap matrix — “dato siempre” vs Makeka

Leyenda: ✅ hay · 🟡 parcial · ❌ no · 🔒 fuera de scope cercano

### 4.1 Agrícola

| Dato siempre | Estado | Acción sugerida |
|--------------|--------|-----------------|
| Lote / parcela ficha | ✅ | enriquecer (campaña, variedad, riego tipo) |
| Mapa polígono | 🟡 potreros GPS | P1 leaflet draw lotes |
| Labores / partes | ❌ | **tabla `labores_agricolas` + UI** |
| Fitos/ferti oficiales AR | ❌ | P2 catálogo; MVP = texto libre + insumo_id |
| Stock link labor | 🟡 insumos sueltos | al guardar labor → movimiento |
| Coste por lote | 🟡 gastos sin FK | `gastos.ref_tipo/ref_id` |
| Cosecha kg/ha | ❌ | labor tipo cosecha o tabla |
| Cuaderno export | ❌ | P2 export desde labores |
| Offline agri | ❌ | P2 queue genérica |
| Satélite / riego IA | 🔒 | no MVP |

### 4.2 Ganadería

| Dato siempre | Estado | Acción sugerida |
|--------------|--------|-----------------|
| Stock libreta + EID | ✅ dual | no unificar (D4) |
| Ficha animal + eventos | ✅ | sanidad/peso UX |
| Potreros + counts | ✅ | historial real |
| SENASA export | 🟡 | validar con dueño archivo |
| Repro calendario | 🟡 prenez | partos/alertas P2 |
| Sanidad calendario | 🟡 eventos | vacunas programadas P1–P2 |
| GDP automático | ❌ | desde eventos peso |
| Coste por animal/lote | 🟡 | same ref_id pattern |
| Offline manga | ✅ | no romper |
| HID real | 🟡 código | prueba física |
| Multi-rol peón/vet | ❌ | P2 |
| RFID BT GATT | 🔒 | XRS2i = HID wedge |

### 4.3 Transversal

| Dato siempre | Estado | Acción |
|--------------|--------|--------|
| Offline genérico | 🟡 | abstraer cola post-manga |
| Roles | ❌ | P2 |
| Multi-campo/user | ❌ UNIQUE user | P2 |
| Precios mercado | 🔒 | no |
| WhatsApp bot | 🔒 PRONTO | EST futuro |

---

## 5. Modelo de datos target (propuesta, no implementado)

Orientativo para futuras migraciones. **No aplicar sin plan task + PR.**

### 5.1 Agrícola P1

```text
lotes_agricolas  (existente)
  + campania text|int
  + variedad text
  + geom jsonb | polygon opcional
  + fecha_cosecha_est date

labores_agricolas
  id, establecimiento_id, lote_id
  fecha, tipo  -- siembra|fertilizacion|fitosanitario|riego|cosecha|laboreo|otro
  producto_texto, insumo_id nullable
  dosis numeric, unidad text
  cantidad_aplicada numeric
  superficie_ha numeric
  responsable text
  maquina text nullable
  horas numeric nullable
  costo_asociado numeric nullable  -- o se deriva de gastos
  notas, created_by, created_at

cosechas (opcional si no cabe en labor tipo=cosecha)
  lote_id, fecha, kg_totales, humedad, destino, precio_ref
```

### 5.2 Finanzas P1 (ambos rubros)

```text
gastos
  + ref_tipo text null  -- lote|animal|potrero|labor|general
  + ref_id uuid null
  + incluye_iva boolean default false
  + moneda text default 'ARS'
```

### 5.3 Ganadería P1–P2 (sin romper dual stock)

```text
-- ya: animal_eventos.tipo incluye peso|sanidad|prenez
-- UI: calendario desde eventos; GDP = delta peso / días

potrero_ocupacion_eventos  -- o madurar potreroHistorial.ts → tabla
  potrero_id, fecha_desde, fecha_hasta, cabezas_libreta, count_eid, categoria
```

### 5.4 Offline P2

```text
offline_queue genérica
  entity, payload, client_id, sync_state
  -- manga scans migran o conviven
```

---

## 6. UI / diseño — mobile-first “más actual” **sin** RN/Nuxt

### 6.1 Decisión (locked con skill + EST-8)

| Opción | Verdict |
|--------|---------|
| React Native / Expo rewrite | **No** — HID wedge + offline manga ya en browser; costo 6–12 meses |
| Nuxt.js | **No** — stack es Next 16; no segundo framework |
| “RN con Next” | No existe como producto único; confusión de marketing |
| Next PWA + shell actual | **Sí** — evolucionar |
| Capacitor wrapper opcional | Solo si dueño exige icono store **después** de PWA estable |

### 6.2 Qué tiene hoy (base buena)
- Next 16 + React 19 + Tailwind 4
- Tokens Makeka: cuero / pampa / campo / tierra (`globals.css`)
- `app-shell` + `mobile-bottom-nav` (Inicio · Hacienda · Manga · Potreros · Más)
- hits ≥48px, safe-area, inputs 16px anti-zoom iOS
- radix-slot + cva parcial (camino shadcn-lite)

### 6.3 Rediseño visual recomendado (misma app)

**Principios campo 2026 (celu con guantes / sol):**
1. **Una acción primaria** por pantalla (FAB o bottom CTA sticky)
2. **Cards > tablas** en `< md`; tablas solo desktop o horizontal scroll consciente
3. **Densidad táctil:** filas 56–64px, iconos 24, contraste WCAG en sol (evitar gris 55% sobre pampa)
4. **Empty states** con CTA (“Cargar primer lote”) no pantallas muertas
5. **Status chips** (activo / sin ubicar / en curso) consistentes
6. **Skeleton** en fetch, no spinners eternos
7. **Bottom nav** max 5; el resto en Más (ya)
8. **Modo campo:** respetar `themeColor` / posible high-contrast toggle P2

**Patrones de pantalla:**
- Home: KPIs 2×2 (cabezas stock, alertas, ha, caja mes) + atajos módulos enabled
- Listados: search sticky + filtros chips horizontales + card row
- Ficha: header identidad + tabs (Datos | Eventos | $$)
- Alta rápida manga: full-screen wizard 1 campo grande por paso si hace falta
- Agrícola: kanban simple por estado lote o lista + drawer labor

**Stack UI incremental (sin big-bang):**
1. Completar primitives shadcn-style ya empezadas (`Button`, `Card`, `Badge`, `Sheet`, `Input`)
2. Unificar páginas que aún traen estilos inline ad-hoc (agricola, partes de hacienda)
3. Opcional: `vaul` drawers mobile, `sonner` toasts
4. PWA manifest + install prompt cuando offline genérico exista
5. **No** meter MUI/Chakra/Ant — pelean con tokens Makeka

### 6.4 Look reference (inspiración, no clonar)
- Agroptima: mapa + partes simples + offline badge
- Linear/Vercel density **no** es el target de campo; mejor **iOS Settings + Notion mobile + farm apps** (pocos colores, mucho padding, CTA verde/cuero)
- Mantener identidad pampa/cuero (diferenciador vs apps EU azul)

---

## 7. Priorización sugerida (post-estabilizar hacienda)

Orden alineado dueño + gaps de datos:

| Fase | Qué | Por qué |
|------|-----|---------|
| **0** | Smoke hacienda+manga+HID físico + cloud migrations | Ya es P0 producto |
| **A** | UI polish shell (cards listados, FAB, tokens unificados) | Valor percibido sin schema |
| **B** | `gastos` con ref + IVA flag | finanzas “de verdad” agri y gana |
| **C** | `labores_agricolas` + UI en `/agricola` | cierra gap agri #1 vs Agroptima |
| **D** | labor → `insumos_movimientos` auto | stock real |
| **E** | potrero historial real + GDP desde pesos | gana depth |
| **F** | export cuaderno agri simple Excel | compliance light |
| **G** | offline queue genérica | paridad Agroptima claim |
| **H** | calendarios sanidad/repro | P2 |

**No hacer ahora:** satélite, riego IoT, RN, Nuxt, multi-tenant org, WhatsApp bot, unificar stock.

---

## 8. Checklist de campos UI (copy para formularios)

### 8.1 Alta lote agrícola (hoy + next)
- [x] Nombre
- [x] Cultivo
- [x] Hectáreas
- [x] Estado (planificado|en_curso|cosechado|descanso)
- [x] Fecha siembra
- [x] Notas
- [ ] Campaña/zafra
- [ ] Variedad
- [ ] Fecha cosecha est.
- [ ] Mapa/polígono

### 8.2 Alta labor (nuevo)
- [ ] Lote
- [ ] Fecha
- [ ] Tipo labor
- [ ] Producto / insumo
- [ ] Dosis + unidad
- [ ] Superficie tratada
- [ ] Responsable
- [ ] Máquina (opc)
- [ ] Costo (opc)
- [ ] Notas
- [ ] Foto (P2)

### 8.3 Animal EID (hoy — no sacar)
- [x] EID, VID, raza, sexo, nacimiento, lote
- [x] Categoría, potrero, estado
- [x] Eventos: alta, mov, venta, muerte, peso, sanidad, preñez…
- [ ] Próxima vacuna / GDP visible en ficha

### 8.4 Potrero
- [x] Nombre, ha, estado, cabezas, categoría, desde, GPS
- [ ] Historial ocupación persistido
- [ ] Polígono

### 8.5 Gasto/ingreso
- [x] Concepto, categoría, tipo, monto, fecha
- [ ] IVA
- [ ] Vínculo lote/animal/potrero/labor

---

## 9. Open questions (dueño / Martina)

1. ¿Cumplimiento agrícola AR concreto que les duele? (registro agroquímicos provincial, SENASA, auditorías comprador)
2. ¿Labores las carga el peón en el lote o solo oficina?
3. ¿Finanzas necesitan centro de costo por potrero ya, o alcanza mensual flat?
4. ¿Mapa polígonos es must para demo amigos o alcanza lista + GPS punto?
5. ¿PWA “Agregar a inicio” alcanza o quieren ícono Play Store?

---

## 10. Referencias repo

| Doc | Path |
|-----|------|
| Reunión dueño | `docs/superpowers/specs/2026-09-23-reunion-dueno-mateca.md` |
| PRD manga | `docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md` |
| PRD multi-rubro | `docs/superpowers/specs/2026-10-12-plataforma-multi-rubro-prd.md` |
| Modules | `src/lib/modules/registry.ts`, `defaults.ts` |
| Lotes agri | `supabase/migrations/20261013030000_lotes_agricolas.sql` |
| UI shell | `src/components/app-shell.tsx`, `mobile-bottom-nav.tsx` |
| Offline | `src/lib/offlineDb.ts` |

---

## 11. Next actions (cuando digas “dale”)

1. **A — UI only:** PR `feat/ui-mobile-cards-shell` — home + listados hacienda/agricola a cards, sin schema  
2. **B — datos finanzas:** migración `gastos` ref + IVA + UI select vínculo  
3. **C — labores agri:** migración + CRUD en `/agricola` tab Labores  

1 task = 1 branch = 1 PR · preview LAN celu antes de merge UI.
