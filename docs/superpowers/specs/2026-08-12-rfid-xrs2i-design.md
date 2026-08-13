# Integración RFID XRS2i — Diseño

Fecha: 2026-08-12
Estado: aprobado

## Objetivo

Integrar un lector de caravanas RFID Tru-Test/Datamars **XRS2i** con la aplicación web de
gestión ganadera. Al escanear una caravana, el EID llega automáticamente al sistema y abre o
permite crear la ficha del animal, con registro de sesiones de lectura y soporte offline.

## Decisiones de arquitectura (aprobadas)

- **Transporte: HID mode (keyboard wedge).** El XRS2i no habla BLE GATT (habla Bluetooth
  Classic SPP en Android y Apple MFi/iAP en iOS). Web Bluetooth (`navigator.bluetooth`) no
  puede conectarse. En **HID mode** el lector emula un teclado Bluetooth y el SO recibe el EID
  como texto; funciona igual en Android, iPhone y PC sin código nativo.
- **Web-first, sin app nativa (por ahora).** El contrato de API queda agnóstico al transporte,
  de modo que un futuro puente nativo Android vía SPP reutilice el mismo endpoint.
- **Offline real** con cola local en IndexedDB y sincronización idempotente.

## Hallazgos técnicos XRS2i (verificados en Datamars KB, iLivestock, AgriWebb)

- XRS2 (viejo): Bluetooth Classic, sin MFi. XRS2i ("i"): agrega chip Apple MFi.
- Dos modos (`Bluetooth → Advanced → Connect Mode`): **Default (SPP)** y **HID** (teclado).
- HID funciona con Windows/Apple/Android; requiere software ≥ 1.4.01.
- No hay SDK público; integración vía serial SPP (no documentado) o HID.
- EID = ISO 11784/85, 15 dígitos.

## Arquitectura

```
XRS2i (HID) ──teclado BT──▶ SO del dispositivo ──keystrokes──▶ campo de captura web
                                                                │  valida EID (15 díg)
                                                                ▼
                                          online → POST /api/rfid/scans → Supabase
                                          offline → cola IndexedDB → sync al volver
                                                                ▼
                                       ¿existe animal? ──SÍ──▶ abrir ficha
                                                        ──NO──▶ crear ficha (EID precargado)
```

## Componentes

### Base de datos (migración `004_rfid_sesiones.sql`)

- Nueva tabla `manga_sesiones` (id, establecimiento_id, nombre, fecha, usuario, created_at).
- `registros_manga` + columnas: `sesion_id` (FK), `scanned_at timestamptz`,
  `sync_state text ('sincronizado'|'pendiente')`, `client_id uuid` (idempotencia).
- Índice único parcial `(establecimiento_id, client_id) where client_id is not null`.
- `manga_animales` ya tiene `eid` único por establecimiento (sin cambios).

### Backend

- `POST /api/rfid/scans`:
  - Body: `{ eid, clientId, sessionId?, deviceId?, timestamp?, datos?, usuario? }`
  - Auth por sesión Supabase; rechaza no autenticados (401).
  - Valida EID (15 dígitos), normaliza.
  - Upsert idempotente por `client_id` (evita duplicados al re-sincronizar).
  - Respuesta: `{ found, animal: { id, eid, vid, raza, sexo, fecha_nacimiento, lote } | null, registroId }`

### Frontend

- `src/lib/eid.ts`: `normalizeEid`, `isValidEid` (compartido cliente/servidor).
- `src/lib/offlineDb.ts`: wrapper IndexedDB (sin deps) con stores `animals` y `scans`.
- `src/hooks/useHidCapture.ts`: captura HID (auto-focus, dedup, validación). Reemplaza `useBluetooth.ts`.
- `src/hooks/useSesiones.ts`: listar/crear sesiones.
- `src/hooks/useOfflineQueue.ts`: caché de animales + cola de scans + eventos online/offline.
- `useSupabaseManga.ts`: agrega `scanEid` (POST), `createAnimal`, `saveRegistro` (upsert con clientId).
- `LectorPanel.tsx`: estado HID, campo de captura, selector de sesión, lista con estado de sync.
- `CrearAnimalForm.tsx`: alta de `manga_animales` cuando el EID no existe.
- Se eliminan (obsoletos): `useBluetooth.ts`, `web-bluetooth.d.ts`, `BluetoothPanel.tsx`.

### UX

Indicadores visuales: lector listo (HID), lectura recibida, animal existe / no existe,
pendiente de sincronización, sin conexión.

## Seguridad

- Auth/autorización por Supabase + RLS existente.
- Validación y normalización de EID.
- Idempotencia por `client_id`.
- Dedup cliente (mismo EID en <3 s ignorado).
- `deviceId` opcional (generado por instalación; HID no expone el lector al navegador).

## Fases

- **Fase 1 (ahora):** migración, API, rework Manga (HID + sesiones + crear animal + offline + UX).
- **Fase 2 (futuro):** app Expo Android vía SPP → misma API; iOS por HID. Documentada, no construida.

## Limitación

La conexión física con el XRS2i no puede probarse en este entorno (sin hardware). Todo queda
testeable con entrada manual de EID (el mismo campo de captura).

Límites de la Fase 1 (offline):
- Escaneo + datos de animales **existentes** funcionan offline (caché de animales en IndexedDB).
- **Alta de animal nuevo requiere conexión** (escribe en `manga_animales` vía Supabase). Sin
  conexión, el EID queda en cola y se informa al usuario que complete el alta al volver.

