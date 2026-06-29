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

  const saveRegistro = useCallback(
    async ({
      eid,
      animalId,
      datos,
      establecimientoId,
      userName,
    }: {
      eid: string;
      animalId: string | null;
      datos: Record<string, unknown>;
      establecimientoId: string;
      userName: string;
    }): Promise<boolean> => {
      setSaving(true);
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0];
        const { error } = await supabase.from("registros_manga").insert({
          eid,
          animal_id: animalId,
          fecha: today,
          datos,
          usuario: userName,
          establecimiento_id: establecimientoId,
        });
        return !error;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { loadingAnimal, saving, fetchAnimal, fetchRegistros, saveRegistro };
}
