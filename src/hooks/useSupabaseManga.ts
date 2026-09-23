"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { insertAnimalEvento } from "@/lib/animalEventos";
import { resolveEstadoAlta } from "@/lib/haciendaStock";

export interface MangaAnimal {
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
  estado?: string | null;
}

const ANIMAL_SELECT =
  "id, eid, vid, raza, sexo, fecha_nacimiento, lote, potrero_id, categoria, fecha_aplicacion, motivo_declaracion, estado";

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
  categoria: string | null;
  potreroId: string | null;
  fechaAplicacion: string | null;
  motivoDeclaracion: string | null;
  establecimientoId: string;
  usuario?: string | null;
}

export interface UpdateAnimalPayload {
  id: string;
  vid: string | null;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  lote: string | null;
  categoria: string | null;
  potreroId: string | null;
  fechaAplicacion: string | null;
  motivoDeclaracion: string | null;
  /** Si se setea, egreso individual (Task 6). */
  estado?: string | null;
  establecimientoId?: string;
  usuario?: string | null;
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
          .select(ANIMAL_SELECT)
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
      categoria,
      potreroId,
      fechaAplicacion,
      motivoDeclaracion,
      establecimientoId,
      usuario,
    }: CreateAnimalPayload): Promise<MangaAnimal | null> => {
      const supabase = createClient();
      const estado = resolveEstadoAlta(potreroId);
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
          categoria,
          potrero_id: potreroId,
          fecha_aplicacion: fechaAplicacion,
          motivo_declaracion: motivoDeclaracion,
          estado,
        })
        .select(ANIMAL_SELECT)
        .single();

      if (error) {
        const { data: existing } = await supabase
          .from("manga_animales")
          .select(ANIMAL_SELECT)
          .eq("establecimiento_id", establecimientoId)
          .eq("eid", eid)
          .maybeSingle();
        return existing;
      }

      if (data) {
        await insertAnimalEvento(supabase, {
          establecimientoId,
          animalId: data.id,
          eid: data.eid,
          tipo: "alta",
          usuario: usuario ?? null,
          datos: {
            categoria: data.categoria,
            potrero_id: data.potrero_id,
            estado: data.estado ?? estado,
            vid: data.vid,
            sexo: data.sexo,
          },
        });
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

  const updateAnimal = useCallback(async (payload: UpdateAnimalPayload): Promise<MangaAnimal | null> => {
    setSaving(true);
    try {
      const supabase = createClient();

      type PrevRow = MangaAnimal & { establecimiento_id: string };
      const { data: prevRaw } = await supabase
        .from("manga_animales")
        .select(
          "id, eid, vid, raza, sexo, fecha_nacimiento, lote, potrero_id, categoria, fecha_aplicacion, motivo_declaracion, estado, establecimiento_id"
        )
        .eq("id", payload.id)
        .maybeSingle();

      const prev = prevRaw as PrevRow | null;
      if (!prev) return null;

      const nextPotrero = payload.potreroId;
      const nextCategoria = payload.categoria;
      let nextEstado = payload.estado ?? prev.estado ?? "activo";

      // Si no es egreso explícito, recalcular stock location state
      if (!payload.estado) {
        if (!nextPotrero) {
          nextEstado = "sin_ubicar";
        } else if (prev.estado === "sin_ubicar" || prev.estado === "activo" || !prev.estado) {
          nextEstado = "activo";
        }
      }

      const { data, error } = await supabase
        .from("manga_animales")
        .update({
          vid: payload.vid,
          raza: payload.raza,
          sexo: payload.sexo,
          fecha_nacimiento: payload.fechaNacimiento,
          lote: payload.lote,
          categoria: nextCategoria,
          potrero_id: nextPotrero,
          fecha_aplicacion: payload.fechaAplicacion,
          motivo_declaracion: payload.motivoDeclaracion,
          estado: nextEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select(ANIMAL_SELECT)
        .single();

      if (error || !data) return null;

      const establecimientoId = payload.establecimientoId ?? prev.establecimiento_id;

      if (establecimientoId) {
        if ((prev.potrero_id ?? null) !== (nextPotrero ?? null)) {
          await insertAnimalEvento(supabase, {
            establecimientoId,
            animalId: data.id,
            eid: data.eid,
            tipo: "cambio_potrero",
            usuario: payload.usuario ?? null,
            datos: { from: prev.potrero_id, to: nextPotrero },
          });
        }
        if ((prev.categoria ?? null) !== (nextCategoria ?? null)) {
          await insertAnimalEvento(supabase, {
            establecimientoId,
            animalId: data.id,
            eid: data.eid,
            tipo: "cambio_categoria",
            usuario: payload.usuario ?? null,
            datos: { from: prev.categoria, to: nextCategoria },
          });
        }
        if (payload.estado && payload.estado !== prev.estado) {
          const tipoEgreso =
            payload.estado === "vendido"
              ? "venta"
              : payload.estado === "muerto"
                ? "muerte"
                : payload.estado === "transferido"
                  ? "transferencia_salida"
                  : "otro";
          await insertAnimalEvento(supabase, {
            establecimientoId,
            animalId: data.id,
            eid: data.eid,
            tipo: tipoEgreso,
            usuario: payload.usuario ?? null,
            datos: { from: prev.estado, to: payload.estado },
          });
        }
      }

      return data as MangaAnimal;
    } finally {
      setSaving(false);
    }
  }, []);

  return { loadingAnimal, saving, fetchAnimal, fetchRegistros, scanEid, createAnimal, updateAnimal, saveRegistro };
}
