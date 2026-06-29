"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MangaCampo } from "@/hooks/useCamposConfig";

interface ExportCSVProps {
  establecimientoId: string;
  sessionDate: string; // YYYY-MM-DD
  campos: MangaCampo[];
  sessionCount: number;
}

function escapeCsvCell(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function ExportCSV({ establecimientoId, sessionDate, campos, sessionCount }: ExportCSVProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: registros } = await supabase
        .from("registros_manga")
        .select("eid, fecha, datos, usuario, created_at")
        .eq("establecimiento_id", establecimientoId)
        .eq("fecha", sessionDate)
        .order("created_at");

      if (!registros || registros.length === 0) {
        alert("No hay registros guardados para esta fecha.");
        return;
      }

      const eids = [...new Set(registros.map((r: { eid: string }) => r.eid))];
      const { data: animals } = await supabase
        .from("manga_animales")
        .select("eid, vid, raza, sexo, fecha_nacimiento, lote")
        .eq("establecimiento_id", establecimientoId)
        .in("eid", eids);

      const animalMap = Object.fromEntries(
        (animals ?? []).map((a: { eid: string; vid: string | null; raza: string | null; sexo: string | null; fecha_nacimiento: string | null; lote: string | null }) => [a.eid, a])
      );

      // Fixed columns + dynamic columns from active campos
      const fixedHeaders = ["EID", "VID", "Breed", "Sex", "Date of Birth", "Lote", "Session Date"];
      const dynamicHeaders = campos.map((c) => c.nombre);
      const headers = [...fixedHeaders, ...dynamicHeaders];

      const rows = registros.map((r: { eid: string; fecha: string; datos: Record<string, unknown>; usuario: string | null }) => {
        const animal = animalMap[r.eid] ?? {};
        const fixed = [
          r.eid,
          (animal as { vid?: string | null }).vid ?? "",
          (animal as { raza?: string | null }).raza ?? "",
          (animal as { sexo?: string | null }).sexo ?? "",
          (animal as { fecha_nacimiento?: string | null }).fecha_nacimiento ?? "",
          (animal as { lote?: string | null }).lote ?? "",
          r.fecha,
        ];
        const dynamic = campos.map((c) => r.datos[c.nombre] ?? "");
        return [...fixed, ...dynamic].map(escapeCsvCell).join(",");
      });

      // BOM + header + rows
      const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manga_${sessionDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || sessionCount === 0}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{
        backgroundColor: sessionCount > 0 ? "var(--color-campo)" : "rgba(212,197,169,0.4)",
        color: sessionCount > 0 ? "#ffffff" : "rgba(26,26,24,0.35)",
        opacity: loading ? 0.7 : 1,
        cursor: sessionCount === 0 ? "not-allowed" : "pointer",
      }}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Download size={15} />
      )}
      Exportar CSV
    </button>
  );
}
