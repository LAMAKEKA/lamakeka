"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  cacheAnimals,
  getAnimalLocal,
  enqueueScan,
  getPendingScans,
  removeScan,
  type CachedAnimal,
} from "@/lib/offlineDb";

export interface PendingScanPayload {
  clientId: string;
  eid: string;
  sessionId: string | null;
  deviceId: string | null;
  timestamp: string;
  datos: Record<string, unknown>;
}

export function useOfflineQueue() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);

  const syncPending = useCallback(async () => {
    const scans = await getPendingScans();
    for (const scan of scans) {
      const res = await fetch("/api/rfid/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eid: scan.eid,
          clientId: scan.clientId,
          sessionId: scan.sessionId,
          deviceId: scan.deviceId,
          timestamp: scan.timestamp,
          datos: scan.datos,
        }),
      });
      if (res.ok) {
        await removeScan(scan.clientId);
      } else {
        // No sincronizado: reintentamos más tarde (sin conexión, 4xx/5xx).
        break;
      }
    }
    const remaining = await getPendingScans();
    setPendingCount(remaining.length);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      syncPending();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let cancelled = false;
    getPendingScans().then((scans) => {
      if (!cancelled) setPendingCount(scans.length);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncPending]);

  const cacheAnimalIndex = useCallback(async (estabId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("manga_animales")
      .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote")
      .eq("establecimiento_id", estabId);
    if (data) await cacheAnimals(data as CachedAnimal[]);
  }, []);

  const lookupLocal = useCallback(
    async (eid: string): Promise<CachedAnimal | null> => getAnimalLocal(eid),
    []
  );

  const enqueue = useCallback(
    async (scan: PendingScanPayload) => {
      await enqueueScan({ ...scan, syncState: "pendiente" });
      const scans = await getPendingScans();
      setPendingCount(scans.length);
    },
    []
  );

  return { online, pendingCount, cacheAnimalIndex, lookupLocal, enqueue, syncPending };
}
