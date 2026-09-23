"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS_STOCK, enStock } from "@/lib/haciendaStock";

export interface HaciendaAnimalRow {
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
  estado: string | null;
  updated_at: string | null;
  potrero_nombre: string | null;
}

export interface FetchHaciendaAnimalesOpts {
  q?: string;
  categoria?: string;
  potreroId?: string;
  /** default true — solo activo + sin_ubicar */
  soloStock?: boolean;
  /** si true y soloStock=false, incluye bajas */
  incluirBajas?: boolean;
}

const SELECT =
  "id, eid, vid, raza, sexo, fecha_nacimiento, lote, potrero_id, categoria, fecha_aplicacion, motivo_declaracion, estado, updated_at, potreros(nombre)";

type RawRow = Omit<HaciendaAnimalRow, "potrero_nombre"> & {
  potreros: { nombre: string } | { nombre: string }[] | null;
};

function mapRow(r: RawRow): HaciendaAnimalRow {
  const p = r.potreros;
  const nombre = Array.isArray(p) ? p[0]?.nombre ?? null : p?.nombre ?? null;
  const { potreros: _p, ...rest } = r;
  return { ...rest, potrero_nombre: nombre };
}

export function useHaciendaAnimales() {
  const [animales, setAnimales] = useState<HaciendaAnimalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnimales = useCallback(
    async (establecimientoId: string, opts: FetchHaciendaAnimalesOpts = {}) => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const soloStock = opts.soloStock !== false;

        let query = supabase
          .from("manga_animales")
          .select(SELECT)
          .eq("establecimiento_id", establecimientoId)
          .order("eid");

        if (soloStock) {
          query = query.in("estado", [...ESTADOS_STOCK]);
        } else if (!opts.incluirBajas) {
          query = query.in("estado", [...ESTADOS_STOCK]);
        }

        if (opts.categoria) {
          query = query.eq("categoria", opts.categoria);
        }
        if (opts.potreroId) {
          query = query.eq("potrero_id", opts.potreroId);
        }

        const { data, error: dbError } = await query;
        if (dbError) {
          setError(dbError.message);
          setAnimales([]);
          return [];
        }

        let rows = ((data ?? []) as unknown as RawRow[]).map(mapRow);

        const q = opts.q?.trim().toLowerCase();
        if (q) {
          rows = rows.filter(
            (a) =>
              a.eid.toLowerCase().includes(q) ||
              (a.vid ?? "").toLowerCase().includes(q) ||
              (a.categoria ?? "").toLowerCase().includes(q) ||
              (a.potrero_nombre ?? "").toLowerCase().includes(q)
          );
        }

        setAnimales(rows);
        return rows;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchByPotrero = useCallback(
    async (establecimientoId: string, potreroId: string) => {
      return fetchAnimales(establecimientoId, { potreroId, soloStock: true });
    },
    [fetchAnimales]
  );

  return {
    animales,
    loading,
    error,
    fetchAnimales,
    fetchByPotrero,
    enStock,
  };
}
