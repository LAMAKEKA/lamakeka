"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { filterModules, type AppModule } from "@/lib/modules/registry";
import { iconFor } from "@/lib/modules/iconMap";
import { defaultModulesForTipo } from "@/lib/modules/defaults";
import type { TenantState } from "@/hooks/useTenant";

interface MobileBottomNavProps {
  onMore: () => void;
  tenantState?: TenantState;
}

function bottomLabel(m: AppModule): string {
  if (m.id === "potreros") return "Campo";
  return m.label;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileBottomNav({ onMore, tenantState }: MobileBottomNavProps) {
  const pathname = usePathname();
  const tenant = tenantState?.tenant ?? null;

  const enabled =
    tenant?.modulesEnabled?.length
      ? tenant.modulesEnabled
      : [...defaultModulesForTipo(tenant?.tipo ?? "ganadero")];

  // Bottom: prefer registry bottomNavOrder; si no hay 4 (ej. agrícola), completar con primarios enabled
  const withOrder = filterModules(enabled)
    .filter((m) => m.bottomNavOrder != null)
    .sort((a, b) => (a.bottomNavOrder ?? 0) - (b.bottomNavOrder ?? 0));

  const bottomItems =
    withOrder.length >= 1
      ? withOrder.slice(0, 4)
      : filterModules(enabled)
          .filter((m) => m.navSlot === "primary" || m.id === "agricola")
          .slice(0, 4);

  const hasMangaFab = bottomItems.some((m) => m.id === "manga");

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t"
      style={{
        backgroundColor: "rgba(255,255,255,0.97)",
        borderColor: "rgba(212,197,169,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -4px 16px rgba(26,26,24,0.06)",
      }}
      aria-label="Navegación"
    >
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto items-end px-0.5">
        {bottomItems.map((m) => {
          const Icon = iconFor(m.icon);
          const label = bottomLabel(m);
          const active = isActive(pathname, m.href);
          const fab = hasMangaFab && m.id === "manga";

          if (fab) {
            return (
              <Link
                key={m.id}
                href={m.href}
                className="flex flex-col items-center justify-end pb-1.5 gap-0.5 relative h-14 touch-manipulation"
              >
                <span
                  className="absolute left-1/2 -translate-x-1/2 -top-3.5 w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                  style={{
                    backgroundColor: active ? "var(--color-cuero)" : "var(--color-campo)",
                    boxShadow: "0 6px 16px rgba(58,74,50,0.3)",
                  }}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </span>
                <span className="h-5 block" aria-hidden />
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: active ? "var(--color-cuero)" : "var(--color-campo)" }}
                >
                  {label}
                </span>
                {active && <span className="nav-active-dot mt-0.5" aria-hidden />}
              </Link>
            );
          }

          return (
            <Link
              key={m.id}
              href={m.href}
              className="flex flex-col items-center justify-end pb-1.5 gap-0.5 h-14 min-w-0 touch-manipulation"
              style={{ color: active ? "var(--color-campo)" : "rgba(26,26,24,0.4)" }}
            >
              <Icon size={20} strokeWidth={active ? 2.3 : 1.7} />
              <span className="text-[10px] font-semibold leading-none truncate max-w-full px-0.5">
                {label}
              </span>
              {active && <span className="nav-active-dot" aria-hidden />}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center justify-end pb-1.5 gap-0.5 h-14 touch-manipulation"
          style={{ color: "rgba(26,26,24,0.4)" }}
          aria-label="Más"
        >
          <Menu size={20} strokeWidth={1.7} />
          <span className="text-[10px] font-semibold leading-none">Más</span>
        </button>
      </div>
    </nav>
  );
}
