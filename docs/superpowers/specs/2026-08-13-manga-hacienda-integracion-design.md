# Integración manga ↔ hacienda/potreros (diseño EN PROGRESO)

> **SUPERSEDED 2026-09-23**  
> Este brainstorm quedó cerrado por:
> - `docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md`
> - `docs/superpowers/plans/2026-09-23-manga-hacienda-integracion.md`
> - Contexto reunión: `docs/superpowers/specs/2026-09-23-reunion-dueno-mateca.md`
>
> No usar este archivo como SoT. Se conserva solo por historia.

---

## Pedido (histórico)

Papá quiere que los datos de las sesiones de cada animal (que hoy se usan solo para el CSV de CENASA)
también se puedan usar "en el campo", en las secciones de **hacienda** y **potreros**.

## Modelo de datos actual (al 2026-08-13; desactualizado)

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

## Decisiones tomadas (históricas — ver PRD para vigentes)

1. **Qué ver en hacienda/potreros:** las dos cosas — (a) animales individuales por potrero con su último
   registro de sesión, y (b) resúmenes/estadísticas por potrero y categoría (promedio de peso, estados
   sanitarios, cantidades).

## Preguntas PENDIENTES — RESUELTAS en PRD 2026-09-23

1. **Vínculo animal ↔ potrero/categoría:** → `potrero_id` + `categoria` en `manga_animales` (ya migrado SENASA) + eventos de cambio.
2. **Formato CSV CENASA:** → no romper export actual; TXT SIGSA sigue beta.
3. **Categoría:** → explícita (`CATEGORIAS_BOVINOS`), no solo derivada de sexo+edad.

## Posible diseño (borrador histórico)

- Agregar a `manga_animales`: `potrero_id` (FK a `potreros`) y `categoria`. *(hecho en migración oficial_senasa)*
- En la vista de **potreros**: mostrar animales individuales de ese potrero + resumen. *(plan P0 task 8)*
- En la vista de **hacienda**: agrupar los animales individuales por categoría/potrero, con resúmenes. *(plan P0 task 7, tab Por animal)*
- Mantener intacta la exportación CSV de CENASA.

## Cómo retomar

Usar el prompt maestro del PRD 2026-09-23, no este archivo.
