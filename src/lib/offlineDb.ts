const DB_NAME = "manga-offline";
const DB_VERSION = 1;
const ANIMALS_STORE = "animals";
const SCANS_STORE = "scans";

export interface CachedAnimal {
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

export interface PendingScan {
  clientId: string;
  eid: string;
  sessionId: string | null;
  deviceId: string | null;
  timestamp: string;
  datos: Record<string, unknown>;
  syncState: "pendiente";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ANIMALS_STORE)) {
        db.createObjectStore(ANIMALS_STORE, { keyPath: "eid" });
      }
      if (!db.objectStoreNames.contains(SCANS_STORE)) {
        db.createObjectStore(SCANS_STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function store(store: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDb().then((db) => db.transaction(store, mode).objectStore(store));
}

export async function cacheAnimals(animals: CachedAnimal[]): Promise<void> {
  const s = await store(ANIMALS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    s.clear();
    animals.forEach((a) => s.put(a));
    s.transaction.oncomplete = () => resolve();
    s.transaction.onerror = () => reject(s.transaction.error);
  });
}

export async function getAnimalLocal(eid: string): Promise<CachedAnimal | null> {
  const s = await store(ANIMALS_STORE, "readonly");
  return new Promise((resolve, reject) => {
    const req = s.get(eid);
    req.onsuccess = () => resolve((req.result as CachedAnimal) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueScan(scan: PendingScan): Promise<void> {
  const s = await store(SCANS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    s.put(scan);
    s.transaction.oncomplete = () => resolve();
    s.transaction.onerror = () => reject(s.transaction.error);
  });
}

export async function getPendingScans(): Promise<PendingScan[]> {
  const s = await store(SCANS_STORE, "readonly");
  return new Promise((resolve, reject) => {
    const req = s.getAll();
    req.onsuccess = () => resolve((req.result as PendingScan[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function updateScanDatos(
  clientId: string,
  datos: Record<string, unknown>
): Promise<void> {
  const s = await store(SCANS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    const req = s.get(clientId);
    req.onsuccess = () => {
      const scan = req.result as PendingScan | undefined;
      if (scan) s.put({ ...scan, datos });
      s.transaction.oncomplete = () => resolve();
      s.transaction.onerror = () => reject(s.transaction.error);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeScan(clientId: string): Promise<void> {
  const s = await store(SCANS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    s.delete(clientId);
    s.transaction.oncomplete = () => resolve();
    s.transaction.onerror = () => reject(s.transaction.error);
  });
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "unknown";
  let id = window.localStorage.getItem("manga_device_id");
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem("manga_device_id", id);
  }
  return id;
}
