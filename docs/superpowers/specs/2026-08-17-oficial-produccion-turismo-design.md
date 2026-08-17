# La Makeka — Control, gestión y producción integral (roadmap)

Fecha: 2026-08-17
Estado: aprobado (brainstorming cerrado con el productor)

## Objetivo

Que la app sirva para **todo el control, gestión y producción del campo La Makeka**, para tomar
mejores decisiones. Se suma a los módulos existentes (Hacienda, Potreros, Insumos, Tareas,
Finanzas, Reportes, Manga) un conjunto de capacidades nuevas organizadas en 6 sub-proyectos.

## Decisiones tomadas (con el productor)

| # | Tema | Decisión |
|---|------|----------|
| 1 | SENASA | **Caravanas individuales** (SNIT/SIGSA). Preparar datos + exportar archivo (sin conexión directa a SENASA). |
| 2 | Hacienda | **Stock desde caravanas** (fuente única). Potrero se asigna en Manga. |
| 3 | Edición | En Manga, al editar el animal tras escanear (manual, no desde el bastón/lector). |
| 4 | Producción | Full (lotes + producción + costos + métricas). |
| 5 | Turismo | Sección separada en la misma app; arranca con hospedaje/reservas + pagos. |
| 6 | Reportes | Verificar fuentes + agregar pestañas nuevas. |

## Requerimientos SENASA (verificado en fuentes públicas, dic 2025–2026)

Sistema: **SIGSA → Existencias → Dispositivos de Identificación → Nueva Declaración**.

- **RENSPA**: código del establecimiento (al confirmar, SENASA carga los datos del titular).
- **Fecha de aplicación**: día en que se colocaron las caravanas.
- **Motivo de declaración**: asociado a un registro previo en el sistema:
  - Acta de vacunación contra fiebre aftosa
  - Novedad por nacimiento
  - Reinscripción anual al RENSPA (zonas libres sin vacunación)
- **Por dispositivo (animal)**: EID de 15 dígitos + **sexo** + **raza** + **fecha de nacimiento**.
- Modalidades de carga: app SIGBioTraza, carga manual, o **importación de archivo TXT**
  (datos separados con guiones, dispositivos separados con punto y coma). El formato exacto del
  TXT se confirmará contra el "Manual de Declaración de Dispositivos de Identificación
  Electrónica (RFID)" antes de cerrar el exportador.

## Modelo de datos

### Modificaciones a tablas existentes

- `establecimientos`: + `renspa text` (opcional).
- `manga_animales`:
  - + `potrero_id uuid` (FK → `potreros.id`, opcional, cambiable) — ubicación actual.
  - + `categoria text` (opcional; categorías de hacienda).
  - + `fecha_aplicacion date` (opcional) — fecha de colocación de la caravana.
  - + `motivo_declaracion text` (opcional) — ver opciones arriba.

### Tablas nuevas (fases 3 y 4)

Producción (huevos):
- `lotes_gallinas`: id, establecimiento_id, nombre, cantidad, galpon, fecha_alta, activo, deleted.
- `produccion_huevos`: id, establecimiento_id, lote_id, fecha, huevos, merma, unidad, observaciones.
- `movimientos_gallinas`: id, establecimiento_id, lote_id, tipo (alta/muerte/venta), cantidad, fecha, motivo.

Turismo:
- `alojamientos`: id, establecimiento_id, nombre, capacidad, activo.
- `reservas`: id, establecimiento_id, alojamiento_id, fecha_desde, fecha_hasta, huesped, contacto,
  estado (confirmada/pendiente/cancelada), monto, seña, notas.

### Integración financiera

Ventas y costos de producción y turismo se registran en `gastos` (Finanzas) con categorías nuevas
("Venta de huevos", "Turismo", "Alimentación aves", "Sanidad aves", etc.) → una sola foto económica.

## Sub-proyectos

### A. SENASA / oficial

- Campos oficiales (fecha aplicación, motivo) se cargan en **Manga** al editar el animal; el RENSPA
  se configura en el establecimiento.
- Nueva sección **"SENASA"** en el menú: lista caravanas, filtros (fecha aplicación, motivo, estado
  de declaración), validación de EID (15 dígitos), y export **TXT (formato SIGSA)** + CSV legible.
- No mezcla el día a día de Manga con el trámite oficial.

### B. Edición en Manga

- Al escanear, ficha editable del animal: VID, raza, sexo, fecha nacimiento, categoría, potrero,
  fecha de aplicación, motivo. Funciona también para animal ya existente (hoy solo se crea).
- Sigue funcionando offline; los campos nuevos se sincronizan al volver.

### C. Hacienda desde caravanas

- Stock por potrero/categoría se calcula sumando individuos por `potrero_id` + `categoria`.
- Conteo manual residual opcional para animales sin caravana.
- CSV CENASA actual queda intacto.

### D. Producción (huevos)

- Lotes de gallinas + carga diaria de huevos + merma + movimientos (altas/muertes/ventas).
- Métricas: postura (huevos/gallina/día), mortalidad, costo/huevo, margen.
- Pestaña propia en Reportes.

### E. Turismo

- Panel con identidad propia (color/menú separado), mismo login y BD.
- Hospedajes + reservas + cobros que caen en Finanzas.

### F. Reportes

- Hoy cada pestaña lee su tabla correcta (`animales`/`prenez`, `gastos`, `insumos`, `tareas`).
- Cambio clave: la pestaña "hacienda" pasará a leer desde **caravanas** (no conteos).
- Agregar pestañas Producción y Turismo.

## Fases de implementación

1. **B + A** — edición en manga + campos SENASA + RENSPA + export oficial.
2. **C** — hacienda desde caravanas (+ F de hacienda).
3. **D** — producción huevos.
4. **E** — turismo.
5. **F** — cierre de reportes.

Cada fase se especifica y planifica por separado (plan propio). Este documento es el roadmap maestro.

## Notas pendientes (no bloquean)

- Confirmar el **formato exacto del TXT** de SIGSA contra el Manual oficial antes de cerrar el
  exportador (campo por campo y separadores). El TXT está marcado "beta" en `senasaExport.ts`.
- Confirmar el **formato del RENSPA** para validación ligera (se guarda como texto).
- **Edición offline (diferida):** en la Fase 1, la edición de un animal (y el guardado del RENSPA)
  requiere conexión; si falla, se muestra un error explícito (no hay pérdida silenciosa). El cache
  offline ya incluye los campos nuevos para la vista. Queda pendiente una cola de ediciones offline
  (como la que ya existe para escaneos) para una fase futura.
