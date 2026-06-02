"use client";

import { useState, useEffect } from "react";
import { X, Clock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuditEntry {
  id: string;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  modificado_por_nombre: string | null;
  accion: string;
  created_at: string;
}

interface AuditDrawerProps {
  tabla: string;
  registroId: string | null;
  onClose: () => void;
}

const SKIP_FIELDS = new Set(["id", "establecimiento_id", "created_at", "created_by"]);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function diffFields(ant: Record<string, unknown> | null, nvo: Record<string, unknown> | null) {
  if (!ant || !nvo) return [];
  return [...new Set([...Object.keys(ant), ...Object.keys(nvo)])]
    .filter((k) => !SKIP_FIELDS.has(k) && String(ant[k] ?? "") !== String(nvo[k] ?? ""))
    .map((k) => ({ campo: k, antes: ant[k], despues: nvo[k] }));
}

export function AuditDrawer({ tabla, registroId, onClose }: AuditDrawerProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!registroId) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("audit_log")
      .select("id, datos_anteriores, datos_nuevos, modificado_por_nombre, accion, created_at")
      .eq("tabla", tabla)
      .eq("registro_id", registroId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false); });
  }, [tabla, registroId]);

  if (!registroId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(26,26,24,0.3)" }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width: 380, backgroundColor: "#ffffff", boxShadow: "-4px 0 32px rgba(26,26,24,0.14)", borderLeft: "1px solid rgba(212,197,169,0.5)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(212,197,169,0.4)" }}>
          <div className="flex items-center gap-2.5">
            <Clock size={16} style={{ color: "var(--color-campo)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
              Historial de cambios
            </h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--color-campo)" }} />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock size={28} className="mb-3" style={{ color: "rgba(26,26,24,0.2)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "rgba(26,26,24,0.45)" }}>Sin modificaciones</p>
              <p className="text-xs" style={{ color: "rgba(26,26,24,0.3)" }}>Este registro no fue editado todavía.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px" style={{ backgroundColor: "rgba(212,197,169,0.4)" }} />
              <div className="space-y-5">
                {entries.map((entry) => {
                  const cambios = diffFields(entry.datos_anteriores, entry.datos_nuevos);
                  return (
                    <div key={entry.id} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10"
                        style={{ backgroundColor: "#ffffff", border: "2px solid var(--color-campo)" }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-campo)" }} />
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold" style={{ color: "var(--color-tierra)" }}>
                            {entry.modificado_por_nombre ?? "Usuario"}
                          </p>
                          <p className="text-[10px] tabular-nums" style={{ color: "rgba(26,26,24,0.4)" }}>
                            {fmtDate(entry.created_at)}
                          </p>
                        </div>
                        {cambios.length === 0 ? (
                          <p className="text-xs" style={{ color: "rgba(26,26,24,0.4)" }}>Sin campos modificados</p>
                        ) : (
                          <div className="space-y-1.5">
                            {cambios.map(({ campo, antes, despues }) => (
                              <div key={campo} className="px-3 py-2 rounded-lg text-xs"
                                style={{ backgroundColor: "rgba(212,197,169,0.12)", border: "1px solid rgba(212,197,169,0.3)" }}>
                                <span className="font-medium" style={{ color: "rgba(26,26,24,0.55)" }}>{campo}</span>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] line-through"
                                    style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                                    {String(antes ?? "—")}
                                  </span>
                                  <span className="text-[10px]" style={{ color: "rgba(26,26,24,0.35)" }}>→</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px]"
                                    style={{ backgroundColor: "rgba(22,163,74,0.09)", color: "#16a34a" }}>
                                    {String(despues ?? "—")}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
