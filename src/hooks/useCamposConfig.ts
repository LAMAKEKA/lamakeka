"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type TipoCampo =
  | "numero"
  | "texto"
  | "texto_largo"
  | "selector"
  | "escala"
  | "booleano";

export interface MangaCampo {
  id: string;
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[] | null;
  obligatorio: boolean;
  activo: boolean;
  orden: number;
  ancho: "mitad" | "completo";
}

export function useCamposConfig() {
  const [campos, setCampos] = useState<MangaCampo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCampos = useCallback(async (soloActivos = false) => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from("manga_campos").select("*").order("orden");
      if (soloActivos) query = query.eq("activo", true);
      const { data } = await query;
      setCampos(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampo = useCallback(
    async (payload: Omit<MangaCampo, "id">): Promise<boolean> => {
      const supabase = createClient();
      const { error } = await supabase.from("manga_campos").insert(payload);
      if (!error) await fetchCampos();
      return !error;
    },
    [fetchCampos]
  );

  const updateCampo = useCallback(
    async (id: string, payload: Partial<Omit<MangaCampo, "id">>): Promise<boolean> => {
      const supabase = createClient();
      const { error } = await supabase
        .from("manga_campos")
        .update(payload)
        .eq("id", id);
      if (!error) await fetchCampos();
      return !error;
    },
    [fetchCampos]
  );

  const deleteCampo = useCallback(
    async (id: string): Promise<boolean> => {
      const supabase = createClient();
      const { error } = await supabase
        .from("manga_campos")
        .delete()
        .eq("id", id);
      if (!error) await fetchCampos();
      return !error;
    },
    [fetchCampos]
  );

  const toggleActivo = useCallback(
    async (campo: MangaCampo): Promise<boolean> => {
      return updateCampo(campo.id, { activo: !campo.activo });
    },
    [updateCampo]
  );

  const moveUp = useCallback(
    async (campo: MangaCampo) => {
      const idx = campos.findIndex((c) => c.id === campo.id);
      if (idx <= 0) return;
      const prev = campos[idx - 1];
      const supabase = createClient();
      await supabase
        .from("manga_campos")
        .update({ orden: prev.orden })
        .eq("id", campo.id);
      await supabase
        .from("manga_campos")
        .update({ orden: campo.orden })
        .eq("id", prev.id);
      await fetchCampos();
    },
    [campos, fetchCampos]
  );

  const moveDown = useCallback(
    async (campo: MangaCampo) => {
      const idx = campos.findIndex((c) => c.id === campo.id);
      if (idx >= campos.length - 1) return;
      const next = campos[idx + 1];
      const supabase = createClient();
      await supabase
        .from("manga_campos")
        .update({ orden: next.orden })
        .eq("id", campo.id);
      await supabase
        .from("manga_campos")
        .update({ orden: campo.orden })
        .eq("id", next.id);
      await fetchCampos();
    },
    [campos, fetchCampos]
  );

  return {
    campos,
    loading,
    fetchCampos,
    createCampo,
    updateCampo,
    deleteCampo,
    toggleActivo,
    moveUp,
    moveDown,
  };
}
