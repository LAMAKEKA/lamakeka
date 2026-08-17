"use client";

import { Loader2, AlertCircle, Calendar, Tag, Beef, History, Pencil } from "lucide-react";
import type { MangaAnimal, RegistroManga } from "@/hooks/useSupabaseManga";
import type { MangaCampo } from "@/hooks/useCamposConfig";

interface FichaAnimalProps {
  eid: string | null;
  animal: MangaAnimal | null;
  registros: RegistroManga[];
  loading: boolean;
  campos: MangaCampo[];
  onEdit?: () => void;
}

function InfoChip({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div
      className="flex flex-col rounded-xl px-3 py-2"
      style={{
        backgroundColor: "rgba(212,197,169,0.18)",
        border: "1px solid rgba(212,197,169,0.4)",
      }}
    >
      <span className="form-label mb-0.5">{label}</span>
      <span className="text-sm font-medium" style={{ color: "var(--color-tierra)" }}>
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FichaAnimal({ eid, animal, registros, loading, campos, onEdit }: FichaAnimalProps) {
  if (!eid) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-12 text-center"
        style={{
          backgroundColor: "rgba(212,197,169,0.1)",
          border: "1px dashed rgba(212,197,169,0.6)",
          minHeight: 160,
        }}
      >
        <Beef size={32} style={{ color: "rgba(26,26,24,0.15)" }} />
        <p className="mt-3 text-sm" style={{ color: "rgba(26,26,24,0.35)" }}>
          Escaneá un animal para ver su ficha
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center py-10"
        style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}
      >
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-campo)" }} />
      </div>
    );
  }

  const lastPeso = registros.find(
    (r) => r.datos.peso_kg !== undefined && r.datos.peso_kg !== ""
  );
  const lastCC = registros.find(
    (r) => r.datos.condicion_corporal !== undefined && r.datos.condicion_corporal !== ""
  );

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(212,197,169,0.5)",
        boxShadow: "0 1px 4px rgba(26,26,24,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag size={14} style={{ color: "var(--color-campo)" }} />
            <p className="text-xs font-mono font-semibold" style={{ color: "rgba(26,26,24,0.5)" }}>
              EID {eid}
            </p>
          </div>
          {animal ? (
            <h2 className="text-xl font-bold mt-1" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
              {animal.vid ?? "Sin VID"}{" "}
              <span className="text-sm font-normal" style={{ color: "rgba(26,26,24,0.4)" }}>
                {animal.raza ?? ""}
              </span>
            </h2>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertCircle size={14} style={{ color: "#d97706" }} />
              <p className="text-sm" style={{ color: "#d97706" }}>Animal no registrado en el sistema</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {animal && onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ color: "var(--color-campo)", border: "1px solid rgba(58,74,50,0.3)", backgroundColor: "rgba(58,74,50,0.04)" }}
            >
              <Pencil size={12} /> Editar
            </button>
          )}
          {animal && (animal.sexo || animal.lote) && (
            <div className="flex gap-1.5">
              {animal.sexo && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: animal.sexo.toLowerCase() === "macho" ? "rgba(37,99,235,0.08)" : "rgba(217,119,6,0.08)", color: animal.sexo.toLowerCase() === "macho" ? "#2563eb" : "#d97706" }}>
                  {animal.sexo}
                </span>
              )}
              {animal.lote && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(58,74,50,0.1)", color: "var(--color-campo)" }}>
                  {animal.lote}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Animal details */}
      {animal && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          <InfoChip label="VID" value={animal.vid} />
          <InfoChip label="Raza" value={animal.raza} />
          <InfoChip
            label="Nacimiento"
            value={animal.fecha_nacimiento ? formatDate(animal.fecha_nacimiento) : null}
          />
        </div>
      )}

      {/* Quick stats from history */}
      {(lastPeso || lastCC) && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {lastPeso && (
            <div
              className="rounded-xl px-3 py-2"
              style={{
                backgroundColor: "rgba(37,99,235,0.07)",
                border: "1px solid rgba(37,99,235,0.15)",
              }}
            >
              <p className="form-label mb-0.5" style={{ color: "rgba(37,99,235,0.7)" }}>
                Último peso
              </p>
              <p className="text-base font-bold" style={{ color: "#2563eb" }}>
                {String(lastPeso.datos.peso_kg)} kg
              </p>
              <p className="text-[10px]" style={{ color: "rgba(37,99,235,0.5)" }}>
                {formatDate(lastPeso.fecha)}
              </p>
            </div>
          )}
          {lastCC && (
            <div
              className="rounded-xl px-3 py-2"
              style={{
                backgroundColor: "rgba(22,163,74,0.07)",
                border: "1px solid rgba(22,163,74,0.15)",
              }}
            >
              <p className="form-label mb-0.5" style={{ color: "rgba(22,163,74,0.7)" }}>
                Última CC
              </p>
              <p className="text-base font-bold" style={{ color: "#16a34a" }}>
                {String(lastCC.datos.condicion_corporal)}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(22,163,74,0.5)" }}>
                {formatDate(lastCC.fecha)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent records */}
      {registros.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <History size={13} style={{ color: "rgba(26,26,24,0.4)" }} />
            <span className="form-label mb-0">Historial reciente</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
            {registros.slice(0, 5).map((r) => {
              const camposConValor = campos.filter(
                (c) => r.datos[c.nombre] !== undefined && r.datos[c.nombre] !== ""
              );
              return (
                <div
                  key={r.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl"
                  style={{
                    backgroundColor: "rgba(212,197,169,0.12)",
                    border: "1px solid rgba(212,197,169,0.3)",
                  }}
                >
                  <Calendar size={12} className="shrink-0 mt-0.5" style={{ color: "rgba(26,26,24,0.4)" }} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-semibold"
                      style={{ color: "rgba(26,26,24,0.6)" }}
                    >
                      {formatDate(r.fecha)}
                      {r.usuario && (
                        <span style={{ color: "rgba(26,26,24,0.35)" }}>
                          {" "}· {r.usuario}
                        </span>
                      )}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 truncate"
                      style={{ color: "rgba(26,26,24,0.5)" }}
                    >
                      {camposConValor
                        .map((c) => `${c.etiqueta}: ${String(r.datos[c.nombre])}`)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
