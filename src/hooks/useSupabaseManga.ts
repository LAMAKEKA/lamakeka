"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface MangaAnimal {
  id: string;
  eid: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  lote: string | null;
}

export interface RegistroManga {
  id: string;
  eid: string;
  fecha: string;
  datos: Record<string, unknown>;
  usuario: string | null;
  created_at: string;
}

export interface ScanPayload {
  eid: string;
  clientId: string;
  sessionId?: string | null;
  deviceId?: string | null;
  timestamp?: string;
  datos?: Record<string, unknown>;
  usuario?: string;
}

export interface ScanResult {
  found: boolean;
  animal: MangaAnimal | null;
  registroId: string | null;
  error?: string;
}

export interface CreateAnimalPayload {
  eid: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  lote: string | null;
  establecimientoId: string;
}

export function useSupabaseManga() {
  const [loadingAnimal, setLoadingAnimal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAnimal = useCallback(
    async (eid: string, establecimientoId: string): Promise<MangaAnimal | null> => {
      setLoadingAnimal(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("manga_animales")
          .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote")
          .eq("establecimiento_id", establecimientoId)
          .eq("eid", eid)
          .maybeSingle();
        return data;
      } finally {
        setLoadingAnimal(false);
      }
    },
    []
  );

  const fetchRegistros = useCallback(
    async (eid: string, establecimientoId: string): Promise<RegistroManga[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registros_manga")
        .select("id, eid, fecha, datos, usuario, created_at")
        .eq("establecimiento_id", establecimientoId)
        .eq("eid", eid)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    []
  );

  const scanEid = useCallback(async (payload: ScanPayload): Promise<ScanResult> => {
    const res = await fetch("/api/rfid/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        found: false,
        animal: null,
        registroId: null,
        error: data.error ?? `Error ${res.status}`,
      };
    }
    return (await res.json()) as ScanResult;
  }, []);

  const createAnimal = useCallback(
    async ({
      eid,
      vid,
      raza,
      sexo,
      fechaNacimiento,
      lote,
      establecimientoId,
    }: CreateAnimalPayload): Promise<MangaAnimal | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("manga_animales")
        .insert({
          establecimiento_id: establecimientoId,
          eid,
          vid,
          raza,
          sexo,
          fecha_nacimiento: fechaNacimiento,
          lote,
        })
        .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote")
        .single();

      if (error) {
        const { data: existing } = await supabase
          .from("manga_animales")
          .select("id, eid, vid, raza, sexo, fecha_nacimiento, lote")
          .eq("establecimiento_id", establecimientoId)
          .eq("eid", eid)
          .maybeSingle();
        return existing;
      }
      return data;
    },
    []
  );

  const saveRegistro = useCallback(
    async ({
      eid,
      clientId,
      sessionId,
      deviceId,
      datos,
      userName,
    }: {
      eid: string;
      clientId: string;
      sessionId: string | null;
      deviceId: string | null;
      datos: Record<string, unknown>;
      userName: string;
    }): Promise<boolean> => {
      setSaving(true);
      try {
        const result = await scanEid({
          eid,
          clientId,
          sessionId,
          deviceId,
          datos,
          usuario: userName,
        });
        return !result.error;
      } finally {
        setSaving(false);
      }
    },
    [scanEid]
  );

  return { loadingAnimal, saving, fetchAnimal, fetchRegistros, scanEid, createAnimal, saveRegistro };
}
