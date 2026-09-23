# Mateca / La Makeka — Resumen reunión con dueño del campo

Fecha de captura: 2026-09-23  
Fuente: reunión oral con dueño del establecimiento (transcripción resumida)  
Estado: contexto de producto / base de proyecto

> Nota de naming: en código y UI el producto vive hoy como **La Makeka**. En la reunión se habló de **Mateca**. Tratarlos como el mismo producto hasta decisión formal de marca.

---

## 1. Visión general

Mateca apunta a ser una **plataforma integral** de gestión de establecimientos rurales:

1. Que funcione bien en el campo propio.
2. Probarla en condiciones reales.
3. Dársela a amigos/conocidos con campo.
4. Feedback real → iterar.
5. Eventualmente ofrecerla como servicio.

Tipos de establecimiento a soportar (módulos configurables, no rígidos):

- Ganadero
- Agrícola
- Agrícola-ganadero
- Producción de huevos
- Otras producciones a futuro

## 2. Problema actual (flujo legacy)

- No se usa bastón lector en producción hoy.
- Trabajo en manga + registro a **papel / libreta**.
- Histórico del padre: cantidades y categorías (terneros, vaquillonas, vacas…).
- Objetivo: reemplazar progresivamente papel/libreta por datos estructurados.

## 3. Identificación electrónica

SENASA exige identificación electrónica individual.

- Caravana tradicional + caravana/botón electrónico.
- El chip trae **identificador** (EID); el resto vive en el sistema:
  sexo, raza, nacimiento, info reproductiva, peso, potrero, observaciones, etc.

## 4–6. Bastón lector y sesiones

Flujo deseado: **Animal → bastón → ID → Mateca → ficha**.

- Bluetooth / modo **HID** (como teclado / barcode).
- Preferencia: probar bastón **directo a teléfono** (aún no probado en campo).
- Próximo experimento físico: traer bastón, mapear BT/HID, formato de datos, sesiones, archivos exportados.

Concepto de **sesión** (ej. “Vacunación agosto”):

1. Crear sesión  
2. Trabajar en manga  
3. Leer animales  
4. Asociar IDs  
5. Cargar/modificar datos  
6. Cerrar trabajo  
7. Archivo del bastón (si aplica) → Mateca  
8. Gestión interna y/o SENASA  

## 7–9. Alta, usos posteriores, trazabilidad

- Primera lectura: alta completa (EID + obligatorios SENASA + útiles del campo).
- Lecturas siguientes: reconocer animal y **actualizar** (peso, vacunas, preñez, tratamientos, movimientos, potrero…).
- Trazabilidad: origen, establecimientos, potreros, tratamientos, genética, destino, frigorífico; reportes SENASA desde Mateca.

## 10–13. Hacienda, ficha, categorías, potreros

**Prioridad #1: Hacienda.**

- Animales, categorías, potreros, cabezas por potrero, responsable/cargador, historial de cambios, info reproductiva, EID.
- Categorías productivas reales (no solo “vaca” genérica): ternero, vaquillona, vaca, etc.
- Potreros: nombre, ha, estado, cabezas, desde cuándo, descanso, mantenimiento, GPS/mapa, historial.

## 14–15. Finanzas e insumos

**Finanzas: prioridad alta.** Ingresos/egresos, concepto, categoría, monto, fecha, IVA/sin IVA → métricas.

**Insumos:** alimentos, sanidad, agrícolas, estructura; stock, unidad, mínimo, alertas.

## 16–18. Agricultura, huevos, tareas

- Agricultura: lotes, siembra, cultivos, fitosanitarios, producción (ampliación post-hacienda).
- Módulo **Producción** adaptable al tipo de establecimiento.
- Huevos: importancia alta pero **no inmediata** (producción aún no arrancó).
- Tareas: existe interés, prioridad **baja** (hoy las hace el padre).

Orden estratégico verbal:

`Hacienda → estabilizar → Agricultura/Huevos → Turismo/otros`

## 19–21. Reportes, RENSPA, benchmark

- Reportes: distribución por categoría, cabezas, finanzas, producción, insumos, indicadores.
- RENSPA: ID de establecimiento/productor; validar estructura administrativa antes de cerrar modelo.
- DataFiel / Fiel Data: demo WhatsApp vista; benchmark futuro, no usado.

## 22. Estrategia de producto

| Fase | Foco |
|------|------|
| 1 | Resolver el propio campo: Hacienda + bastón |
| 2 | Validación con amigos/conocidos |
| 3 | Plataforma rural (agri, insumos, finanzas, producción…) |
| 4 | Servicio de gestión rural |

### En una frase

> Mateca busca convertirse en una plataforma modular de gestión de establecimientos rurales, comenzando por automatizar la identificación, trazabilidad y gestión del ganado mediante un bastón lector, para luego incorporar agricultura, finanzas, insumos y otras actividades productivas.

---

## Cruce con el repo actual (La Makeka) — 2026-09-23

Stack: Next 16 + Supabase cloud · remote `LAMAKEKA/lamakeka` · main con manga/SENASA + producción huevos mergeados.

| Tema reunión | Estado en repo | Notas |
|---|---|---|
| Bastón HID + EID 15 díg | **Hecho (código)** | `useHidCapture`, `/manga`, `POST /api/rfid/scans`, offline IndexedDB. Spec XRS2i aprobado. **Falta prueba física** con el bastón real. |
| Sesiones de manga | **Hecho (código)** | `useSesiones` + registros con `sesion_id` / client_id idempotente. |
| Alta animal por EID + ficha | **Hecho (código)** | `manga_animales` + crear/editar + campos dinámicos. |
| SENASA / RENSPA / export | **Parcial–hecho** | `/senasa`, export CSV/TXT, campos oficiales en manga. Validar formato exacto con uso real. |
| Hacienda | **Parcial (legacy)** | `/hacienda` es **movimientos por cantidad/categoría**, no ficha individual. |
| Manga ↔ Hacienda/Potreros | **Gap crítico** | Spec `2026-08-13-manga-hacienda-integracion-design.md` EN PROGRESO. Hay `potrero_id`/`categoria` en manga post-SENASA, pero hacienda sigue en modelo agregado. |
| Potreros + mapa | **Parcial** | CRUD + leaflet; sin lista individual de animales del potrero como hub de trazabilidad. |
| Finanzas | **Hecho base** | `/finanzas` + categorías (incl. huevos). IVA/métricas finas a validar con dueño. |
| Insumos | **Hecho base** | stock, categorías, movimientos, mínimos. |
| Producción huevos | **Hecho código** | lotes, carga diaria, movimientos, reportes. Reunión lo pone **después** de estabilizar hacienda. |
| Agricultura | **No** | Solo tipo establecimiento + categoría insumos agrícolas. |
| Tareas | **Hecho base / P2** | Alineado a prioridad baja. |
| Reportes | **Parcial** | Hay módulo; falta “estado digital del establecimiento” unificado individual+agregado. |
| WhatsApp bot | **Placeholder** | badge PRONTO; alinea con benchmark DataFiel. |
| Multi-tipo modular | **Parcial** | `establecimientos.tipo` ganadero/agricola/mixto; UI aún “AI · Ganadera”. |
| Prueba en campo / amigos | **No** | Producto aún no validado en manga real. |

### Prioridad de producto alineada a la reunión (no al último feature merge)

1. **P0 — Experimento bastón físico** (HID en teléfono + PC, formato, sesiones/archivos).
2. **P0 — Cerrar integración manga ↔ hacienda ↔ potreros** → PRD + plan 2026-09-23 (ver abajo).
3. **P1 — Hacienda usable en el día a día del campo** (reemplazo papel del padre).
4. **P1 — Finanzas** con visibilidad real de caja del establecimiento.
5. **P2 — Insumos / reportes** pulido.
6. **P3 — Agricultura / turismo**; huevos ya codeados pero **no empujar** hasta estabilizar hacienda si el dueño no arrancó producción.

### Specs de integración (2026-09-23)

- PRD: `docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md`
- Plan P0: `docs/superpowers/plans/2026-09-23-manga-hacienda-integracion.md`
- Brainstorm viejo (superseded): `docs/superpowers/specs/2026-08-13-manga-hacienda-integracion-design.md`

**Decisión de stock (cerrada en PRD D4):** tabs duales en Hacienda — *Por animal (EID)* y *Por cantidad (libreta)* — sin unificar números en MVP.

### Decisiones abiertas (no inventar)

- Marca final: Mateca vs La Makeka.
- Formato exacto archivo bastón / CENASA-SENASA en producción.
- Alcance administrativo RENSPA.
- IVA y plan de cuentas finanzas.
- Post-MVP: motor anti-doble-conteo libreta+EID (requiere taller con dueño).
