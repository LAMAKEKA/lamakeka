"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Image from "next/image";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { createClient } from "@/lib/supabase/client";

const NO_SHELL = ["/login", "/register", "/setup"];

const PAGE_TITLE: Record<string, string> = {
  "/": "Inicio",
  "/hacienda": "Hacienda",
  "/produccion": "Producción",
  "/potreros": "Potreros",
  "/insumos": "Insumos",
  "/tareas": "Tareas",
  "/finanzas": "Finanzas",
  "/reportes": "Reportes",
  "/manga": "Manga",
  "/senasa": "SENASA",
  "/whatsapp": "WhatsApp",
};

function titleFor(path: string) {
  if (PAGE_TITLE[path]) return PAGE_TITLE[path];
  const base = Object.keys(PAGE_TITLE)
    .filter((k) => k !== "/" && path.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return base ? PAGE_TITLE[base] : "La Makeka";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initials, setInitials] = useState("··");
  const showShell = !NO_SHELL.includes(pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!showShell) return;
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
      const raw = data?.full_name || data?.email || user.email || "MK";
      setInitials(raw.slice(0, 2).toUpperCase());
    })();
  }, [showShell]);

  if (!showShell) return <>{children}</>;

  const pageTitle = titleFor(pathname);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden animate-fade-in"
          style={{ backgroundColor: "rgba(26,26,24,0.5)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer mobile / fijo desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 shrink-0 sidebar-slide md:static md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <main
        className="flex-1 overflow-y-auto min-w-0 overscroll-y-contain"
        style={{ backgroundColor: "var(--color-pampa)" }}
      >
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-2 px-2.5 border-b md:hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: "rgba(212,197,169,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            paddingTop: "max(0.4rem, env(safe-area-inset-top))",
            paddingBottom: "0.4rem",
            minHeight: "2.75rem",
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0 touch-manipulation"
            style={{
              color: "var(--color-campo)",
              backgroundColor: "rgba(58,74,50,0.08)",
              border: "1px solid rgba(58,74,50,0.12)",
            }}
            aria-label="Abrir menú"
          >
            <Menu size={18} strokeWidth={2} />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Image
              src="/logo-makeka.png"
              alt=""
              width={22}
              height={22}
              className="rounded-md shrink-0"
            />
            <h1
              className="text-sm font-bold leading-tight truncate"
              style={{
                color: "var(--color-tierra)",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}
            >
              {pageTitle}
            </h1>
          </div>

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
            style={{ backgroundColor: "var(--color-cuero)" }}
            aria-hidden
          >
            {initials}
          </div>
        </header>

        {/* Content: room for bottom nav on mobile */}
        <div className="pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0 min-h-full">
          {children}
        </div>
      </main>

      <MobileBottomNav onMore={() => setSidebarOpen(true)} />
    </div>
  );
}
