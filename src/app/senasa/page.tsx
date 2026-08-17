"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Download, Loader2, AlertTriangle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidEid } from "@/lib/eid";
import { MOTIVOS_DECLARACION } from "@/lib/senasa";
import { buildSenasaCsv, buildSenasaTxt, type SenasaRow } from "@/lib/senasaExport";

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "#ffffff",
  color: "var(--color-tierra)",
};

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function SenasaPage() {
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [renspa, setRenspa] = useState("");
  const [savingRenspa, setSavingRenspa] = useState(false);
  const [renspaSaved, setRenspaSaved] = useState(false);
  const [rows, setRows] = useState<SenasaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMotivo, setFiltroMotivo] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: estab } = await supabase
      .from("establecimientos")
      .select("id, renspa")
      .limit(1)
      .single();
    if (!estab) { setLoading(false); return; }
    setEstablecimientoId(estab.id);
    setRenspa(estab.renspa ?? "");
    const { data } = await supabase
      .from("manga_animales")
      .select("eid, vid, sexo, raza, fecha_nacimiento, fecha_aplicacion, motivo_declaracion")
      .eq("establecimiento_id", estab.id)
      .order("eid");
    setRows((data ?? []) as SenasaRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveRenspa() {
    if (!establecimientoId) return;
    setSavingRenspa(true);
    const supabase = createClient();
    await supabase.from("establecimientos").update({ renspa: renspa.trim() || null }).eq("id", establecimientoId);
    setSavingRenspa(false);
    setRenspaSaved(true);
    setTimeout(() => setRenspaSaved(false), 2500);
  }

  const filtered = rows.filter((r) => {
    if (filtroMotivo && (r.motivo_declaracion ?? "") !== filtroMotivo) return false;
    if (filtroFechaDesde && r.fecha_aplicacion && r.fecha_aplicacion < filtroFechaDesde) return false;
    if (filtroFechaHasta && r.fecha_aplicacion && r.fecha_aplicacion > filtroFechaHasta) return false;
    return true;
  });

  const invalidos = filtered.filter((r) => !isValidEid(r.eid));
  const sinDeclarar = filtered.filter((r) => !r.fecha_aplicacion || !r.motivo_declaracion);

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    if (filtered.length === 0) { alert("No hay caravanas para exportar."); return; }
    download(`senasa_caravanas_${new Date().toISOString().split("T")[0]}.csv`, buildSenasaCsv(filtered), "text/csv;charset=utf-8;");
  }

  function handleExportTxt() {
    if (filtered.length === 0) { alert("No hay caravanas para exportar."); return; }
    if (!renspa) { alert("Completá el RENSPA antes de exportar el TXT."); return; }
    const fecha = filtroFechaDesde || new Date().toISOString().split("T")[0];
    const motivo = filtroMotivo || "Novedad por nacimiento";
    download("senasa_caravanas.txt", buildSenasaTxt(filtered, renspa, fecha, motivo), "text/plain;charset=utf-8;");
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Trazabilidad</p>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>SENASA</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ border: "1.5px solid rgba(212,197,169,0.8)", color: "var(--color-tierra)", backgroundColor: "transparent" }}>
              <Download size={15} /> CSV
            </button>
            <button onClick={handleExportTxt} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-campo)" }}>
              <Download size={15} /> TXT (SIGSA)
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col gap-4">
        {/* Config RENSPA */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} style={{ color: "var(--color-campo)" }} />
            <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>RENSPA del establecimiento</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input type="text" value={renspa} onChange={(e) => setRenspa(e.target.value)} placeholder="Ingresá el número de RENSPA"
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style={INPUT_STYLE}
              onFocus={(e) => { e.target.style.borderColor = "var(--color-cuero)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(212,197,169,0.8)"; }} />
            <button onClick={handleSaveRenspa} disabled={savingRenspa}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-campo)", opacity: savingRenspa ? 0.7 : 1 }}>
              {savingRenspa ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {renspaSaved ? "Guardado" : "Guardar"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
            <option value="">Todos los motivos</option>
            {MOTIVOS_DECLARACION.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
          <span className="text-sm" style={{ color: "rgba(26,26,24,0.3)" }}>→</span>
          <input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>Caravanas</p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-tierra)" }}>{filtered.length}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>Sin declarar</p>
            <p className="text-2xl font-bold" style={{ color: "#d97706" }}>{sinDeclarar.length}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(220,38,38,0.3)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(26,26,24,0.45)" }}>EID inválidos</p>
            <p className="text-2xl font-bold" style={{ color: "#dc2626" }}>{invalidos.length}</p>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color: "var(--color-campo)" }} /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShieldCheck size={28} style={{ color: "rgba(26,26,24,0.15)" }} />
              <p className="text-sm mt-3" style={{ color: "rgba(26,26,24,0.4)" }}>Sin caravanas registradas.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(212,197,169,0.4)" }}>
                    {["EID", "VID", "Sexo", "Raza", "Nacimiento", "Aplicación", "Motivo"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)", backgroundColor: "rgba(240,237,230,0.5)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const inv = !isValidEid(r.eid);
                    return (
                      <tr key={r.eid} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(212,197,169,0.22)" : "none" }}>
                        <td className="px-5 py-3 text-sm font-mono" style={{ color: inv ? "#dc2626" : "var(--color-tierra)" }}>{r.eid}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.vid ?? "—"}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.sexo ?? "—"}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.raza ?? "—"}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{fmtFecha(r.fecha_nacimiento)}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{fmtFecha(r.fecha_aplicacion)}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>
                          {r.motivo_declaracion ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(58,74,50,0.1)", color: "var(--color-campo)" }}>{r.motivo_declaracion}</span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(217,119,6,0.08)", color: "#d97706" }}>Pendiente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {invalidos.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}>
            <AlertTriangle size={15} /> Hay {invalidos.length} EID inválidos (deben tener 15 dígitos). Corregilos en Manga.
          </div>
        )}
      </div>
    </div>
  );
}
