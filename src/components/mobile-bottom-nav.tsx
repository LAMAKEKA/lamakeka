"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Beef, ScanLine, Map, Menu } from "lucide-react";

const ITEMS = [
  {
    href: "/",
    label: "Inicio",
    icon: LayoutDashboard,
    match: (p: string) => p === "/",
  },
  {
    href: "/hacienda",
    label: "Hacienda",
    icon: Beef,
    match: (p: string) => p.startsWith("/hacienda"),
  },
  {
    href: "/manga",
    label: "Manga",
    icon: ScanLine,
    match: (p: string) => p.startsWith("/manga"),
    fab: true,
  },
  {
    href: "/potreros",
    label: "Campo",
    icon: Map,
    match: (p: string) => p.startsWith("/potreros"),
  },
] as const;

interface MobileBottomNavProps {
  onMore: () => void;
}

export function MobileBottomNav({ onMore }: MobileBottomNavProps) {
  const pathname = usePathname();

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
      {/* height fija: el FAB no empuja ni recorta el label */}
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto items-end px-0.5">
        {ITEMS.map(({ href, label, icon: Icon, match, ...rest }) => {
          const fab = "fab" in rest && rest.fab;
          const active = match(pathname);

          if (fab) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-end pb-1.5 gap-0.5 relative h-14 touch-manipulation"
              >
                <span
                  className="absolute left-1/2 -translate-x-1/2 -top-3 w-11 h-11 rounded-xl flex items-center justify-center text-white"
                  style={{
                    backgroundColor: active ? "var(--color-cuero)" : "var(--color-campo)",
                    boxShadow: "0 6px 14px rgba(58,74,50,0.28)",
                  }}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                {/* spacer so label sits like the others */}
                <span className="h-5 block" aria-hidden />
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: active ? "var(--color-cuero)" : "var(--color-campo)" }}
                >
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-end pb-1.5 gap-0.5 h-14 min-w-0 touch-manipulation"
              style={{ color: active ? "var(--color-campo)" : "rgba(26,26,24,0.4)" }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
              <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">
                {label}
              </span>
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
          <Menu size={18} strokeWidth={1.7} />
          <span className="text-[10px] font-medium leading-none">Más</span>
        </button>
      </div>
    </nav>
  );
}
