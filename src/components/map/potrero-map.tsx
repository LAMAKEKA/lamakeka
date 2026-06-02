"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PotreroPin {
  id: string;
  nombre: string;
  hectareas: number;
  cabezas: number;
  estado: string;
  latitud: number | null;
  longitud: number | null;
}

const ESTADO: Record<string, { color: string; bg: string; label: string }> = {
  activo:        { color: "#16a34a", bg: "rgba(22,163,74,0.13)",  label: "Activo" },
  descanso:      { color: "#d97706", bg: "rgba(217,119,6,0.13)",  label: "Descanso" },
  mantenimiento: { color: "#dc2626", bg: "rgba(220,38,38,0.11)",  label: "Mantenimiento" },
};

function makeIcon(estado: string) {
  const color = (ESTADO[estado] ?? ESTADO.activo).color;
  return L.divIcon({
    html: `<span style="display:block;width:14px;height:14px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.35)"></span>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function popupHTML(p: PotreroPin): string {
  const e = ESTADO[p.estado] ?? ESTADO.activo;
  return `
    <div style="min-width:148px;font-family:system-ui,sans-serif">
      <p style="margin:0 0 5px;font-size:14px;font-weight:600;color:#1a1a18">${p.nombre}</p>
      <p style="margin:0 0 3px;font-size:12px;color:#666"><b style="color:#1a1a18">${Number(p.hectareas).toLocaleString("es-AR")}</b> ha</p>
      <p style="margin:0 0 6px;font-size:12px;color:#666"><b style="color:#1a1a18">${Number(p.cabezas).toLocaleString("es-AR")}</b> cabezas</p>
      <span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${e.bg};color:${e.color}">${e.label}</span>
    </div>
  `;
}

const AR_CENTER: [number, number] = [-36.6, -64.1];

export default function PotrerosMap({
  potreros,
  mini = false,
}: {
  potreros: PotreroPin[];
  mini?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Initialize once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: AR_CENTER,
      zoom: mini ? 4 : 5,
      zoomControl: !mini,
      scrollWheelZoom: !mini,
      doubleClickZoom: !mini,
      attributionControl: !mini,
    });

    // Satellite base layer
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "© Esri", maxZoom: 18 }
    ).addTo(map);

    // Place name labels on top
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { attribution: "", maxZoom: 18, opacity: 0.85 }
    ).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers whenever potreros change
  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    const pins = potreros.filter((p) => p.latitud != null && p.longitud != null);
    const markers: L.Marker[] = [];

    pins.forEach((p) => {
      const m = L.marker([p.latitud!, p.longitud!], { icon: makeIcon(p.estado) }).bindPopup(
        popupHTML(p),
        { maxWidth: 220 }
      );
      layer.addLayer(m);
      markers.push(m);
    });

    if (markers.length > 0 && !mini) {
      try {
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.3), { maxZoom: 14 });
      } catch { /* single point or invalid bounds */ }
    }
  }, [potreros, mini]);

  const withCoords = potreros.filter((p) => p.latitud != null && p.longitud != null).length;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend (full map only) */}
      {!mini && (
        <div
          className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 px-3 py-2.5 rounded-xl"
          style={{
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(212,197,169,0.5)",
          }}
        >
          {Object.entries(ESTADO).map(([, info]) => (
            <div key={info.label} className="flex items-center gap-2">
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  background: info.color,
                  borderRadius: "50%",
                  border: "1.5px solid white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  flexShrink: 0,
                }}
              />
              <span className="text-xs font-medium" style={{ color: "#1a1a18" }}>
                {info.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* "Ver mapa completo" (mini map only) */}
      {mini && (
        <a
          href="/potreros?tab=mapa"
          className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: "rgba(26,26,24,0.72)", backdropFilter: "blur(4px)" }}
        >
          Ver mapa completo →
        </a>
      )}

      {/* No-coordinates overlay */}
      {withCoords === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div
            className="px-5 py-3 rounded-xl text-center"
            style={{
              backgroundColor: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(212,197,169,0.5)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--color-tierra)" }}>
              {potreros.length === 0
                ? "Sin potreros configurados"
                : `${potreros.length} potrero${potreros.length !== 1 ? "s" : ""} sin ubicación`}
            </p>
            {!mini && potreros.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "rgba(26,26,24,0.5)" }}>
                Agregá latitud y longitud al crear un potrero
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
