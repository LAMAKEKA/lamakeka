"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Beef,
  Map,
  Package,
  CheckSquare,
  BarChart2,
  PieChart,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hacienda", label: "Hacienda", icon: Beef },
  { href: "/potreros", label: "Potreros", icon: Map },
  { href: "/insumos", label: "Insumos", icon: Package },
  { href: "/tareas", label: "Tareas", icon: CheckSquare },
  { href: "/finanzas", label: "Finanzas", icon: BarChart2 },
  { href: "/reportes", label: "Reportes", icon: PieChart },
];

const secondaryItems = [
  { href: "/whatsapp", label: "WhatsApp Bot", icon: MessageCircle, badge: "PRONTO" },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  interface Profile { full_name: string | null; email: string }
  const [profile, setProfile] = useState<Profile>({ full_name: null, email: "" });

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className="w-60 h-screen flex flex-col shrink-0"
      style={{ backgroundColor: "var(--color-campo)" }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Image
            src="/logo-makeka.png"
            alt="La Makeka"
            width={40}
            height={40}
            className="rounded-xl shrink-0"
          />
          <span
            className="text-white text-lg font-bold leading-tight"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            La Makeka
          </span>
        </div>
        <p
          className="text-xs tracking-[0.18em] uppercase ml-[54px]"
          style={{ color: "var(--color-arpillera)", opacity: 0.7 }}
        >
          AI · Ganadera
        </p>
      </div>

      <div className="mx-5 border-t border-white/10 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onClose?.()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)",
                boxShadow: isActive ? "inset 3px 0 0 rgba(255,255,255,0.55)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.88)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.55)";
                }
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
      </nav>

      {/* Divider before secondary items */}
      <div className="mx-5 border-t border-white/10 mb-2 mt-2" />

      {/* Secondary nav */}
      <div className="px-3 pb-2 space-y-0.5">
        {secondaryItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onClose?.()}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.45)",
                boxShadow: isActive ? "inset 3px 0 0 rgba(255,255,255,0.55)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.75)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.45)";
                }
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
      </div>

      {/* User section */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: "var(--color-cuero)" }}
            >
              {(profile.full_name ?? profile.email).slice(0, 2).toUpperCase()}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
              style={{ backgroundColor: "#25D366", borderColor: "var(--color-campo)" }}
            >
              <svg width="7" height="7" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium leading-tight truncate">{profile.full_name ?? profile.email}</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.38)" }}>
              {profile.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="Cerrar sesión"
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)";
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
