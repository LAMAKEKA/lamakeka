import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Beef,
  ScanLine,
  Map,
  ShieldCheck,
  Egg,
  Sprout,
  Package,
  BarChart2,
  PieChart,
  CheckSquare,
  MessageCircle,
} from "lucide-react";
import type { ModuleIconName } from "@/lib/modules/registry";

export const MODULE_ICON_MAP: Record<ModuleIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  beef: Beef,
  "scan-line": ScanLine,
  map: Map,
  "shield-check": ShieldCheck,
  egg: Egg,
  sprout: Sprout,
  package: Package,
  "bar-chart-2": BarChart2,
  "pie-chart": PieChart,
  "check-square": CheckSquare,
  "message-circle": MessageCircle,
};

export function iconFor(name: ModuleIconName): LucideIcon {
  return MODULE_ICON_MAP[name] ?? LayoutDashboard;
}
