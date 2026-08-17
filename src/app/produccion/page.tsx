"use client";

import { useEffect, useMemo, useState } from "react";
import { Egg, Loader2, Plus, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProduccion } from "@/hooks/useProduccion";
import {
  TIPOS_MOVIMIENTO_GALLINA,
  calcularPostura,
  daysInclusive,
  maplesToHuevos,
  parseEnteroNoNegativo,
  type TipoMovimientoGallina,
} from "@/lib/produccion";

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "#ffffff",
  color: "var(--color-tierra)",
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtPostura(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export default function ProduccionPage() {
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const {
    lotes, registros, movimientos, loading, saving,
    fetchAll, createLote, updateLote, deactivateLote,
    findProduccion, saveProduccion, applyMovimiento,
  } = useProduccion();

  const [loteNombre, setLoteNombre] = useState("");
  const [loteCantidad, setLoteCantidad] = useState("");
  const [loteGalpon, setLoteGalpon] = useState("");
  const [editingLoteId, setEditingLoteId] = useState<string | null>(null);

  const [cargaLoteId, setCargaLoteId] = useState("");
  const [cargaFecha, setCargaFecha] = useState(todayISO);
  const [cargaMaples, setCargaMaples] = useState("");
  const [cargaMerma, setCargaMerma] = useState("");
  const [cargaObs, setCargaObs] = useState("");

  const [movLoteId, setMovLoteId] = useState("");
  const [movTipo, setMovTipo] = useState<TipoMovimientoGallina>("alta");
  const [movCantidad, setMovCantidad] = useState("");
  const [movFecha, setMovFecha] = useState(todayISO);
  const [movMotivo, setMovMotivo] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("establecimientos").select("id").limit(1).maybeSingle();
      if (data) {
        setEstablecimientoId(data.id);
        fetchAll(data.id);
      }
    })();
  }, [fetchAll]);

  const lotesActivos = lotes.filter((l) => l.activo);
  const loteById = useMemo(() => Object.fromEntries(lotes.map((l) => [l.id, l])), [lotes]);

  const postura7 = useMemo(() => {
    const desde = daysAgoISO(6);
    const hasta = todayISO();
    const dias = daysInclusive(desde, hasta);
    const map = new Map<string, number>();
    for (const l of lotes) {
      const rows = registros.filter((r) => r.lote_id === l.id && r.fecha >= desde && r.fecha <= hasta);
      const puestos = rows.reduce((s, r) => s + maplesToHuevos(r.maples) + r.merma, 0);
      map.set(l.id, calcularPostura(puestos, l.cantidad, dias) ?? NaN);
    }
    return map;
  }, [lotes, registros]);

  async function handleSaveLote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!establecimientoId) return;
    if (!loteNombre.trim()) { setError("El lote necesita un nombre."); return; }
    if (editingLoteId) {
      const { error: err } = await updateLote(editingLoteId, { nombre: loteNombre, galpon: loteGalpon.trim() || null });
      if (err) { setError(err); return; }
      setEditingLoteId(null);
    } else {
      const cant = parseEnteroNoNegativo(loteCantidad);
      if (cant === null) { setError("La cantidad de gallinas tiene que ser un entero de 0 en adelante."); return; }
      const { error: err } = await createLote({
        establecimiento_id: establecimientoId,
        nombre: loteNombre,
        cantidad: cant,
        galpon: loteGalpon.trim() || null,
        fecha_alta: todayISO(),
      });
      if (err) { setError(err); return; }
    }
    setLoteNombre("");
    setLoteCantidad("");
    setLoteGalpon("");
    setNotice("Lote guardado.");
  }

  async function handleCarga(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!establecimientoId) return;
    const lote = lotes.find((l) => l.id === cargaLoteId);
    if (!lote || !lote.activo) { setError("Ese lote está desactivado."); return; }
    const maples = parseEnteroNoNegativo(cargaMaples);
    const merma = parseEnteroNoNegativo(cargaMerma);
    if (maples === null || merma === null) {
      if (cargaMerma.trim() === "") { setError("La merma es obligatoria. Si no hubo, poné 0."); return; }
      setError("Maples y merma tienen que ser números enteros de 0 en adelante.");
      return;
    }
    const existing = findProduccion(cargaLoteId, cargaFecha);
    if (existing && !window.confirm("Ya hay carga para este lote en esa fecha. ¿Reemplazar?")) return;
    const { error: err } = await saveProduccion({
      establecimiento_id: establecimientoId,
      lote_id: cargaLoteId,
      fecha: cargaFecha,
      maples,
      merma,
      observaciones: cargaObs.trim() || null,
      replaceId: existing?.id,
    });
    if (err) { setError(err); return; }
    setCargaMaples("");
    setCargaMerma("");
    setCargaObs("");
    setNotice("Producción guardada.");
  }

  async function handleMovimiento(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!establecimientoId) return;
    const lote = lotes.find((l) => l.id === movLoteId);
    if (!lote || !lote.activo) { setError("Ese lote está desactivado."); return; }
    const cant = parseEnteroNoNegativo(movCantidad);
    if (cant === null || cant === 0) { setError("La cantidad tiene que ser un entero mayor a 0."); return; }
    const { error: err } = await applyMovimiento({
      establecimiento_id: establecimientoId,
      lote_id: movLoteId,
      tipo: movTipo,
      cantidad: cant,
      fecha: movFecha,
      motivo: movMotivo.trim() || null,
    });
    if (err) { setError(err); return; }
    setMovCantidad("");
    setMovMotivo("");
    setNotice("Movimiento registrado.");
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-8 pt-7 pb-5 border-b" style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,24,0.38)" }}>Huevos</p>
        <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Producción</h1>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {notice && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "rgba(58,74,50,0.08)", color: "var(--color-campo)" }}>{notice}</div>
        )}

        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Lotes</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin" style={{ color: "var(--color-campo)" }} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {lotes.map((l) => {
                const p = postura7.get(l.id);
                return (
                  <div key={l.id} className="rounded-xl p-4" style={{ border: "1px solid rgba(212,197,169,0.5)", opacity: l.activo ? 1 : 0.55 }}>
                    <p className="font-semibold" style={{ color: "var(--color-tierra)" }}>{l.nombre}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(26,26,24,0.45)" }}>{l.galpon || "Sin galpón"} · {l.cantidad} gallinas</p>
                    <p className="text-sm mt-2" style={{ color: "var(--color-campo)" }}>Postura 7d: {fmtPostura(p === undefined || Number.isNaN(p) ? null : p)}</p>
                    <div className="flex gap-2 mt-3">
                      <button type="button" className="text-xs font-medium" style={{ color: "var(--color-cuero)" }}
                        onClick={() => { setEditingLoteId(l.id); setLoteNombre(l.nombre); setLoteGalpon(l.galpon ?? ""); }}>
                        Editar
                      </button>
                      {l.activo && (
                        <button type="button" className="text-xs font-medium" style={{ color: "#dc2626" }}
                          onClick={() => deactivateLote(l.id)}>
                          Desactivar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <form onSubmit={handleSaveLote} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Nombre
              <input value={loteNombre} onChange={(e) => setLoteNombre(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            {!editingLoteId && (
              <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
                Gallinas
                <input value={loteCantidad} onChange={(e) => setLoteCantidad(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
              </label>
            )}
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Galpón
              <input value={loteGalpon} onChange={(e) => setLoteGalpon(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {editingLoteId ? "Guardar lote" : "Nuevo lote"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Egg size={16} style={{ color: "var(--color-campo)" }} />
            <h3 className="text-base font-semibold" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Carga del día</h3>
          </div>
          <form onSubmit={handleCarga} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Lote
              <select value={cargaLoteId} onChange={(e) => setCargaLoteId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
                <option value="">Elegí un lote</option>
                {lotesActivos.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Fecha
              <input type="date" value={cargaFecha} onChange={(e) => setCargaFecha(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Maples
              <input value={cargaMaples} onChange={(e) => setCargaMaples(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Merma (huevos)
              <input value={cargaMerma} onChange={(e) => setCargaMerma(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
              Guardar
            </button>
            <label className="text-xs font-medium sm:col-span-5" style={{ color: "rgba(26,26,24,0.5)" }}>
              Observaciones
              <input value={cargaObs} onChange={(e) => setCargaObs(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
          </form>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <div className="px-5 py-3" style={{ backgroundColor: "rgba(240,237,230,0.5)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-tierra)" }}>Historial</h3>
          </div>
          {registros.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>Sin cargas todavía.</p>
          ) : (
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    {["Fecha", "Lote", "Maples", "Huevos", "Merma"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase" style={{ color: "rgba(26,26,24,0.38)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, idx) => (
                    <tr key={r.id} style={{ borderTop: idx === 0 ? "none" : "1px solid rgba(212,197,169,0.22)" }}>
                      <td className="px-5 py-3 text-sm" style={{ color: "var(--color-tierra)" }}>{fmtFecha(r.fecha)}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{loteById[r.lote_id]?.nombre ?? "—"}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.maples}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{maplesToHuevos(r.maples)}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: "rgba(26,26,24,0.6)" }}>{r.merma}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(212,197,169,0.5)" }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}>Movimientos</h3>
          <form onSubmit={handleMovimiento} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end mb-4">
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Lote
              <select value={movLoteId} onChange={(e) => setMovLoteId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
                <option value="">Elegí un lote</option>
                {lotesActivos.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Tipo
              <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as TipoMovimientoGallina)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE}>
                {TIPOS_MOVIMIENTO_GALLINA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Cantidad
              <input value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <label className="text-xs font-medium" style={{ color: "rgba(26,26,24,0.5)" }}>
              Fecha
              <input type="date" value={movFecha} onChange={(e) => setMovFecha(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
            <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-campo)" }}>
              Registrar
            </button>
            <label className="text-xs font-medium sm:col-span-5" style={{ color: "rgba(26,26,24,0.5)" }}>
              Motivo
              <input value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none" style={INPUT_STYLE} />
            </label>
          </form>
          {movimientos.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>Sin movimientos.</p>
          ) : (
            <ul className="space-y-2">
              {movimientos.slice(0, 15).map((m) => (
                <li key={m.id} className="text-sm" style={{ color: "rgba(26,26,24,0.65)" }}>
                  {fmtFecha(m.fecha)} · {loteById[m.lote_id]?.nombre ?? "—"} · {m.tipo} {m.cantidad}
                  {m.motivo ? ` — ${m.motivo}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
