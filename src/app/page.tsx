import Link from "next/link";
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
  ScanLine,
  Sprout,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      className="rounded-2xl p-3.5 flex flex-col gap-2.5 min-h-[6.5rem]"
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 3px rgba(26,26,24,0.06)",
        border: "1px solid rgba(212,197,169,0.5)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={16} style={{ color: iconColor }} strokeWidth={1.8} />
        </div>
        {deltaType === "down" && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#dc2626" }}
          >
            <TrendingDown size={10} strokeWidth={2.5} />
            {delta}
          </span>
        )}
        {deltaType === "neutral" && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(212,197,169,0.35)",
              color: "var(--color-cuero)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
      <div>
        <p
          className="text-2xl font-bold tracking-tight leading-none mb-1"
          style={{
            color: "var(--color-tierra)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          {value}
        </p>
        <p className="text-[11px] font-semibold leading-tight" style={{ color: "rgba(26,26,24,0.55)" }}>
          {label}
        </p>
        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "rgba(26,26,24,0.38)" }}>
          {sub}
        </p>
      </div>
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
    .select(
      "id, nombre, nombre_display, tipo, modules_enabled, rubros, is_platform_demo"
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // Schema viejo sin cols platform
  let estabRow = estab as {
    id: string;
    nombre: string;
    nombre_display?: string | null;
    tipo?: string | null;
    modules_enabled?: string[] | null;
    rubros?: string[] | null;
  } | null;

  if (!estabRow) {
    const min = await supabase
      .from("establecimientos")
      .select("id, nombre, tipo")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!min.data) redirect("/setup");
    estabRow = min.data as {
      id: string;
      nombre: string;
      tipo?: string | null;
    };
  }

  const estabId = estabRow.id;
  const displayName = (
    estabRow.nombre_display?.trim() ||
    estabRow.nombre
  ).trim();
  const tipo =
    estabRow.tipo === "agricola" || estabRow.tipo === "mixto"
      ? estabRow.tipo
      : "ganadero";

  const modules: string[] =
    estabRow.modules_enabled && estabRow.modules_enabled.length > 0
      ? estabRow.modules_enabled
      : tipo === "agricola"
        ? [
            "inicio",
            "agricola",
            "insumos",
            "finanzas",
            "reportes",
            "tareas",
          ]
        : tipo === "mixto"
          ? [
              "inicio",
              "manga",
              "hacienda",
              "potreros",
              "senasa",
              "agricola",
              "insumos",
              "finanzas",
              "reportes",
              "tareas",
            ]
          : [
              "inicio",
              "manga",
              "hacienda",
              "potreros",
              "senasa",
              "insumos",
              "finanzas",
              "reportes",
              "tareas",
            ];

  const has = (id: string) => modules.includes(id);
  const showHacienda = has("hacienda") || has("manga");
  const showPotreros = has("potreros");
  const showInsumos = has("insumos");
  const showTareas = has("tareas");
  const showFinanzas = has("finanzas");
  const showAgricola = has("agricola");

  // Potrero locations for mini-map (solo si el módulo está on)
  const { data: potrerosMapRaw } = showPotreros
    ? await supabase
        .from("potreros")
        .select("id, nombre, hectareas, cabezas, estado, latitud, longitud")
        .eq("establecimiento_id", estabId)
    : { data: [] as unknown[] };

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

  const emptyList = Promise.resolve({ data: [] as unknown[], count: 0 });

  // Parallel queries — solo módulos enabled (genérico no pega hacienda si es agrícola)
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
    { data: lotesData },
  ] = await Promise.all([
    showHacienda
      ? supabase.from("animales").select("cantidad").eq("establecimiento_id", estabId)
      : emptyList,
    showInsumos
      ? supabase
          .from("insumos")
          .select("inventario, minimo")
          .eq("establecimiento_id", estabId)
      : emptyList,
    showTareas
      ? supabase
          .from("tareas")
          .select("id", { count: "exact", head: true })
          .eq("establecimiento_id", estabId)
          .eq("completada", false)
      : emptyList,
    showHacienda
      ? supabase
          .from("animales")
          .select("id", { count: "exact", head: true })
          .eq("establecimiento_id", estabId)
          .gte("created_at", todayISO)
      : emptyList,
    showTareas
      ? supabase
          .from("tareas")
          .select("id", { count: "exact", head: true })
          .eq("establecimiento_id", estabId)
          .gte("created_at", todayISO)
      : emptyList,
    showFinanzas
      ? supabase
          .from("gastos")
          .select("id", { count: "exact", head: true })
          .eq("establecimiento_id", estabId)
          .gte("created_at", todayISO)
      : emptyList,
    showHacienda
      ? supabase
          .from("animales")
          .select("id, categoria, cantidad, potrero, responsable, created_at")
          .eq("establecimiento_id", estabId)
          .order("created_at", { ascending: false })
          .limit(3)
      : emptyList,
    showPotreros
      ? supabase
          .from("potreros")
          .select("id, nombre, hectareas, estado, created_at")
          .eq("establecimiento_id", estabId)
          .order("created_at", { ascending: false })
          .limit(2)
      : emptyList,
    showInsumos
      ? supabase
          .from("insumos")
          .select("id, nombre, inventario, minimo, categoria, created_at")
          .eq("establecimiento_id", estabId)
          .order("created_at", { ascending: false })
          .limit(2)
      : emptyList,
    showTareas
      ? supabase
          .from("tareas")
          .select("id, titulo, prioridad, completada, responsable, created_at")
          .eq("establecimiento_id", estabId)
          .order("created_at", { ascending: false })
          .limit(3)
      : emptyList,
    showFinanzas
      ? supabase
          .from("gastos")
          .select("id, concepto, monto, tipo, categoria, created_at")
          .eq("establecimiento_id", estabId)
          .order("created_at", { ascending: false })
          .limit(2)
      : emptyList,
    showAgricola
      ? supabase
          .from("lotes_agricolas")
          .select("id, nombre, cultivo, hectareas, estado, created_at")
          .eq("establecimiento_id", estabId)
          .order("created_at", { ascending: false })
          .limit(5)
      : emptyList,
  ]);

  // Compute metrics (PostgREST sin Database types → unknown + narrow)
  type QtyRow = { cantidad?: number | null };
  type StockRow = { inventario?: number | null; minimo?: number | null };
  type HaRow = { hectareas?: number | null };

  const totalCabezas = ((animalesData ?? []) as QtyRow[]).reduce(
    (sum, a) => sum + (a.cantidad ?? 0),
    0
  );
  const stockCritico = ((insumosAll ?? []) as StockRow[]).filter(
    (i) => Number(i.inventario) < Number(i.minimo)
  ).length;
  const tareasPendientes = tareasPendientesCount ?? 0;
  const movimientosHoy =
    (animalesHoyCount ?? 0) + (tareasHoyCount ?? 0) + (gastosHoyCount ?? 0);
  const lotesCount = (lotesData ?? []).length;
  const haLotes = ((lotesData ?? []) as HaRow[]).reduce(
    (s, l) => s + (Number(l.hectareas) || 0),
    0
  );

  const metrics: MetricCard[] = [];
  if (showHacienda) {
    metrics.push({
      label: "Total Cabezas",
      value: fmtNum(totalCabezas),
      delta: "actual",
      deltaType: "neutral",
      sub: "animales registrados",
      icon: Beef,
      iconBg: "rgba(58,74,50,0.10)",
      iconColor: "var(--color-campo)",
    });
  }
  if (showAgricola) {
    metrics.push({
      label: "Lotes agrícolas",
      value: fmtNum(lotesCount),
      delta: haLotes > 0 ? `${fmtNum(haLotes)} ha` : "mvp",
      deltaType: "neutral",
      sub: "cultivos / lotes",
      icon: Package,
      iconBg: "rgba(22,163,74,0.09)",
      iconColor: "#16a34a",
    });
  }
  metrics.push({
    label: "Movimientos del día",
    value: fmtNum(movimientosHoy),
    delta: "hoy",
    deltaType: "neutral",
    sub: "registros en el día",
    icon: ArrowLeftRight,
    iconBg: "rgba(139,78,42,0.10)",
    iconColor: "var(--color-cuero)",
  });
  if (showInsumos) {
    metrics.push({
      label: "Stock crítico",
      value: fmtNum(stockCritico),
      delta: stockCritico > 0 ? "alerta" : "ok",
      deltaType: stockCritico > 0 ? "down" : "neutral",
      sub: "productos bajo mínimo",
      icon: AlertTriangle,
      iconBg: stockCritico > 0 ? "rgba(217,119,6,0.10)" : "rgba(22,163,74,0.09)",
      iconColor: stockCritico > 0 ? "#d97706" : "#16a34a",
    });
  }
  if (showTareas) {
    metrics.push({
      label: "Tareas pendientes",
      value: fmtNum(tareasPendientes),
      delta: tareasPendientes > 0 ? "pendiente" : "al día",
      deltaType: "neutral",
      sub: "sin completar",
      icon: ClipboardCheck,
      iconBg: "rgba(37,99,235,0.08)",
      iconColor: "#2563eb",
    });
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (lotesData ?? []) as any[]) {
    rawItems.push({
      ts: new Date(l.created_at).getTime(),
      item: {
        id: l.id,
        icon: Package,
        iconBg: "rgba(22,163,74,0.09)",
        iconColor: "#16a34a",
        title: `Lote "${l.nombre}"`,
        description: `${l.cultivo || "sin cultivo"} · ${l.hectareas ?? "—"} ha · ${l.estado}`,
        time: relTime(l.created_at),
        category: "Agrícola",
        categoryBg: "rgba(22,163,74,0.09)",
        categoryColor: "#16a34a",
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
              {displayName}
            </h1>
          </div>
          <p className="text-xs capitalize" style={{ color: "rgba(26,26,24,0.45)" }}>
            {dateFormatted}
          </p>
        </div>
      </div>

      {/* Mobile: saludo compacto */}
      <div className="md:hidden px-3 pt-3 pb-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "rgba(26,26,24,0.4)" }}
          >
            Hoy · {dateFormatted}
          </p>
          <p
            className="text-base font-semibold truncate leading-tight"
            style={{
              color: "var(--color-tierra)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            {displayName}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 capitalize">
          {tipo}
        </Badge>
      </div>

      <div className="flex-1 p-3 md:p-6 flex flex-col gap-3 md:gap-5">
        {/* Atajos rápidos mobile */}
        <div className="quick-actions md:hidden -mx-0.5 px-0.5" aria-label="Atajos">
          {has("manga") && (
            <Link href="/manga" className="quick-action">
              <span className="quick-action__icon">
                <ScanLine size={14} strokeWidth={2.2} />
              </span>
              Manga
            </Link>
          )}
          {has("hacienda") && (
            <Link href="/hacienda" className="quick-action">
              <span className="quick-action__icon">
                <Beef size={14} strokeWidth={2.2} />
              </span>
              Hacienda
            </Link>
          )}
          {has("potreros") && (
            <Link href="/potreros" className="quick-action">
              <span className="quick-action__icon">
                <MapPin size={14} strokeWidth={2.2} />
              </span>
              Potreros
            </Link>
          )}
          {has("agricola") && (
            <Link href="/agricola" className="quick-action">
              <span
                className="quick-action__icon"
                style={{ backgroundColor: "rgba(22,163,74,0.12)", color: "#16a34a" }}
              >
                <Sprout size={14} strokeWidth={2.2} />
              </span>
              Agrícola
            </Link>
          )}
          {has("insumos") && (
            <Link href="/insumos" className="quick-action">
              <span className="quick-action__icon">
                <Package size={14} strokeWidth={2.2} />
              </span>
              Insumos
            </Link>
          )}
          {has("finanzas") && (
            <Link href="/finanzas" className="quick-action">
              <span
                className="quick-action__icon"
                style={{ backgroundColor: "rgba(139,78,42,0.12)", color: "var(--color-cuero)" }}
              >
                <DollarSign size={14} strokeWidth={2.2} />
              </span>
              Finanzas
            </Link>
          )}
          <Link href="/config" className="quick-action">
            <span className="quick-action__icon">
              <Settings2 size={14} strokeWidth={2.2} />
            </span>
            Mi campo
          </Link>
        </div>

        <div className="kpi-grid">
          {metrics.map((card) => (
            <MetricCardComponent key={card.label} card={card} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1">
          <div className={showPotreros ? "lg:col-span-3" : "lg:col-span-5"}>
            <Card className="overflow-hidden">
              <CardHeader className="border-b" style={{ borderColor: "rgba(212,197,169,0.4)" }}>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Actividad</CardTitle>
                  {activities.length > 0 && (
                    <Badge variant="muted">{activities.length} recientes</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-1 px-4">
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
                        <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: item.iconBg }}
                          >
                            <Icon size={14} style={{ color: item.iconColor }} strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className="text-xs font-semibold leading-snug"
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
                              style={{ color: "rgba(26,26,24,0.5)" }}
                            >
                              {item.description}
                            </p>
                            <span
                              className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: item.categoryBg,
                                color: item.categoryColor,
                              }}
                            >
                              {item.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {showPotreros && (
            <div className="lg:col-span-2 flex flex-col min-h-[200px] md:min-h-[280px]">
              <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader
                  className="border-b shrink-0"
                  style={{ borderColor: "rgba(212,197,169,0.4)" }}
                >
                  <CardTitle>Mapa</CardTitle>
                </CardHeader>
                <div className="flex-1 relative overflow-hidden rounded-b-2xl min-h-[180px]">
                  <MiniMapCard potreros={potrerosForMap} />
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
