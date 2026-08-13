"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface MangaSesion {
  id: string;
  nombre: string;
  fecha: string;
  usuario: string | null;
  created_at: string;
}

export function useSesiones() {
  const [sesiones, setSesiones] = useState<MangaSesion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSesiones = useCallback(async (estabId: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("manga_sesiones")
        .select("id, nombre, fecha, usuario, created_at")
        .eq("establecimiento_id", estabId)
        .order("created_at", { ascending: false })
        .limit(20);
      setSesiones(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSesion = useCallback(
    async ({
      nombre,
      estabId,
      usuario,
    }: {
      nombre: string;
      estabId: string;
      usuario: string;
    }): Promise<MangaSesion | null> => {
      const supabase = createClient();
      const fecha = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("manga_sesiones")
        .insert({ nombre, establecimiento_id: estabId, fecha, usuario })
        .select("id, nombre, fecha, usuario, created_at")
        .single();
      if (!error && data) {
        setSesiones((prev) => [data, ...prev]);
        return data;
      }
      return null;
    },
    []
  );

  return { sesiones, loading, fetchSesiones, createSesion };
}
