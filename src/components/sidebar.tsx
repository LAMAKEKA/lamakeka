"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Beef,
  Egg,
  Map,
  Package,
  CheckSquare,
  BarChart2,
  PieChart,
  MessageCircle,
  LogOut,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Orden mobile-first: trabajo de campo primero */
const navItems = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/manga", label: "Manga", icon: ScanLine },
  { href: "/hacienda", label: "Hacienda", icon: Beef },
  { href: "/potreros", label: "Potreros", icon: Map },
  { href: "/senasa", label: "SENASA", icon: ShieldCheck },
  { href: "/produccion", label: "Producción", icon: Egg },
  { href: "/insumos", label: "Insumos", icon: Package },
  { href: "/finanzas", label: "Finanzas", icon: BarChart2 },
  { href: "/reportes", label: "Reportes", icon: PieChart },
  { href: "/tareas", label: "Tareas", icon: CheckSquare },
];

const secondaryItems = [
  { href: "/whatsapp", label: "WhatsApp Bot", icon: MessageCircle, badge: "PRONTO" },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  interface Profile {
    full_name: string | null;
    email: string;
  }
  const [profile, setProfile] = useState<Profile>({ full_name: null, email: "" });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      setProfile({
        full_name: data?.full_name ?? null,
        email: data?.email ?? user.email ?? "",
      });
    })();
  }, []);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Full navigation: cookies/proxy + cerrar drawer mobile
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
    }
  }

  const displayName = profile.full_name?.trim() || profile.email || "Usuario";
  const initials = displayName.slice(0, 2).toUpperCase() || "MK";

  return (
    <aside
      className="w-[min(18rem,85vw)] md:w-60 h-full max-h-[100dvh] flex flex-col shrink-0 overflow-hidden"
      style={{ backgroundColor: "var(--color-campo)" }}
    >
      {/* Logo + close (mobile) */}
      <div
        className="px-4 pt-4 pb-3 shrink-0"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-makeka.png"
            alt="La Makeka"
            width={40}
            height={40}
            className="rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <span
              className="text-white text-lg font-bold leading-tight block truncate"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              La Makeka
            </span>
            <p
              className="text-[10px] tracking-[0.18em] uppercase leading-none mt-0.5"
              style={{ color: "var(--color-arpillera)", opacity: 0.7 }}
            >
              AI · Ganadera
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl shrink-0 touch-manipulation"
              style={{
                color: "rgba(255,255,255,0.75)",
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              aria-label="Cerrar menú"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div className="mx-4 border-t border-white/10 mb-2 shrink-0" />

      {/* Navigation — scrollea; el pie de usuario NO */}
      <nav className="flex-1 min-h-0 px-3 space-y-0.5 overflow-y-auto overscroll-contain">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onClose?.()}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 min-h-[48px] touch-manipulation"
              style={{
                backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)",
                boxShadow: isActive ? "inset 3px 0 0 rgba(255,255,255,0.55)" : "none",
              }}
            >
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="flex-1">{label}</span>
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
                />
              )}
            </Link>
          );
        })}

        <div className="mx-2 border-t border-white/10 my-2" />

        {secondaryItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onClose?.()}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 min-h-[48px] touch-manipulation"
              style={{
                backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.45)",
                boxShadow: isActive ? "inset 3px 0 0 rgba(255,255,255,0.55)" : "none",
              }}
            >
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="flex-1 text-xs">{label}</span>
              {badge && (
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full tracking-wide"
                  style={{ backgroundColor: "rgba(217,119,6,0.25)", color: "#fbbf24" }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + salir — siempre visible, encima del bottom nav / home indicator */}
      <div
        className="shrink-0 border-t border-white/15"
        style={{
          backgroundColor: "rgba(0,0,0,0.18)",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="px-3 pt-3 pb-1 flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
            style={{ backgroundColor: "var(--color-cuero)" }}
            aria-hidden
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-tight truncate">{displayName}</p>
            {profile.full_name && profile.email ? (
              <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {profile.email}
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                Sesión activa
              </p>
            )}
          </div>
        </div>

        <div className="px-3 pb-2 pt-1">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-sm font-semibold touch-manipulation disabled:opacity-60"
            style={{
              color: "#ffffff",
              backgroundColor: "rgba(220,38,38,0.22)",
              border: "1px solid rgba(248,113,113,0.35)",
            }}
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} strokeWidth={2.2} />
            {signingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </aside>
  );
}
