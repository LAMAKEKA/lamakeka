"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PotreroOption {
  id: string;
  nombre: string;
}

export function usePotreros() {
  const [potreros, setPotreros] = useState<PotreroOption[]>([]);

  const fetchPotreros = useCallback(async (establecimientoId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("potreros")
      .select("id, nombre")
      .eq("establecimiento_id", establecimientoId)
      .order("nombre");
    setPotreros(data ?? []);
  }, []);

  return { potreros, fetchPotreros };
}
