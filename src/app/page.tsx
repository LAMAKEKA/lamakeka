import { redirect } from "next/navigation";
import { MiniMapCard } from "@/components/map/map-card";
import {
  Beef,
  ArrowLeftRight,
  AlertTriangle,
  ClipboardCheck,
  TrendingDown,
  Package,
  MapPin,
  DollarSign,
  Activity,
  CheckSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricCard {
  label: string;
  value: string;
  delta: string;
  deltaType: "up" | "down" | "neutral";
  sub: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
  category: string;
  categoryBg: string;
  categoryColor: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("es-AR");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCardComponent({ card }: { card: MetricCard }) {
  const { label, value, delta, deltaType, sub, icon: Icon, iconBg, iconColor } = card;

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 2px rgba(26,26,24,0.05)",
        border: "1px solid rgba(212,197,169,0.5)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={15} style={{ color: iconColor }} strokeWidth={1.8} />
        </div>
        {deltaType === "down" && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#dc2626" }}
          >
            <TrendingDown size={10} strokeWidth={2.5} />
            {delta}
          </span>
        )}
        {deltaType === "neutral" && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(212,197,169,0.3)",
              color: "var(--color-cuero)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
      <div>
        <p
          className="text-xl md:text-2xl font-bold tracking-tight leading-none mb-0.5"
          style={{
            color: "var(--color-tierra)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          {value}
        </p>
        <p className="text-[11px] font-medium leading-tight" style={{ color: "rgba(26,26,24,0.55)" }}>
          {label}
        </p>
        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "rgba(26,26,24,0.35)" }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 2px rgba(26,26,24,0.05)",
        border: "1px solid rgba(212,197,169,0.5)",
      }}
    >
      <div className="px-4 py-2.5 border-b" style={{ borderColor: "rgba(212,197,169,0.4)" }}>
        <h2
          className="font-semibold text-sm"
          style={{
            color: "var(--color-tierra)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          Actividad
        </h2>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-1">
          <Activity size={22} style={{ color: "rgba(26,26,24,0.15)" }} strokeWidth={1.4} />
          <p className="text-xs" style={{ color: "rgba(26,26,24,0.35)" }}>
            Sin movimientos recientes
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(212,197,169,0.3)" }}>
          {activities.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: item.iconBg }}
                >
                  <Icon size={14} style={{ color: item.iconColor }} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-xs font-medium leading-snug"
                      style={{ color: "var(--color-tierra)" }}
                    >
                      {item.title}
                    </p>
                    <span
                      className="text-[10px] shrink-0 mt-0.5"
                      style={{ color: "rgba(26,26,24,0.35)" }}
                    >
                      {item.time}
                    </span>
                  </div>
                  <p
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: "rgba(26,26,24,0.45)" }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// MapPlaceholder replaced by MiniMap (dynamic) — see DashboardPage

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: estab } = await supabase
    .from("establecimientos")
    .select("id, nombre")
    .limit(1)
    .single();
  if (!estab) redirect("/setup");

  const estabId = estab.id as string;

  // Potrero locations for mini-map (separate query, not limited)
  const { data: potrerosMapRaw } = await supabase
    .from("potreros")
    .select("id, nombre, hectareas, cabezas, estado, latitud, longitud")
    .eq("establecimiento_id", estabId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const potrerosForMap = (potrerosMapRaw ?? []).map((p: any) => ({
    id: String(p.id),
    nombre: String(p.nombre),
    hectareas: Number(p.hectareas),
    cabezas: Number(p.cabezas),
    estado: String(p.estado),
    latitud: p.latitud != null ? Number(p.latitud) : null,
    longitud: p.longitud != null ? Number(p.longitud) : null,
  }));

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Parallel queries
  const [
    { data: animalesData },
    { data: insumosAll },
    { count: tareasPendientesCount },
    { count: animalesHoyCount },
    { count: tareasHoyCount },
    { count: gastosHoyCount },
    { data: recentAnimales },
    { data: recentPotreros },
    { data: recentInsumos },
    { data: recentTareas },
    { data: recentGastos },
  ] = await Promise.all([
    supabase.from("animales").select("cantidad").eq("establecimiento_id", estabId),
    supabase.from("insumos").select("inventario, minimo").eq("establecimiento_id", estabId),
    supabase
      .from("tareas")
      .select("id", { count: "exact", head: true })
      .eq("establecimiento_id", estabId)
      .eq("completada", false),
    supabase
      .from("animales")
      .select("id", { count: "exact", head: true })
      .eq("establecimiento_id", estabId)
      .gte("created_at", todayISO),
    supabase
      .from("tareas")
      .select("id", { count: "exact", head: true })
      .eq("establecimiento_id", estabId)
      .gte("created_at", todayISO),
    supabase
      .from("gastos")
      .select("id", { count: "exact", head: true })
      .eq("establecimiento_id", estabId)
      .gte("created_at", todayISO),
    supabase
      .from("animales")
      .select("id, categoria, cantidad, potrero, responsable, created_at")
      .eq("establecimiento_id", estabId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("potreros")
      .select("id, nombre, hectareas, estado, created_at")
      .eq("establecimiento_id", estabId)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("insumos")
      .select("id, nombre, inventario, minimo, categoria, created_at")
      .eq("establecimiento_id", estabId)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("tareas")
      .select("id, titulo, prioridad, completada, responsable, created_at")
      .eq("establecimiento_id", estabId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("gastos")
      .select("id, concepto, monto, tipo, categoria, created_at")
      .eq("establecimiento_id", estabId)
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  // Compute metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalCabezas = (animalesData ?? []).reduce((sum: number, a: any) => sum + (a.cantidad ?? 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stockCritico = (insumosAll ?? []).filter((i: any) => i.inventario < i.minimo).length;
  const tareasPendientes = tareasPendientesCount ?? 0;
  const movimientosHoy =
    (animalesHoyCount ?? 0) + (tareasHoyCount ?? 0) + (gastosHoyCount ?? 0);

  const metrics: MetricCard[] = [
    {
      label: "Total Cabezas",
      value: fmtNum(totalCabezas),
      delta: "actual",
      deltaType: "neutral",
      sub: "animales registrados",
      icon: Beef,
      iconBg: "rgba(58,74,50,0.10)",
      iconColor: "var(--color-campo)",
    },
    {
      label: "Movimientos del día",
      value: fmtNum(movimientosHoy),
      delta: "hoy",
      deltaType: "neutral",
      sub: "registros en el día",
      icon: ArrowLeftRight,
      iconBg: "rgba(139,78,42,0.10)",
      iconColor: "var(--color-cuero)",
    },
    {
      label: "Stock crítico",
      value: fmtNum(stockCritico),
      delta: stockCritico > 0 ? "alerta" : "ok",
      deltaType: stockCritico > 0 ? "down" : "neutral",
      sub: "productos bajo mínimo",
      icon: AlertTriangle,
      iconBg: stockCritico > 0 ? "rgba(217,119,6,0.10)" : "rgba(22,163,74,0.09)",
      iconColor: stockCritico > 0 ? "#d97706" : "#16a34a",
    },
    {
      label: "Tareas pendientes",
      value: fmtNum(tareasPendientes),
      delta: tareasPendientes > 0 ? "pendiente" : "al día",
      deltaType: "neutral",
      sub: "sin completar",
      icon: ClipboardCheck,
      iconBg: "rgba(37,99,235,0.08)",
      iconColor: "#2563eb",
    },
  ];

  // Build activity items, preserving created_at for sorting
  type RawItem = { ts: number; item: ActivityItem };
  const rawItems: RawItem[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of (recentAnimales ?? []) as any[]) {
    rawItems.push({
      ts: new Date(a.created_at).getTime(),
      item: {
        id: a.id,
        icon: Beef,
        iconBg: "rgba(58,74,50,0.10)",
        iconColor: "var(--color-campo)",
        title: `${a.cantidad} ${String(a.categoria).toLowerCase()} registrados`,
        description: `${a.potrero} · ${a.responsable}`,
        time: relTime(a.created_at),
        category: "Hacienda",
        categoryBg: "rgba(58,74,50,0.10)",
        categoryColor: "var(--color-campo)",
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (recentPotreros ?? []) as any[]) {
    rawItems.push({
      ts: new Date(p.created_at).getTime(),
      item: {
        id: p.id,
        icon: MapPin,
        iconBg: "rgba(212,197,169,0.4)",
        iconColor: "var(--color-cuero)",
        title: `Potrero "${p.nombre}" registrado`,
        description: `${p.hectareas} ha · ${p.estado}`,
        time: relTime(p.created_at),
        category: "Potreros",
        categoryBg: "rgba(212,197,169,0.4)",
        categoryColor: "var(--color-cuero)",
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const i of (recentInsumos ?? []) as any[]) {
    const isCrit = Number(i.inventario) < Number(i.minimo);
    rawItems.push({
      ts: new Date(i.created_at).getTime(),
      item: {
        id: i.id,
        icon: isCrit ? AlertTriangle : Package,
        iconBg: isCrit ? "rgba(217,119,6,0.10)" : "rgba(139,78,42,0.10)",
        iconColor: isCrit ? "#d97706" : "var(--color-cuero)",
        title: isCrit ? `Stock bajo: ${i.nombre}` : `${i.nombre} ingresado`,
        description: `${i.categoria} · ${i.inventario} uds.`,
        time: relTime(i.created_at),
        category: "Insumos",
        categoryBg: "rgba(217,119,6,0.08)",
        categoryColor: "#b45309",
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (recentTareas ?? []) as any[]) {
    rawItems.push({
      ts: new Date(t.created_at).getTime(),
      item: {
        id: t.id,
        icon: CheckSquare,
        iconBg: "rgba(37,99,235,0.08)",
        iconColor: "#2563eb",
        title: t.completada
          ? `Tarea completada: ${t.titulo}`
          : `Nueva tarea: ${t.titulo}`,
        description: `Prioridad ${t.prioridad} · ${t.responsable}`,
        time: relTime(t.created_at),
        category: "Tareas",
        categoryBg: "rgba(37,99,235,0.08)",
        categoryColor: "#2563eb",
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of (recentGastos ?? []) as any[]) {
    const isIngreso = g.tipo === "ingreso";
    rawItems.push({
      ts: new Date(g.created_at).getTime(),
      item: {
        id: g.id,
        icon: DollarSign,
        iconBg: isIngreso ? "rgba(22,163,74,0.09)" : "rgba(220,38,38,0.08)",
        iconColor: isIngreso ? "#16a34a" : "#dc2626",
        title: `${isIngreso ? "Ingreso" : "Gasto"}: ${g.concepto}`,
        description: `${g.categoria} · $${Number(g.monto).toLocaleString("es-AR")}`,
        time: relTime(g.created_at),
        category: "Finanzas",
        categoryBg: isIngreso ? "rgba(22,163,74,0.09)" : "rgba(220,38,38,0.08)",
        categoryColor: isIngreso ? "#16a34a" : "#dc2626",
      },
    });
  }

  rawItems.sort((a, b) => b.ts - a.ts);
  const activities = rawItems.slice(0, 6).map((r) => r.item);

  // Date short
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header: desktop only (mobile usa top bar del shell) */}
      <div
        className="hidden md:block px-8 pt-6 pb-4 border-b"
        style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}
      >
        <div className="flex items-end justify-between">
          <div>
            <p
              className="text-[11px] font-medium tracking-wide uppercase mb-0.5"
              style={{ color: "rgba(26,26,24,0.38)" }}
            >
              Campo
            </p>
            <h1
              className="text-xl font-bold leading-tight"
              style={{
                color: "var(--color-tierra)",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}
            >
              {estab.nombre}
            </h1>
          </div>
          <p className="text-xs capitalize" style={{ color: "rgba(26,26,24,0.45)" }}>
            {dateFormatted}
          </p>
        </div>
      </div>

      {/* Mobile: nombre del campo compacto */}
      <div className="md:hidden px-3 pt-3 pb-1">
        <p className="text-xs font-medium truncate" style={{ color: "rgba(26,26,24,0.5)" }}>
          {estab.nombre} · {dateFormatted}
        </p>
      </div>

      <div className="flex-1 p-3 md:p-6 flex flex-col gap-3 md:gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {metrics.map((card) => (
            <MetricCardComponent key={card.label} card={card} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1">
          <div className="lg:col-span-3">
            <ActivityFeed activities={activities} />
          </div>
          <div className="lg:col-span-2 flex flex-col min-h-[200px] md:min-h-[280px]">
            <div
              className="rounded-xl flex flex-col h-full overflow-hidden"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 2px rgba(26,26,24,0.05)",
                border: "1px solid rgba(212,197,169,0.5)",
              }}
            >
              <div
                className="px-4 py-2.5 border-b shrink-0"
                style={{ borderColor: "rgba(212,197,169,0.4)" }}
              >
                <h2
                  className="font-semibold text-sm"
                  style={{
                    color: "var(--color-tierra)",
                    fontFamily: "var(--font-playfair), Georgia, serif",
                  }}
                >
                  Mapa
                </h2>
              </div>
              <div className="flex-1 relative overflow-hidden rounded-b-xl min-h-[180px]">
                <MiniMapCard potreros={potrerosForMap} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
