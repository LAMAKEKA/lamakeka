"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock, AlertTriangle, Beef } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Animal {
  categoria: string;
  potrero: string;
  cantidad: number;
  fecha: string;
  tipo: string | null;
}

interface PrenezReport {
  categoria: string;
  fecha_diagnostico: string;
  total_diagnosticadas: number;
  prenadas: number;
}

interface Gasto {
  categoria: string;
  tipo: "ingreso" | "gasto";
  monto: number;
  fecha: string;
}

interface Insumo {
  nombre: string;
  categoria: string;
  inventario: number;
  minimo: number;
  unidad: string;
}

interface Tarea {
  prioridad: "alta" | "media" | "baja";
  fecha_limite: string;
  completada: boolean;
}

type Tab = "hacienda" | "finanzas" | "insumos" | "tareas";

const TABS: { key: Tab; label: string }[] = [
  { key: "hacienda", label: "Hacienda" },
  { key: "finanzas", label: "Finanzas" },
  { key: "insumos",  label: "Insumos"  },
  { key: "tareas",   label: "Tareas"   },
];

// ─── Palette ──────────────────────────────────────────────────────────────────

const CAMPO = "#3a4a32";
const CUERO = "#8b4e2a";
const TIERRA = "#7a6240";

const CAT_PIE_COLORS: Record<string, string> = {
  Terneros:    "#2563eb",
  Novillos:    CAMPO,
  Vacas:       CUERO,
  Vaquillonas: "#d97706",
  Toros:       "#dc2626",
  Alimentación:       "#16a34a",
  Sanidad:            "#2563eb",
  Combustible:        "#d97706",
  Administración:     CUERO,
  Estructuras:        "#7c3aed",
  "Mano de obra":     "#0891b2",
  "Venta de hacienda":"#16a34a",
  Arrendamiento:      "#2563eb",
  Otros:              "#9ca3af",
};

function pickColor(label: string, idx: number): string {
  return CAT_PIE_COLORS[label] ?? ["#3a4a32","#8b4e2a","#2563eb","#d97706","#16a34a","#7c3aed","#0891b2","#dc2626","#9ca3af"][idx % 9];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortMonth(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleString("es-AR", { month: "short" }).replace(".", "");
}

function last6Months(): { key: string; label: string }[] {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("es-AR", { month: "short" }).replace(".", "");
    result.push({ key, label });
  }
  return result;
}

function fmtMonto(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR")}`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm shadow-lg"
      style={{ backgroundColor: "rgba(255,255,255,0.97)", border: "1px solid rgba(212,197,169,0.4)" }}
    >
      <p className="font-semibold mb-1" style={{ color: "#1a1a18" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? CAMPO }}>
          {p.name}: <b>{typeof p.value === "number" && p.value > 1000 ? fmtMonto(p.value) : p.value.toLocaleString("es-AR")}</b>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm shadow-lg"
      style={{ backgroundColor: "rgba(255,255,255,0.97)", border: "1px solid rgba(212,197,169,0.4)" }}
    >
      <p className="font-semibold" style={{ color: "#1a1a18" }}>{p.name}</p>
      <p style={{ color: CAMPO }}><b>{p.value.toLocaleString("es-AR")}</b></p>
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, color,
}: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-start gap-4"
      style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,197,169,0.35)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: "rgba(26,26,24,0.45)" }}>{label}</p>
        <p className="text-xl font-bold" style={{ color: "#1a1a18" }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.4)" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(212,197,169,0.35)" }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: TIERRA }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabHaciendaProps = { animales: Animal[]; prenezData: PrenezReport[]; loading: boolean };
type TabFinanzasProps = { gastos: Gasto[]; loading: boolean };
type TabInsumosProps = { insumos: Insumo[]; loading: boolean };
type TabTareasProps = { tareas: Tarea[]; loading: boolean };

// ── Hacienda Tab ─────────────────────────────────────────────────────────────

const TIPOS_EGRESO_H = new Set<string>(["Venta", "Muerte", "Transferencia salida"]);

function TabHacienda({ animales, prenezData, loading }: TabHaciendaProps) {
  if (loading) return <LoadingState />;
  if (animales.length === 0) return <EmptyState label="Sin registros de hacienda" />;

  const months = last6Months();

  // Net totals
  const totalNeto = animales.reduce(
    (s, a) => s + (TIPOS_EGRESO_H.has(a.tipo ?? "Ingreso") ? -a.cantidad : a.cantidad),
    0
  );
  const totalIngrH = animales.filter((a) => !TIPOS_EGRESO_H.has(a.tipo ?? "Ingreso")).reduce((s, a) => s + a.cantidad, 0);
  const totalEgrH = animales.filter((a) => TIPOS_EGRESO_H.has(a.tipo ?? "Ingreso")).reduce((s, a) => s + a.cantidad, 0);

  // Ingresos vs egresos por mes
  const cabezasPorMes = months.map(({ key, label }) => {
    const ing = animales
      .filter((a) => a.fecha.startsWith(key) && !TIPOS_EGRESO_H.has(a.tipo ?? "Ingreso"))
      .reduce((s, a) => s + a.cantidad, 0);
    const egr = animales
      .filter((a) => a.fecha.startsWith(key) && TIPOS_EGRESO_H.has(a.tipo ?? "Ingreso"))
      .reduce((s, a) => s + a.cantidad, 0);
    return { mes: label, Ingresos: ing, Egresos: egr };
  });

  // Distribución por categoría (neto)
  const catMap: Record<string, number> = {};
  animales.forEach((a) => {
    const delta = TIPOS_EGRESO_H.has(a.tipo ?? "Ingreso") ? -a.cantidad : a.cantidad;
    catMap[a.categoria] = (catMap[a.categoria] ?? 0) + delta;
  });
  const catData = Object.entries(catMap)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top 5 potreros (neto)
  const potreroMap: Record<string, number> = {};
  animales.forEach((a) => {
    const delta = TIPOS_EGRESO_H.has(a.tipo ?? "Ingreso") ? -a.cantidad : a.cantidad;
    potreroMap[a.potrero] = (potreroMap[a.potrero] ?? 0) + delta;
  });
  const top5 = Object.entries(potreroMap)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxTop = top5[0]?.[1] ?? 1;

  return (
    <div className="space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Cabezas neto" value={totalNeto.toLocaleString("es-AR")} sub="Stock actual estimado" icon={Beef} color={CAMPO} />
        <MetricCard label="Total ingresos" value={totalIngrH.toLocaleString("es-AR")} sub="Compras y nacimientos" icon={TrendingUp} color="#16a34a" />
        <MetricCard label="Total egresos" value={totalEgrH.toLocaleString("es-AR")} sub="Ventas, muertes y transferencias" icon={TrendingDown} color="#dc2626" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Ingresos vs Egresos — últimos 6 meses">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cabezasPorMes} barSize={20} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,197,169,0.3)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Egresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Distribución por categoría (neto)">
          {catData.length === 0 ? (
            <EmptyState label="Sin datos positivos" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {catData.map((entry, idx) => (
                      <Cell key={entry.name} fill={pickColor(entry.name, idx)} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {catData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pickColor(entry.name, idx) }} />
                    <span className="text-xs flex-1 truncate" style={{ color: "rgba(26,26,24,0.6)" }}>{entry.name}</span>
                    <span className="text-xs font-semibold" style={{ color: "#1a1a18" }}>{entry.value.toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {prenezData.length > 0 && (() => {
        const byCat = prenezData.reduce((acc, p) => {
          if (!acc[p.categoria]) acc[p.categoria] = { total: 0, prenadas: 0 };
          acc[p.categoria].total += p.total_diagnosticadas;
          acc[p.categoria].prenadas += p.prenadas;
          return acc;
        }, {} as Record<string, { total: number; prenadas: number }>);
        const chartData = Object.entries(byCat)
          .map(([name, d]) => ({ name, pct: d.total > 0 ? Math.round((d.prenadas / d.total) * 100) : 0 }))
          .sort((a, b) => b.pct - a.pct);
        return (
          <Section title="Porcentaje de preñez por categoría">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,197,169,0.3)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pct" name="% Preñez" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.pct >= 70 ? "#16a34a" : entry.pct >= 50 ? "#d97706" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        );
      })()}

      <Section title="Top 5 potreros por stock neto">
        {top5.length === 0 ? (
          <EmptyState label="Sin datos" />
        ) : (
          <div className="space-y-3">
            {top5.map(([potrero, total], idx) => (
              <div key={potrero} className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: idx === 0 ? `${CAMPO}22` : "rgba(212,197,169,0.25)", color: idx === 0 ? CAMPO : "rgba(26,26,24,0.5)" }}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-medium flex-1 truncate" style={{ color: "#1a1a18" }}>{potrero}</span>
                <div className="flex-1 max-w-[180px]">
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(212,197,169,0.25)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(total / maxTop) * 100}%`, backgroundColor: CAMPO, opacity: 1 - idx * 0.12 }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold w-16 text-right" style={{ color: "#1a1a18" }}>
                  {total.toLocaleString("es-AR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Finanzas Tab ──────────────────────────────────────────────────────────────

function TabFinanzas({ gastos, loading }: TabFinanzasProps) {
  if (loading) return <LoadingState />;

  const months = last6Months();

  const ingresos = gastos.filter((g) => g.tipo === "ingreso");
  const egresos = gastos.filter((g) => g.tipo === "gasto");
  const totalIngresos = ingresos.reduce((s, g) => s + g.monto, 0);
  const totalGastos = egresos.reduce((s, g) => s + g.monto, 0);
  const balance = totalIngresos - totalGastos;

  // Barras agrupadas por mes
  const barData = months.map(({ key, label }) => {
    const ing = ingresos.filter((g) => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0);
    const eg = egresos.filter((g) => g.fecha.startsWith(key)).reduce((s, g) => s + g.monto, 0);
    return { mes: label, Ingresos: ing, Gastos: eg };
  });

  // Pie gastos por categoría
  const catGastoMap: Record<string, number> = {};
  egresos.forEach((g) => { catGastoMap[g.categoria] = (catGastoMap[g.categoria] ?? 0) + g.monto; });
  const catGastoData = Object.entries(catGastoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (gastos.length === 0) return <EmptyState label="Sin registros de finanzas" />;

  return (
    <div className="space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Ingresos"
          value={fmtMonto(totalIngresos)}
          icon={TrendingUp}
          color="#16a34a"
        />
        <MetricCard
          label="Total Gastos"
          value={fmtMonto(totalGastos)}
          icon={TrendingDown}
          color="#dc2626"
        />
        <MetricCard
          label="Balance Neto"
          value={fmtMonto(Math.abs(balance))}
          sub={balance >= 0 ? "Superávit" : "Déficit"}
          icon={DollarSign}
          color={balance >= 0 ? "#16a34a" : "#dc2626"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Ingresos vs Gastos — últimos 6 meses">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={20} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,197,169,0.3)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMonto(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Distribución de gastos por categoría">
          {catGastoData.length === 0 ? (
            <EmptyState label="Sin gastos registrados" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={catGastoData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {catGastoData.map((entry, idx) => (
                      <Cell key={entry.name} fill={pickColor(entry.name, idx)} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {catGastoData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pickColor(entry.name, idx) }} />
                    <span className="text-xs flex-1 truncate" style={{ color: "rgba(26,26,24,0.6)" }}>{entry.name}</span>
                    <span className="text-xs font-semibold" style={{ color: "#1a1a18" }}>{fmtMonto(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ── Insumos Tab ───────────────────────────────────────────────────────────────

function TabInsumos({ insumos, loading }: TabInsumosProps) {
  if (loading) return <LoadingState />;
  if (insumos.length === 0) return <EmptyState label="Sin insumos registrados" />;

  const bajoMinimo = insumos.filter((i) => i.inventario < i.minimo);
  const stockData = insumos
    .slice()
    .sort((a, b) => b.inventario - a.inventario)
    .slice(0, 10)
    .map((i) => ({ nombre: i.nombre.length > 14 ? i.nombre.slice(0, 13) + "…" : i.nombre, Inventario: i.inventario, Mínimo: i.minimo }));

  return (
    <div className="space-y-5">
      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Total insumos" value={String(insumos.length)} icon={AlertTriangle} color={CAMPO} />
        <MetricCard label="Bajo stock" value={String(bajoMinimo.length)} sub={bajoMinimo.length > 0 ? "Requieren reposición" : "Todo OK"} icon={AlertTriangle} color={bajoMinimo.length > 0 ? "#dc2626" : "#16a34a"} />
        <MetricCard label="Stock normal" value={String(insumos.length - bajoMinimo.length)} icon={CheckCircle2} color="#16a34a" />
        <MetricCard label="Sin mínimo def." value={String(insumos.filter((i) => i.minimo === 0).length)} icon={Clock} color="#d97706" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Stock actual por producto (top 10)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stockData} layout="vertical" barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,197,169,0.3)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nombre" width={100} tick={{ fontSize: 11, fill: "rgba(26,26,24,0.6)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Inventario" fill={CAMPO} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Mínimo" fill="rgba(220,38,38,0.35)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Insumos bajo stock mínimo">
          {bajoMinimo.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: "#16a34a" }} />
                <p className="text-sm font-medium" style={{ color: "#16a34a" }}>Todo en stock</p>
                <p className="text-xs mt-1" style={{ color: "rgba(26,26,24,0.4)" }}>Todos los insumos están sobre el mínimo</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {bajoMinimo.map((ins) => {
                const pct = ins.minimo > 0 ? Math.round((ins.inventario / ins.minimo) * 100) : 0;
                return (
                  <div
                    key={ins.nombre}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.15)" }}
                  >
                    <AlertTriangle size={14} className="shrink-0" style={{ color: "#dc2626" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a1a18" }}>{ins.nombre}</p>
                      <p className="text-xs" style={{ color: "rgba(26,26,24,0.45)" }}>{ins.categoria}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: "#dc2626" }}>
                        {ins.inventario} <span className="font-normal text-xs">{ins.unidad}</span>
                      </p>
                      <p className="text-xs" style={{ color: "rgba(26,26,24,0.4)" }}>mín: {ins.minimo} ({pct}%)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ── Tareas Tab ────────────────────────────────────────────────────────────────

function TabTareas({ tareas, loading }: TabTareasProps) {
  if (loading) return <LoadingState />;
  if (tareas.length === 0) return <EmptyState label="Sin tareas registradas" />;

  const hoy = today();
  const completadas = tareas.filter((t) => t.completada);
  const pendientes = tareas.filter((t) => !t.completada && t.fecha_limite >= hoy);
  const vencidas = tareas.filter((t) => !t.completada && t.fecha_limite < hoy);

  const donutData = [
    { name: "Completadas", value: completadas.length, color: "#16a34a" },
    { name: "Pendientes",  value: pendientes.length,  color: "#d97706" },
    { name: "Vencidas",    value: vencidas.length,    color: "#dc2626" },
  ].filter((d) => d.value > 0);

  // Prioridad breakdown
  const prioData = [
    { name: "Alta",  value: tareas.filter((t) => t.prioridad === "alta").length,  color: "#dc2626" },
    { name: "Media", value: tareas.filter((t) => t.prioridad === "media").length, color: "#d97706" },
    { name: "Baja",  value: tareas.filter((t) => t.prioridad === "baja").length,  color: "#16a34a" },
  ];

  return (
    <div className="space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Completadas"
          value={String(completadas.length)}
          sub={`${Math.round((completadas.length / tareas.length) * 100)}% del total`}
          icon={CheckCircle2}
          color="#16a34a"
        />
        <MetricCard
          label="Pendientes"
          value={String(pendientes.length)}
          sub="Sin vencer"
          icon={Clock}
          color="#d97706"
        />
        <MetricCard
          label="Vencidas"
          value={String(vencidas.length)}
          sub={vencidas.length > 0 ? "Requieren atención" : "Todo al día"}
          icon={AlertTriangle}
          color={vencidas.length > 0 ? "#dc2626" : "#16a34a"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Distribución por estado">
          {donutData.length === 0 ? (
            <EmptyState label="Sin datos" />
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {donutData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm flex-1" style={{ color: "rgba(26,26,24,0.65)" }}>{entry.name}</span>
                    <span className="text-base font-bold" style={{ color: "#1a1a18" }}>{entry.value}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-1" style={{ borderColor: "rgba(212,197,169,0.4)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs flex-1" style={{ color: "rgba(26,26,24,0.45)" }}>Total</span>
                    <span className="text-sm font-bold" style={{ color: "#1a1a18" }}>{tareas.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Distribución por prioridad">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={prioData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,197,169,0.3)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: "rgba(26,26,24,0.55)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "rgba(26,26,24,0.5)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tareas" radius={[6, 6, 0, 0]}>
                {prioData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>
    </div>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="h-48 flex items-center justify-center">
      <Loader2 size={22} className="animate-spin" style={{ color: CAMPO }} />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-48 flex items-center justify-center">
      <p className="text-sm" style={{ color: "rgba(26,26,24,0.35)" }}>{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("hacienda");
  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data per tab
  const [animales, setAnimales]   = useState<Animal[]>([]);
  const [prenezData, setPrenezData] = useState<PrenezReport[]>([]);
  const [gastos, setGastos]       = useState<Gasto[]>([]);
  const [insumos, setInsumos]     = useState<Insumo[]>([]);
  const [tareas, setTareas]       = useState<Tarea[]>([]);

  // Loading per tab
  const [loadingH, setLoadingH] = useState(false);
  const [loadingF, setLoadingF] = useState(false);
  const [loadingI, setLoadingI] = useState(false);
  const [loadingT, setLoadingT] = useState(false);

  // Loaded flags
  const [loadedH, setLoadedH] = useState(false);
  const [loadedF, setLoadedF] = useState(false);
  const [loadedI, setLoadedI] = useState(false);
  const [loadedT, setLoadedT] = useState(false);

  // Get establecimiento
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingBase(false); return; }
      const { data } = await supabase.from("establecimientos").select("id").eq("user_id", user.id).maybeSingle();
      if (data) setEstablecimientoId(data.id);
      setLoadingBase(false);
    })();
  }, []);

  // Loaders
  const loadHacienda = useCallback(async (estId: string) => {
    if (loadedH) return;
    setLoadingH(true);
    const supabase = createClient();
    const [animalesRes, prenezRes] = await Promise.all([
      supabase.from("animales").select("categoria, potrero, cantidad, fecha, tipo").eq("establecimiento_id", estId).order("fecha", { ascending: false }),
      supabase.from("prenez").select("categoria, fecha_diagnostico, total_diagnosticadas, prenadas").eq("establecimiento_id", estId),
    ]);
    setAnimales(animalesRes.data ?? []);
    setPrenezData(prenezRes.data ?? []);
    setLoadedH(true);
    setLoadingH(false);
  }, [loadedH]);

  const loadFinanzas = useCallback(async (estId: string) => {
    if (loadedF) return;
    setLoadingF(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("gastos")
      .select("categoria, tipo, monto, fecha")
      .eq("establecimiento_id", estId)
      .order("fecha", { ascending: false });
    setGastos(data ?? []);
    setLoadedF(true);
    setLoadingF(false);
  }, [loadedF]);

  const loadInsumos = useCallback(async (estId: string) => {
    if (loadedI) return;
    setLoadingI(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("insumos")
      .select("nombre, categoria, inventario, minimo, unidad")
      .eq("establecimiento_id", estId);
    setInsumos(data ?? []);
    setLoadedI(true);
    setLoadingI(false);
  }, [loadedI]);

  const loadTareas = useCallback(async (estId: string) => {
    if (loadedT) return;
    setLoadingT(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("tareas")
      .select("prioridad, fecha_limite, completada")
      .eq("establecimiento_id", estId);
    setTareas(data ?? []);
    setLoadedT(true);
    setLoadingT(false);
  }, [loadedT]);

  // Load on tab change
  useEffect(() => {
    if (!establecimientoId) return;
    if (activeTab === "hacienda") loadHacienda(establecimientoId);
    if (activeTab === "finanzas") loadFinanzas(establecimientoId);
    if (activeTab === "insumos")  loadInsumos(establecimientoId);
    if (activeTab === "tareas")   loadTareas(establecimientoId);
  }, [activeTab, establecimientoId, loadHacienda, loadFinanzas, loadInsumos, loadTareas]);

  // Load hacienda on mount
  useEffect(() => {
    if (establecimientoId) loadHacienda(establecimientoId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establecimientoId]);

  if (loadingBase) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: CAMPO }} />
      </div>
    );
  }

  if (!establecimientoId) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-sm" style={{ color: "rgba(26,26,24,0.4)" }}>
        <AlertCircle size={16} />
        No se encontró un establecimiento vinculado.
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "#1a1a18" }}
        >
          Reportes
        </h1>
        <p className="text-sm" style={{ color: "rgba(26,26,24,0.45)" }}>
          Análisis y métricas del establecimiento
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: "rgba(220,38,38,0.07)", color: "#dc2626" }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ backgroundColor: "rgba(212,197,169,0.2)" }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: activeTab === key ? "#ffffff" : "transparent",
              color: activeTab === key ? "#1a1a18" : "rgba(26,26,24,0.45)",
              boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "hacienda" && <TabHacienda animales={animales} prenezData={prenezData} loading={loadingH} />}
      {activeTab === "finanzas" && <TabFinanzas gastos={gastos} loading={loadingF} />}
      {activeTab === "insumos"  && <TabInsumos insumos={insumos} loading={loadingI} />}
      {activeTab === "tareas"   && <TabTareas tareas={tareas} loading={loadingT} />}
    </main>
  );
}
