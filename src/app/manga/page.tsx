"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Settings, ScanLine, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBluetooth } from "@/hooks/useBluetooth";
import { useSupabaseManga } from "@/hooks/useSupabaseManga";
import { useCamposConfig } from "@/hooks/useCamposConfig";
import { BluetoothPanel, type SessionItem } from "@/components/manga/BluetoothPanel";
import { FichaAnimal } from "@/components/manga/FichaAnimal";
import { FormularioDinamico } from "@/components/manga/FormularioDinamico";
import { ExportCSV } from "@/components/manga/ExportCSV";
import type { MangaAnimal, RegistroManga } from "@/hooks/useSupabaseManga";

export default function MangaPage() {
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuario");
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [selectedEid, setSelectedEid] = useState<string | null>(null);
  const [currentAnimal, setCurrentAnimal] = useState<MangaAnimal | null>(null);
  const [currentRegistros, setCurrentRegistros] = useState<RegistroManga[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean>>({});
  const [connecting, setConnecting] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const sessionDate = new Date().toISOString().split("T")[0];

  const { loadingAnimal, saving, fetchAnimal, fetchRegistros, saveRegistro } =
    useSupabaseManga();
  const { campos, fetchCampos } = useCamposConfig();

  // ── Init: fetch establecimiento + user profile + campos activos
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: estab }, { data: { user } }] = await Promise.all([
        supabase.from("establecimientos").select("id").limit(1).single(),
        supabase.auth.getUser(),
      ]);
      if (estab) setEstablecimientoId(estab.id);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();
        setUserName(profile?.full_name || profile?.email || user.email || "Usuario");
      }
    })();
    fetchCampos(true); // solo activos
  }, [fetchCampos]);

  // ── Load animal + registros for a given EID
  const loadEid = useCallback(
    async (eid: string) => {
      if (!establecimientoId) return;
      setSelectedEid(eid);
      setFormValues({});
      const [animal, registros] = await Promise.all([
        fetchAnimal(eid, establecimientoId),
        fetchRegistros(eid, establecimientoId),
      ]);
      setCurrentAnimal(animal);
      setCurrentRegistros(registros);
    },
    [establecimientoId, fetchAnimal, fetchRegistros]
  );

  // ── Handle new EID (from BLE or manual)
  const handleNewEid = useCallback(
    (eid: string) => {
      setSessionItems((prev) => {
        if (prev.some((i) => i.eid === eid)) return prev;
        return [
          { eid, vid: null, savedAt: null, addedAt: new Date().toISOString() },
          ...prev,
        ];
      });
      loadEid(eid);
    },
    [loadEid]
  );

  // ── After fetchAnimal completes, update VID in session list
  useEffect(() => {
    if (!selectedEid || !currentAnimal) return;
    setSessionItems((prev) =>
      prev.map((i) =>
        i.eid === selectedEid ? { ...i, vid: currentAnimal.vid } : i
      )
    );
  }, [selectedEid, currentAnimal]);

  // ── Bluetooth hook
  const bt = useBluetooth(handleNewEid);

  async function handleConnect() {
    setConnecting(true);
    await bt.connect();
    setConnecting(false);
  }

  // ── Save registro
  async function handleSave() {
    if (!selectedEid || !establecimientoId) return;

    // Validate required fields
    const missing = campos.filter(
      (c) => c.obligatorio && (formValues[c.nombre] === undefined || formValues[c.nombre] === "")
    );
    if (missing.length > 0) {
      alert(`Campos obligatorios sin completar: ${missing.map((c) => c.etiqueta).join(", ")}`);
      return;
    }

    const ok = await saveRegistro({
      eid: selectedEid,
      animalId: currentAnimal?.id ?? null,
      datos: formValues,
      establecimientoId,
      userName,
    });

    if (ok) {
      setSessionItems((prev) =>
        prev.map((i) =>
          i.eid === selectedEid
            ? { ...i, savedAt: new Date().toISOString() }
            : i
        )
      );
      setFormValues({});
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
      // Refresh registros
      const registros = await fetchRegistros(selectedEid, establecimientoId);
      setCurrentRegistros(registros);
    }
  }

  const savedCount = sessionItems.filter((i) => i.savedAt).length;

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "rgba(212,197,169,0.5)",
          boxShadow: "0 1px 4px rgba(26,26,24,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(58,74,50,0.1)" }}
          >
            <ScanLine size={18} style={{ color: "var(--color-campo)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold leading-tight"
              style={{
                color: "var(--color-tierra)",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}
            >
              Manga
            </h1>
            <p className="text-xs" style={{ color: "rgba(26,26,24,0.45)" }}>
              {sessionDate} · {userName}
            </p>
          </div>
        </div>
        <Link
          href="/manga/configuracion"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            color: "var(--color-campo)",
            border: "1px solid rgba(58,74,50,0.3)",
            backgroundColor: "rgba(58,74,50,0.04)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(58,74,50,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(58,74,50,0.04)";
          }}
        >
          <Settings size={13} /> Configurar campos
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col md:flex-row gap-0 overflow-hidden">
        {/* Left panel */}
        <aside
          className="md:w-80 shrink-0 p-4 overflow-y-auto border-b md:border-b-0 md:border-r"
          style={{
            borderColor: "rgba(212,197,169,0.4)",
            maxHeight: "calc(100vh - 65px)",
          }}
        >
          <BluetoothPanel
            isSupported={bt.isSupported}
            isConnected={bt.isConnected}
            btError={bt.error}
            sessionItems={sessionItems}
            selectedEid={selectedEid}
            connecting={connecting}
            onConnect={handleConnect}
            onDisconnect={bt.disconnect}
            onSelectEid={loadEid}
            onManualEid={handleNewEid}
          />
        </aside>

        {/* Right panel */}
        <main className="flex-1 overflow-y-auto p-4 pb-20">
          <FichaAnimal
            eid={selectedEid}
            animal={currentAnimal}
            registros={currentRegistros}
            loading={loadingAnimal}
            campos={campos}
          />

          {selectedEid && (
            <FormularioDinamico
              campos={campos}
              values={formValues}
              onChange={(key, value) =>
                setFormValues((prev) => ({ ...prev, [key]: value }))
              }
              onSave={handleSave}
              saving={saving}
              disabled={!establecimientoId}
            />
          )}
        </main>
      </div>

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 md:left-60 z-10 flex items-center justify-between px-6 py-3 border-t"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "rgba(212,197,169,0.5)",
          boxShadow: "0 -2px 8px rgba(26,26,24,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          {savedNotice ? (
            <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#16a34a" }}>
              <CheckCircle2 size={16} />
              Guardado correctamente
            </div>
          ) : (
            <p className="text-sm" style={{ color: "rgba(26,26,24,0.5)" }}>
              <span className="font-semibold" style={{ color: "var(--color-tierra)" }}>
                {savedCount}
              </span>
              {" "}de{" "}
              <span className="font-semibold" style={{ color: "var(--color-tierra)" }}>
                {sessionItems.length}
              </span>
              {" "}animales guardados
            </p>
          )}
        </div>
        {establecimientoId && (
          <ExportCSV
            establecimientoId={establecimientoId}
            sessionDate={sessionDate}
            campos={campos}
            sessionCount={savedCount}
          />
        )}
      </div>
    </div>
  );
}
