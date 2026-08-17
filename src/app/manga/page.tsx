"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Settings, ScanLine, CheckCircle2, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useHidCapture } from "@/hooks/useHidCapture";
import { useSupabaseManga } from "@/hooks/useSupabaseManga";
import { useCamposConfig } from "@/hooks/useCamposConfig";
import { useSesiones } from "@/hooks/useSesiones";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { usePotreros } from "@/hooks/usePotreros";
import { getDeviceId, updateScanDatos } from "@/lib/offlineDb";
import { isValidEid } from "@/lib/eid";
import { LectorPanel, type SessionItem } from "@/components/manga/LectorPanel";
import { FichaAnimal } from "@/components/manga/FichaAnimal";
import { FormularioDinamico } from "@/components/manga/FormularioDinamico";
import { CrearAnimalForm, type AnimalNuevo } from "@/components/manga/CrearAnimalForm";
import { EditarAnimalForm } from "@/components/manga/EditarAnimalForm";
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
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [creatingAnimal, setCreatingAnimal] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sessionDate = new Date().toISOString().split("T")[0];

  const { loadingAnimal, saving, fetchAnimal, fetchRegistros, scanEid, createAnimal, updateAnimal, saveRegistro } =
    useSupabaseManga();
  const { campos, fetchCampos } = useCamposConfig();
  const { sesiones, fetchSesiones, createSesion } = useSesiones();
  const { online, pendingCount, cacheAnimalIndex, lookupLocal, enqueue } = useOfflineQueue();
  const { potreros, fetchPotreros } = usePotreros();

  const sessionItemsRef = useRef<SessionItem[]>([]);
  useEffect(() => {
    sessionItemsRef.current = sessionItems;
  }, [sessionItems]);

  // ── Init: establecimiento + user + campos + sesiones + caché de animales
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: estab }, { data: { user } }] = await Promise.all([
        supabase.from("establecimientos").select("id").limit(1).single(),
        supabase.auth.getUser(),
      ]);
      if (estab) {
        setEstablecimientoId(estab.id);
        fetchSesiones(estab.id);
        cacheAnimalIndex(estab.id);
        fetchPotreros(estab.id);
      }
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();
        setUserName(profile?.full_name || profile?.email || user.email || "Usuario");
      }
    })();
    fetchCampos(true);
  }, [fetchCampos, fetchSesiones, cacheAnimalIndex, fetchPotreros]);

  // ── Cuando la cola se vacía estando online, los ítems pendientes se ven sincronizados

  const loadRegistros = useCallback(
    async (eid: string) => {
      if (!establecimientoId) return;
      const regs = await fetchRegistros(eid, establecimientoId);
      setCurrentRegistros(regs);
    },
    [establecimientoId, fetchRegistros]
  );

  const selectEid = useCallback(
    async (eid: string) => {
      setSelectedEid(eid);
      setFormValues({});
      setCreatingAnimal(false);
      setEditingAnimal(false);
      const item = sessionItemsRef.current.find((i) => i.eid === eid);
      if (item) setCurrentClientId(item.clientId);

      if (online && establecimientoId) {
        const animal = await fetchAnimal(eid, establecimientoId);
        setCurrentAnimal(animal);
        loadRegistros(eid);
      } else {
        const cached = await lookupLocal(eid);
        setCurrentAnimal(cached ? (cached as MangaAnimal) : null);
        setCurrentRegistros([]);
      }
    },
    [online, establecimientoId, fetchAnimal, loadRegistros, lookupLocal]
  );

  const handleEid = useCallback(
    async (eid: string) => {
      if (!isValidEid(eid)) return;

      setProcessing(true);
      try {
        setSelectedEid(eid);
        setFormValues({});
        setCreatingAnimal(false);
        setEditingAnimal(false);

        const existing = sessionItemsRef.current.find((i) => i.eid === eid);
        if (existing) {
          setCurrentClientId(existing.clientId);
          if (online && establecimientoId) {
            const animal = await fetchAnimal(eid, establecimientoId);
            setCurrentAnimal(animal);
            loadRegistros(eid);
          } else {
            const cached = await lookupLocal(eid);
            setCurrentAnimal(cached ? (cached as MangaAnimal) : null);
            setCurrentRegistros([]);
          }
          return;
        }

        const clientId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const devId = getDeviceId();
        setCurrentClientId(clientId);
        setSessionItems((prev) => [
          { eid, clientId, vid: null, state: "pendiente", found: null, addedAt: timestamp },
          ...prev,
        ]);

        if (online) {
          const result = await scanEid({ eid, clientId, sessionId, deviceId: devId, timestamp });
          if (result.error) {
            await enqueue({ clientId, eid, sessionId, deviceId: devId, timestamp, datos: {} });
            const cached = await lookupLocal(eid);
            setCurrentAnimal(cached ? (cached as MangaAnimal) : null);
            setSessionItems((prev) =>
              prev.map((i) =>
                i.eid === eid
                  ? { ...i, state: "pendiente", found: cached ? true : null, vid: cached?.vid ?? null }
                  : i
              )
            );
          } else {
            setCurrentAnimal(result.animal);
            setSessionItems((prev) =>
              prev.map((i) =>
                i.eid === eid
                  ? { ...i, state: "sincronizado", found: result.found, vid: result.animal?.vid ?? null }
                  : i
              )
            );
            loadRegistros(eid);
          }
        } else {
          await enqueue({ clientId, eid, sessionId, deviceId: devId, timestamp, datos: {} });
          const cached = await lookupLocal(eid);
          setCurrentAnimal(cached ? (cached as MangaAnimal) : null);
          setSessionItems((prev) =>
            prev.map((i) =>
              i.eid === eid
                ? { ...i, state: "pendiente", found: cached ? true : null, vid: cached?.vid ?? null }
                : i
            )
          );
        }
      } finally {
        setProcessing(false);
      }
    },
    [online, sessionId, establecimientoId, scanEid, enqueue, lookupLocal, fetchAnimal, loadRegistros]
  );

  const hid = useHidCapture(handleEid);

  async function handleSave() {
    if (!selectedEid || !establecimientoId) return;

    const missing = campos.filter(
      (c) => c.obligatorio && (formValues[c.nombre] === undefined || formValues[c.nombre] === "")
    );
    if (missing.length > 0) {
      alert(`Campos obligatorios sin completar: ${missing.map((c) => c.etiqueta).join(", ")}`);
      return;
    }

    const clientId = currentClientId ?? crypto.randomUUID();
    if (!currentClientId) setCurrentClientId(clientId);

    if (online) {
      const ok = await saveRegistro({
        eid: selectedEid,
        clientId,
        sessionId,
        deviceId: getDeviceId(),
        datos: formValues,
        userName,
      });
      if (ok) {
        setSessionItems((prev) =>
          prev.map((i) => (i.eid === selectedEid ? { ...i, state: "sincronizado" } : i))
        );
        setFormValues({});
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
        const regs = await fetchRegistros(selectedEid, establecimientoId);
        setCurrentRegistros(regs);
      }
    } else {
      await updateScanDatos(clientId, formValues);
      setSessionItems((prev) =>
        prev.map((i) => (i.eid === selectedEid ? { ...i, state: "pendiente" } : i))
      );
      setFormValues({});
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    }
  }

  async function handleCreateAnimal(animal: AnimalNuevo) {
    if (!establecimientoId) return;
    setCreatingAnimal(true);
    const created = await createAnimal({
      eid: animal.eid,
      vid: animal.vid,
      raza: animal.raza,
      sexo: animal.sexo,
      fechaNacimiento: animal.fechaNacimiento,
      lote: animal.lote,
      categoria: animal.categoria,
      potreroId: animal.potreroId,
      fechaAplicacion: animal.fechaAplicacion,
      motivoDeclaracion: animal.motivoDeclaracion,
      establecimientoId,
    });
    setCreatingAnimal(false);
    if (created) {
      setCurrentAnimal(created);
      setSessionItems((prev) =>
        prev.map((i) => (i.eid === animal.eid ? { ...i, found: true, vid: created.vid } : i))
      );
      cacheAnimalIndex(establecimientoId);
    }
  }

  async function handleUpdateAnimal(payload: Parameters<typeof updateAnimal>[0]) {
    const updated = await updateAnimal(payload);
    if (updated) {
      setCurrentAnimal(updated);
      setEditingAnimal(false);
    } else {
      alert("No se pudo guardar el animal. Verificá tu conexión.");
    }
  }

  async function handleCreateSesion(nombre: string) {
    if (!establecimientoId) return;
    const sesion = await createSesion({ nombre, estabId: establecimientoId, usuario: userName });
    if (sesion) setSessionId(sesion.id);
  }

  const effectiveItems =
    online && pendingCount === 0
      ? sessionItems.map((i) =>
          i.state === "pendiente" ? { ...i, state: "sincronizado" as const } : i
        )
      : sessionItems;
  const sincronizados = effectiveItems.filter((i) => i.state === "sincronizado").length;

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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(58,74,50,0.1)" }}>
            <ScanLine size={18} style={{ color: "var(--color-campo)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold leading-tight"
              style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}
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
        >
          <Settings size={13} /> Configurar campos
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col md:flex-row gap-0 overflow-hidden">
        <aside
          className="md:w-80 shrink-0 p-4 overflow-y-auto border-b md:border-b-0 md:border-r"
          style={{ borderColor: "rgba(212,197,169,0.4)", maxHeight: "calc(100vh - 65px)" }}
        >
          <LectorPanel
            online={online}
            pendingCount={pendingCount}
            sesiones={sesiones}
            sesionId={sessionId}
            sessionItems={effectiveItems}
            selectedEid={selectedEid}
            lastEid={hid.lastEid}
            captureRef={hid.captureRef}
            onCommitEid={hid.commitEid}
            onSelectEid={selectEid}
            onSelectSesion={setSessionId}
            onCreateSesion={handleCreateSesion}
          />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 pb-20">
          <FichaAnimal
            eid={selectedEid}
            animal={currentAnimal}
            registros={currentRegistros}
            loading={loadingAnimal || processing}
            campos={campos}
            onEdit={() => setEditingAnimal(true)}
          />

          {selectedEid && editingAnimal && currentAnimal && (
            <EditarAnimalForm
              animal={currentAnimal}
              potreros={potreros}
              saving={saving}
              onSave={handleUpdateAnimal}
              onCancel={() => setEditingAnimal(false)}
            />
          )}

          {selectedEid && !loadingAnimal && !processing && !currentAnimal && (
            online ? (
              <CrearAnimalForm
                eid={selectedEid}
                saving={creatingAnimal}
                potreros={potreros}
                onCreate={handleCreateAnimal}
                onCancel={() => setSelectedEid(null)}
              />
            ) : (
              <div
                className="rounded-2xl p-4 flex items-start gap-2 text-sm"
                style={{ backgroundColor: "rgba(217,119,6,0.06)", color: "#d97706", border: "1px solid rgba(217,119,6,0.2)" }}
              >
                <WifiOff size={16} className="shrink-0 mt-0.5" />
                <span>
                  Animal no registrado y sin conexión. El EID quedó en la cola; conectate para
                  darlo de alta.
                </span>
              </div>
            )
          )}

          {selectedEid && currentAnimal && (
            <FormularioDinamico
              campos={campos}
              values={formValues}
              onChange={(key, value) => setFormValues((prev) => ({ ...prev, [key]: value }))}
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
                {sincronizados}
              </span>{" "}
              de{" "}
              <span className="font-semibold" style={{ color: "var(--color-tierra)" }}>
                {sessionItems.length}
              </span>{" "}
              animales guardados
            </p>
          )}
        </div>
        {establecimientoId && (
          <ExportCSV
            establecimientoId={establecimientoId}
            sessionDate={sessionDate}
            campos={campos}
            sessionCount={sincronizados}
          />
        )}
      </div>
    </div>
  );
}
