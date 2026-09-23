"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Loader2, Beef, AlertCircle } from "lucide-react";
import { useHaciendaAnimales, type HaciendaAnimalRow } from "@/hooks/useHaciendaAnimales";
import { usePotreros } from "@/hooks/usePotreros";
import { useSupabaseManga, type MangaAnimal, type UpdateAnimalPayload } from "@/hooks/useSupabaseManga";
import { AnimalFichaDrawer } from "@/components/hacienda/AnimalFichaDrawer";
import {
  countByCategoria,
  countEnStock,
  countSinUbicar,
} from "@/lib/haciendaStock";
import { CATEGORIAS_BOVINOS } from "@/lib/senasa";

const ESTADO_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  activo: { bg: "rgba(22,163,74,0.09)", color: "#16a34a", label: "Activo" },
  sin_ubicar: { bg: "rgba(217,119,6,0.10)", color: "#d97706", label: "Sin ubicar" },
  vendido: { bg: "rgba(37,99,235,0.09)", color: "#2563eb", label: "Vendido" },
  muerto: { bg: "rgba(220,38,38,0.07)", color: "#dc2626", label: "Muerto" },
  transferido: { bg: "rgba(107,114,128,0.12)", color: "#6b7280", label: "Transferido" },
  baja: { bg: "rgba(107,114,128,0.12)", color: "#6b7280", label: "Baja" },
};

interface Props {
  establecimientoId: string;
  userName?: string;
}

function toMangaAnimal(row: HaciendaAnimalRow): MangaAnimal {
  return {
    id: row.id,
    eid: row.eid,
    vid: row.vid,
    raza: row.raza,
    sexo: row.sexo,
    fecha_nacimiento: row.fecha_nacimiento,
    lote: row.lote,
    potrero_id: row.potrero_id,
    categoria: row.categoria,
    fecha_aplicacion: row.fecha_aplicacion,
    motivo_declaracion: row.motivo_declaracion,
    estado: row.estado,
  };
}

export function HaciendaPorAnimal({ establecimientoId, userName }: Props) {
  const { animales, loading, error, fetchAnimales } = useHaciendaAnimales();
  const { potreros, fetchPotreros } = usePotreros();
  const { updateAnimal, saving } = useSupabaseManga();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [selected, setSelected] = useState<HaciendaAnimalRow | null>(null);

  const reload = useCallback(() => {
    return fetchAnimales(establecimientoId, {
      q: q || undefined,
      categoria: categoria || undefined,
      soloStock: true,
    });
  }, [establecimientoId, fetchAnimales, q, categoria]);

  useEffect(() => {
    fetchPotreros(establecimientoId);
  }, [establecimientoId, fetchPotreros]);

  useEffect(() => {
    reload();
  }, [reload]);

  const kpis = useMemo(() => {
    const stockRows = animales.map((a) => ({
      categoria: a.categoria,
      estado: a.estado ?? "activo",
      potrero_id: a.potrero_id,
    }));
    const total = countEnStock(stockRows);
    const sinUbicar = countSinUbicar(stockRows);
    const byCat = countByCategoria(stockRows);
    return { total, sinUbicar, byCat };
  }, [animales]);

  async function handleSave(payload: UpdateAnimalPayload) {
    const updated = await updateAnimal(payload);
    if (!updated) {
      alert("No se pudo guardar el animal.");
      return;
    }
    const rows = await reload();
    const fresh = rows.find((r) => r.id === updated.id) ?? null;
    setSelected(fresh);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: "rgba(58,74,50,0.08)", color: "var(--color-campo)" }}
        >
          <Beef size={14} />
          <span>{kpis.total.toLocaleString("es-AR")} en stock EID</span>
        </div>
        {kpis.sinUbicar > 0 && (
          <div
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "rgba(217,119,6,0.10)", color: "#d97706" }}
          >
            {kpis.sinUbicar} sin ubicar
          </div>
        )}
        {Object.entries(kpis.byCat)
          .slice(0, 6)
          .map(([cat, n]) => (
            <div
              key={cat}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "rgba(212,197,169,0.35)",
                color: "var(--color-tierra)",
              }}
            >
              {cat}: {n}
            </div>
          ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "rgba(26,26,24,0.35)" }}
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar EID, VID, potrero…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              border: "1.5px solid rgba(212,197,169,0.8)",
              backgroundColor: "#ffffff",
              color: "var(--color-tierra)",
            }}
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            border: "1.5px solid rgba(212,197,169,0.8)",
            backgroundColor: "#ffffff",
            color: "var(--color-tierra)",
          }}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_BOVINOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: "rgba(220,38,38,0.06)",
            color: "#dc2626",
            border: "1px solid rgba(220,38,38,0.15)",
          }}
        >
          <AlertCircle size={15} />
          {error}
          <span className="opacity-70 text-xs">
            (¿aplicaste la migración estado/animal_eventos en Supabase?)
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-campo)" }} />
        </div>
      ) : animales.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(212,197,169,0.5)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-tierra)" }}>
            No hay animales con caravana en stock
          </p>
          <p className="text-xs mt-2" style={{ color: "rgba(26,26,24,0.45)" }}>
            Cargalos desde Manga con el bastón o alta manual.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(212,197,169,0.5)",
            boxShadow: "0 1px 3px rgba(26,26,24,0.06)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "rgba(240,237,230,0.7)" }}>
                  {["EID", "VID", "Categoría", "Potrero", "Estado", "Sexo"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase"
                      style={{ color: "rgba(26,26,24,0.45)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {animales.map((a) => {
                  const st = ESTADO_CHIP[a.estado ?? "activo"] ?? ESTADO_CHIP.activo;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="cursor-pointer border-t transition-colors"
                      style={{ borderColor: "rgba(212,197,169,0.35)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(58,74,50,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-tierra)" }}>
                        {a.eid}
                      </td>
                      <td className="px-4 py-3" style={{ color: "rgba(26,26,24,0.65)" }}>
                        {a.vid ?? "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-tierra)" }}>
                        {a.categoria ?? "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "rgba(26,26,24,0.65)" }}>
                        {a.potrero_nombre ?? "Sin ubicar"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "rgba(26,26,24,0.65)" }}>
                        {a.sexo ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <AnimalFichaDrawer
          animal={toMangaAnimal(selected)}
          establecimientoId={establecimientoId}
          potreros={potreros}
          saving={saving}
          usuario={userName}
          onSave={handleSave}
          onClose={() => setSelected(null)}
          onChanged={() => reload()}
        />
      )}
    </div>
  );
}
