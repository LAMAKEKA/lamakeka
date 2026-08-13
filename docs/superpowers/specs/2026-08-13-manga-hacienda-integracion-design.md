# Integración manga ↔ hacienda/potreros (diseño EN PROGRESO)

> Estado: brainstorming en curso. Guardado para retomar. Fecha: 2026-08-13.

## Pedido

Papá quiere que los datos de las sesiones de cada animal (que hoy se usan solo para el CSV de CENASA)
también se puedan usar "en el campo", en las secciones de **hacienda** y **potreros**.

## Modelo de datos actual

**Manga (animales individuales con RFID):**
- `manga_animales`: id, establecimiento_id, eid, vid, raza, sexo, fecha_nacimiento, lote
- `registros_manga`: id, establecimiento_id, animal_id, eid, fecha, datos (jsonb), usuario, created_at
- `manga_sesiones`: id, nombre, fecha, usuario
- `manga_campos`: configuración de campos dinámicos (peso_kg, condicion_corporal, estado_sanitario, vacuna, antiparasitario, observaciones, ...)

**Hacienda (conteos agrupados, NO individuales):**
- `animales`: id, establecimiento_id, categoria, potrero (texto), cantidad, fecha, responsable, tipo (Ingreso/Venta/Muerte/Transferencia), deleted
- `potreros`: id, establecimiento_id, nombre, hectareas, estado, cabezas, categoria_animal, desde, latitud, longitud
- `prenez`: datos de preñez

**Diferencia clave:** la manga sabe de **individuos** (EID), la hacienda sabe de **cantidades** por potrero/categoría.
Hoy no hay vínculo entre `manga_animales` y `potreros` / `animales`.

## Decisiones tomadas

1. **Qué ver en hacienda/potreros:** las dos cosas — (a) animales individuales por potrero con su último
   registro de sesión, y (b) resúmenes/estadísticas por potrero y categoría (promedio de peso, estados
   sanitarios, cantidades).

## Preguntas PENDIENTES (siguiente paso al retomar)

1. **Vínculo animal ↔ potrero/categoría:** ¿cómo se asigna cada animal a un potrero?
   Opciones planteadas:
   - a) Agregar campo "potrero" (selector) + "categoría" a `manga_animales` (recomendado).
   - b) Reutilizar el campo `lote` como potrero (mapeo por nombre).
   - c) Asignar potrero en el momento de cargar la sesión.

2. **Formato del CSV CENASA:** confirmar las columnas exactas que exige CENASA para no romper esa exportación.

3. **Categoría de un animal de manga:** hoy la manga guarda `sexo` y `fecha_nacimiento`, no `categoria`.
   ¿Se agrega `categoria` explícita (Terneros/Novillos/Vacas/Vaquillonas/Toros) o se deriva de sexo+edad?

## Posible diseño (borrador, sin aprobar)

- Agregar a `manga_animales`: `potrero_id` (FK a `potreros`) y `categoria`.
- En la vista de **potreros**: mostrar animales individuales de ese potrero + resumen.
- En la vista de **hacienda**: agrupar los animales individuales por categoría/potrero, con resúmenes.
- Mantener intacta la exportación CSV de CENASA.

## Cómo retomar

En opencode, desde este proyecto, decir algo como:
> "Continuá el diseño de integración manga-hacienda. Leé docs/superpowers/specs/2026-08-13-manga-hacienda-integracion-design.md y seguí desde la pregunta 1 pendiente."
