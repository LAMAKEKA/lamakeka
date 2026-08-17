"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { nuevaCantidad, type TipoMovimientoGallina } from "@/lib/produccion";

export interface LoteGallinas {
  id: string;
  establecimiento_id: string;
  nombre: string;
  cantidad: number;
  galpon: string | null;
  fecha_alta: string;
  activo: boolean;
  deleted_at: string | null;
}

export interface RegistroProduccion {
  id: string;
  establecimiento_id: string;
  lote_id: string;
  fecha: string;
  maples: number;
  merma: number;
  observaciones: string | null;
}

export interface MovimientoGallina {
  id: string;
  establecimiento_id: string;
  lote_id: string;
  tipo: TipoMovimientoGallina;
  cantidad: number;
  fecha: string;
  motivo: string | null;
}

export function useProduccion() {
  const [lotes, setLotes] = useState<LoteGallinas[]>([]);
  const [registros, setRegistros] = useState<RegistroProduccion[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoGallina[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async (establecimientoId: string) => {
    setLoading(true);
    const supabase = createClient();
    const [lotesRes, prodRes, movRes] = await Promise.all([
      supabase
        .from("lotes_gallinas")
        .select("id, establecimiento_id, nombre, cantidad, galpon, fecha_alta, activo, deleted_at")
        .eq("establecimiento_id", establecimientoId)
        .is("deleted_at", null)
        .order("nombre"),
      supabase
        .from("produccion_huevos")
        .select("id, establecimiento_id, lote_id, fecha, maples, merma, observaciones")
        .eq("establecimiento_id", establecimientoId)
        .order("fecha", { ascending: false }),
      supabase
        .from("movimientos_gallinas")
        .select("id, establecimiento_id, lote_id, tipo, cantidad, fecha, motivo")
        .eq("establecimiento_id", establecimientoId)
        .order("fecha", { ascending: false }),
    ]);
    setLotes((lotesRes.data ?? []) as LoteGallinas[]);
    setRegistros((prodRes.data ?? []) as RegistroProduccion[]);
    setMovimientos((movRes.data ?? []) as MovimientoGallina[]);
    setLoading(false);
  }, []);

  async function createLote(input: {
    establecimiento_id: string;
    nombre: string;
    cantidad: number;
    galpon: string | null;
    fecha_alta: string;
  }) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("lotes_gallinas").insert({
        establecimiento_id: input.establecimiento_id,
        nombre: input.nombre.trim(),
        cantidad: input.cantidad,
        galpon: input.galpon,
        fecha_alta: input.fecha_alta,
        activo: true,
      });
      if (error) return { error: error.message };
      await fetchAll(input.establecimiento_id);
      return { error: null };
    } finally {
      setSaving(false);
    }
  }

  async function updateLote(id: string, patch: { nombre: string; galpon: string | null }) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("lotes_gallinas")
        .update({ nombre: patch.nombre.trim(), galpon: patch.galpon, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return { error: error.message };
      setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, nombre: patch.nombre.trim() } : l)));
      return { error: null };
    } finally {
      setSaving(false);
    }
  }

  async function deactivateLote(id: string) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("lotes_gallinas")
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return { error: error.message };
      setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, activo: false } : l)));
      return { error: null };
    } finally {
      setSaving(false);
    }
  }

  function findProduccion(loteId: string, fecha: string) {
    return registros.find((r) => r.lote_id === loteId && r.fecha === fecha);
  }

  async function saveProduccion(input: {
    establecimiento_id: string;
    lote_id: string;
    fecha: string;
    maples: number;
    merma: number;
    observaciones: string | null;
    replaceId?: string;
  }) {
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        establecimiento_id: input.establecimiento_id,
        lote_id: input.lote_id,
        fecha: input.fecha,
        maples: input.maples,
        merma: input.merma,
        observaciones: input.observaciones,
        updated_at: new Date().toISOString(),
      };
      const { error } = input.replaceId
        ? await supabase.from("produccion_huevos").update(payload).eq("id", input.replaceId)
        : await supabase.from("produccion_huevos").insert(payload);
      if (error) return { error: error.message };
      await fetchAll(input.establecimiento_id);
      return { error: null };
    } finally {
      setSaving(false);
    }
  }

  async function applyMovimiento(input: {
    establecimiento_id: string;
    lote_id: string;
    tipo: TipoMovimientoGallina;
    cantidad: number;
    fecha: string;
    motivo: string | null;
  }) {
    const lote = lotes.find((l) => l.id === input.lote_id);
    if (!lote) return { error: "Lote no encontrado." };
    if (!lote.activo) return { error: "Ese lote está desactivado." };
    const next = nuevaCantidad(lote.cantidad, input.tipo, input.cantidad);
    if (next === null) return { error: "No hay tantas gallinas en el lote." };

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updError } = await supabase
        .from("lotes_gallinas")
        .update({ cantidad: next, updated_at: new Date().toISOString() })
        .eq("id", input.lote_id);
      if (updError) {
        return { error: updError.message };
      }
      const { error: insError } = await supabase.from("movimientos_gallinas").insert({
        establecimiento_id: input.establecimiento_id,
        lote_id: input.lote_id,
        tipo: input.tipo,
        cantidad: input.cantidad,
        fecha: input.fecha,
        motivo: input.motivo,
      });
      if (insError) return { error: insError.message };
      await fetchAll(input.establecimiento_id);
      return { error: null };
    } finally {
      setSaving(false);
    }
  }

  return {
    lotes,
    registros,
    movimientos,
    loading,
    saving,
    fetchAll,
    createLote,
    updateLote,
    deactivateLote,
    findProduccion,
    saveProduccion,
    applyMovimiento,
  };
}
