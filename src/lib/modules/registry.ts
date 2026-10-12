export type ModuleId =
  | "inicio"
  | "manga"
  | "hacienda"
  | "potreros"
  | "senasa"
  | "produccion_huevos"
  | "agricola"
  | "insumos"
  | "finanzas"
  | "reportes"
  | "tareas"
  | "whatsapp";

export type Rubro = "ganaderia" | "agricola" | "huevos" | "core";
export type NavSlot = "primary" | "more" | "secondary";

/** String keys — Task 7 maps to lucide. Do not import react-icons here. */
export type ModuleIconName =
  | "layout-dashboard"
  | "beef"
  | "scan-line"
  | "map"
  | "shield-check"
  | "egg"
  | "sprout"
  | "package"
  | "bar-chart-2"
  | "pie-chart"
  | "check-square"
  | "message-circle";

export interface AppModule {
  id: ModuleId;
  label: string;
  href: string;
  icon: ModuleIconName;
  rubros: Rubro[];
  navSlot: NavSlot;
  core: boolean;
  /** Bottom primary order; undefined = not in bottom strip */
  bottomNavOrder?: number;
  badge?: string;
}

export const MODULE_REGISTRY: readonly AppModule[] = [
  {
    id: "inicio",
    label: "Inicio",
    href: "/",
    icon: "layout-dashboard",
    rubros: ["core"],
    navSlot: "primary",
    core: true,
    bottomNavOrder: 1,
  },
  {
    id: "manga",
    label: "Manga",
    href: "/manga",
    icon: "scan-line",
    rubros: ["ganaderia"],
    navSlot: "primary",
    core: false,
    bottomNavOrder: 3,
  },
  {
    id: "hacienda",
    label: "Hacienda",
    href: "/hacienda",
    icon: "beef",
    rubros: ["ganaderia"],
    navSlot: "primary",
    core: false,
    bottomNavOrder: 2,
  },
  {
    id: "potreros",
    label: "Potreros",
    href: "/potreros",
    icon: "map",
    rubros: ["ganaderia"],
    navSlot: "primary",
    core: false,
    bottomNavOrder: 4,
  },
  {
    id: "senasa",
    label: "SENASA",
    href: "/senasa",
    icon: "shield-check",
    rubros: ["ganaderia"],
    navSlot: "more",
    core: false,
  },
  {
    id: "produccion_huevos",
    label: "Producción",
    href: "/produccion",
    icon: "egg",
    rubros: ["huevos"],
    navSlot: "more",
    core: false,
  },
  {
    id: "agricola",
    label: "Agrícola",
    href: "/agricola",
    icon: "sprout",
    rubros: ["agricola"],
    navSlot: "more",
    core: false,
  },
  {
    id: "insumos",
    label: "Insumos",
    href: "/insumos",
    icon: "package",
    rubros: ["core"],
    navSlot: "more",
    core: false,
  },
  {
    id: "finanzas",
    label: "Finanzas",
    href: "/finanzas",
    icon: "bar-chart-2",
    rubros: ["core"],
    navSlot: "more",
    core: false,
  },
  {
    id: "reportes",
    label: "Reportes",
    href: "/reportes",
    icon: "pie-chart",
    rubros: ["core"],
    navSlot: "more",
    core: false,
  },
  {
    id: "tareas",
    label: "Tareas",
    href: "/tareas",
    icon: "check-square",
    rubros: ["core"],
    navSlot: "more",
    core: false,
  },
  {
    id: "whatsapp",
    label: "WhatsApp Bot",
    href: "/whatsapp",
    icon: "message-circle",
    rubros: ["core"],
    navSlot: "secondary",
    core: false,
    badge: "PRONTO",
  },
];

export function getModule(id: ModuleId): AppModule | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id);
}

export function filterModules(
  enabled: readonly string[],
  opts?: { includeSecondary?: boolean }
): AppModule[] {
  const set = new Set(enabled);
  const includeSecondary = opts?.includeSecondary ?? false;
  return MODULE_REGISTRY.filter((m) => {
    if (!set.has(m.id)) return false;
    if (m.navSlot === "secondary" && !includeSecondary) return false;
    return true;
  });
}
