"use client";

import { useState } from "react";
import {
  ScanLine,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Keyboard,
} from "lucide-react";
import type { MangaSesion } from "@/hooks/useSesiones";

export interface SessionItem {
  eid: string;
  clientId: string;
  vid: string | null;
  state: "sincronizado" | "pendiente";
  found: boolean | null;
  addedAt: string;
}

interface LectorPanelProps {
  online: boolean;
  pendingCount: number;
  sesiones: MangaSesion[];
  sesionId: string | null;
  sessionItems: SessionItem[];
  selectedEid: string | null;
  lastEid: string | null;
  captureRef: React.RefObject<HTMLInputElement | null>;
  onCommitEid: (eid: string) => void;
  onSelectEid: (eid: string) => void;
  onSelectSesion: (id: string | null) => void;
  onCreateSesion: (nombre: string) => void;
}

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "var(--color-pampa)",
  color: "var(--color-tierra)",
};

export function LectorPanel({
  online,
  pendingCount,
  sesiones,
  sesionId,
  sessionItems,
  selectedEid,
  lastEid,
  captureRef,
  onCommitEid,
  onSelectEid,
  onSelectSesion,
  onCreateSesion,
}: LectorPanelProps) {
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  function handleCaptureBlur() {
    const ae = document.activeElement;
    const tag = ae?.tagName?.toLowerCase();
    if (["input", "textarea", "select", "button", "a"].includes(tag ?? "")) return;
    captureRef.current?.focus();
  }

  function handleNewSessionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombre = newSessionName.trim();
    if (!nombre) return;
    onCreateSesion(nombre);
    setNewSessionName("");
    setShowNewSession(false);
  }

  const sincronizados = sessionItems.filter((i) => i.state === "sincronizado").length;
  const pendientes = sessionItems.filter((i) => i.state === "pendiente").length;

  return (
    <div className="flex flex-col h-full">
      {/* Estado de conexión */}
      <div
        className="rounded-2xl p-4 mb-3"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid rgba(212,197,169,0.5)",
          boxShadow: "0 1px 4px rgba(26,26,24,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {online ? (
              <Wifi size={16} style={{ color: "#16a34a" }} />
            ) : (
              <WifiOff size={16} style={{ color: "#d97706" }} />
            )}
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: online ? "#16a34a" : "#d97706" }}
            >
              {online ? "En línea" : "Sin conexión"}
            </span>
          </div>
          {(pendientes > 0 || pendingCount > 0) && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(217,119,6,0.12)", color: "#d97706" }}
            >
              {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div
          className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-3"
          style={{
            backgroundColor: "rgba(58,74,50,0.06)",
            color: "var(--color-campo)",
            border: "1px solid rgba(58,74,50,0.15)",
          }}
        >
          <Keyboard size={13} className="shrink-0 mt-0.5" />
          <span>
            Poné el XRS2i en <b>Connect Mode → HID</b> y emparejalo como teclado.
            Escaneá con este campo enfocado.
          </span>
        </div>

        {/* Campo de captura (HID + manual) */}
        <label className="form-label">EID</label>
        <input
          ref={captureRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Escaneá o escribí el EID"
          maxLength={15}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono tracking-widest"
          style={INPUT_STYLE}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
            if (digits.length >= 15) onCommitEid(digits);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommitEid((e.target as HTMLInputElement).value);
            }
          }}
          onBlur={handleCaptureBlur}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--color-cuero)";
            e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
          }}
        />
        {lastEid && (
          <p className="text-[10px] mt-1.5 font-mono" style={{ color: "rgba(26,26,24,0.4)" }}>
            Última lectura: {lastEid}
          </p>
        )}
      </div>

      {/* Sesión de lectura */}
      <div
        className="rounded-2xl p-4 mb-3"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid rgba(212,197,169,0.5)",
          boxShadow: "0 1px 4px rgba(26,26,24,0.06)",
        }}
      >
        <label className="form-label">Sesión de lectura</label>
        {showNewSession ? (
          <form onSubmit={handleNewSessionSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="Ej: Vacunación Agosto 2026"
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={INPUT_STYLE}
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white shrink-0"
              style={{ backgroundColor: "var(--color-campo)" }}
            >
              Crear
            </button>
          </form>
        ) : (
          <div className="flex gap-2">
            <select
              value={sesionId ?? ""}
              onChange={(e) => onSelectSesion(e.target.value || null)}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={INPUT_STYLE}
            >
              <option value="">Sin sesión</option>
              {sesiones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewSession(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1"
              style={{
                color: "var(--color-campo)",
                border: "1px solid rgba(58,74,50,0.3)",
                backgroundColor: "rgba(58,74,50,0.04)",
              }}
            >
              <Plus size={12} /> Nueva
            </button>
          </div>
        )}
      </div>

      {/* Contadores */}
      <div className="flex gap-2 mb-3">
        <div
          className="flex-1 rounded-xl px-3 py-2 text-center"
          style={{ backgroundColor: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)" }}
        >
          <p className="text-lg font-bold tabular-nums" style={{ color: "#16a34a" }}>
            {sincronizados}
          </p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "#16a34a" }}>
            Guardados
          </p>
        </div>
        <div
          className="flex-1 rounded-xl px-3 py-2 text-center"
          style={{ backgroundColor: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}
        >
          <p className="text-lg font-bold tabular-nums" style={{ color: "#d97706" }}>
            {pendientes}
          </p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "#d97706" }}>
            Pendientes
          </p>
        </div>
      </div>

      {/* Lista de escaneos */}
      <div className="flex-1 overflow-y-auto">
        {sessionItems.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center justify-center py-10 text-center"
            style={{ backgroundColor: "rgba(212,197,169,0.12)", border: "1px dashed rgba(212,197,169,0.6)" }}
          >
            <ScanLine size={28} style={{ color: "rgba(26,26,24,0.2)" }} />
            <p className="mt-3 text-sm" style={{ color: "rgba(26,26,24,0.35)" }}>
              Sin animales escaneados
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sessionItems.map((item) => {
              const isSelected = item.eid === selectedEid;
              return (
                <button
                  key={item.eid}
                  onClick={() => onSelectEid(item.eid)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    backgroundColor: isSelected ? "rgba(58,74,50,0.1)" : "#ffffff",
                    border: isSelected ? "1.5px solid var(--color-campo)" : "1px solid rgba(212,197,169,0.5)",
                    boxShadow: isSelected ? "0 0 0 2px rgba(58,74,50,0.08)" : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold truncate" style={{ color: "var(--color-tierra)" }}>
                        {item.eid}
                      </p>
                      {item.vid && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(26,26,24,0.5)" }}>
                          VID: {item.vid}
                        </p>
                      )}
                    </div>
                    {item.state === "pendiente" ? (
                      <Clock size={13} className="shrink-0" style={{ color: "#d97706" }} />
                    ) : item.found === false ? (
                      <AlertCircle size={14} className="shrink-0" style={{ color: "#d97706" }} />
                    ) : (
                      <CheckCircle2 size={15} className="shrink-0" style={{ color: "#16a34a" }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
