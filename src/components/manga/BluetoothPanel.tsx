"use client";

import { useState } from "react";
import { Bluetooth, BluetoothOff, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

export interface SessionItem {
  eid: string;
  vid: string | null;
  savedAt: string | null; // null = pending
  addedAt: string;
}

interface BluetoothPanelProps {
  isSupported: boolean;
  isConnected: boolean;
  btError: string | null;
  sessionItems: SessionItem[];
  selectedEid: string | null;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectEid: (eid: string) => void;
  onManualEid: (eid: string) => void;
}

const INPUT_STYLE = {
  border: "1.5px solid rgba(212,197,169,0.8)",
  backgroundColor: "var(--color-pampa)",
  color: "var(--color-tierra)",
};

export function BluetoothPanel({
  isSupported,
  isConnected,
  btError,
  sessionItems,
  selectedEid,
  connecting,
  onConnect,
  onDisconnect,
  onSelectEid,
  onManualEid,
}: BluetoothPanelProps) {
  const [manualEid, setManualEid] = useState("");

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eid = manualEid.trim().replace(/\D/g, "").slice(0, 15);
    if (eid.length >= 10) {
      onManualEid(eid);
      setManualEid("");
    }
  }

  const saved = sessionItems.filter((i) => i.savedAt).length;
  const pending = sessionItems.filter((i) => !i.savedAt).length;

  return (
    <div className="flex flex-col h-full">
      {/* BT connection block */}
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
            {isConnected ? (
              <Bluetooth size={16} style={{ color: "#16a34a" }} />
            ) : (
              <BluetoothOff size={16} style={{ color: "rgba(26,26,24,0.35)" }} />
            )}
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: isConnected ? "#16a34a" : "rgba(26,26,24,0.45)" }}
            >
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
          {isSupported && (
            <button
              onClick={isConnected ? onDisconnect : onConnect}
              disabled={connecting}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: isConnected
                  ? "rgba(220,38,38,0.07)"
                  : "var(--color-campo)",
                color: isConnected ? "#dc2626" : "#ffffff",
                border: isConnected ? "1px solid rgba(220,38,38,0.2)" : "none",
                opacity: connecting ? 0.6 : 1,
              }}
            >
              {connecting && <Loader2 size={11} className="animate-spin" />}
              {isConnected ? "Desconectar" : "Conectar bastón"}
            </button>
          )}
        </div>

        {!isSupported && (
          <p
            className="text-xs rounded-lg px-3 py-2"
            style={{
              backgroundColor: "rgba(217,119,6,0.07)",
              color: "#d97706",
              border: "1px solid rgba(217,119,6,0.2)",
            }}
          >
            Bluetooth no disponible en este navegador. Usá Chrome/Edge desktop o
            ingresá el EID manualmente.
          </p>
        )}

        {btError && (
          <div
            className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 mt-2"
            style={{
              backgroundColor: "rgba(220,38,38,0.06)",
              color: "#dc2626",
              border: "1px solid rgba(220,38,38,0.15)",
            }}
          >
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {btError}
          </div>
        )}

        {/* Manual EID input */}
        <form onSubmit={handleManualSubmit} className="mt-3">
          <label className="form-label">EID manual</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={manualEid}
              onChange={(e) => setManualEid(e.target.value)}
              placeholder="276000420012345"
              maxLength={15}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none font-mono"
              style={INPUT_STYLE}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-cuero)";
                e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(212,197,169,0.8)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white shrink-0"
              style={{ backgroundColor: "var(--color-campo)" }}
            >
              OK
            </button>
          </div>
        </form>
      </div>

      {/* Session stats */}
      <div className="flex gap-2 mb-3">
        <div
          className="flex-1 rounded-xl px-3 py-2 text-center"
          style={{
            backgroundColor: "rgba(22,163,74,0.08)",
            border: "1px solid rgba(22,163,74,0.15)",
          }}
        >
          <p className="text-lg font-bold tabular-nums" style={{ color: "#16a34a" }}>
            {saved}
          </p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "#16a34a" }}>
            Guardados
          </p>
        </div>
        <div
          className="flex-1 rounded-xl px-3 py-2 text-center"
          style={{
            backgroundColor: "rgba(217,119,6,0.08)",
            border: "1px solid rgba(217,119,6,0.2)",
          }}
        >
          <p className="text-lg font-bold tabular-nums" style={{ color: "#d97706" }}>
            {pending}
          </p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "#d97706" }}>
            Pendientes
          </p>
        </div>
      </div>

      {/* Scan list */}
      <div className="flex-1 overflow-y-auto">
        {sessionItems.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center justify-center py-10 text-center"
            style={{
              backgroundColor: "rgba(212,197,169,0.12)",
              border: "1px dashed rgba(212,197,169,0.6)",
            }}
          >
            <Bluetooth size={28} style={{ color: "rgba(26,26,24,0.2)" }} />
            <p className="mt-3 text-sm" style={{ color: "rgba(26,26,24,0.35)" }}>
              Sin animales escaneados
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(26,26,24,0.25)" }}>
              Conectá el bastón o ingresá un EID
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
                    backgroundColor: isSelected
                      ? "rgba(58,74,50,0.1)"
                      : "#ffffff",
                    border: isSelected
                      ? "1.5px solid var(--color-campo)"
                      : "1px solid rgba(212,197,169,0.5)",
                    boxShadow: isSelected
                      ? "0 0 0 2px rgba(58,74,50,0.08)"
                      : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="text-xs font-mono font-semibold truncate"
                        style={{ color: "var(--color-tierra)" }}
                      >
                        {item.eid}
                      </p>
                      {item.vid && (
                        <p
                          className="text-[10px] mt-0.5 truncate"
                          style={{ color: "rgba(26,26,24,0.5)" }}
                        >
                          VID: {item.vid}
                        </p>
                      )}
                    </div>
                    {item.savedAt ? (
                      <CheckCircle2 size={15} className="shrink-0" style={{ color: "#16a34a" }} />
                    ) : (
                      <Clock size={13} className="shrink-0" style={{ color: "#d97706" }} />
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
