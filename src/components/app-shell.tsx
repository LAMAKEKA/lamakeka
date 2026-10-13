"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Image from "next/image";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { MODULE_REGISTRY } from "@/lib/modules/registry";

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
  "/agricola": "Agrícola",
};

function titleFor(path: string, fallbackName: string) {
  const fromRegistry = MODULE_REGISTRY.filter(
    (m) => m.href === path || (m.href !== "/" && path.startsWith(m.href))
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (fromRegistry) return fromRegistry.label;

  if (PAGE_TITLE[path]) return PAGE_TITLE[path];
  const base = Object.keys(PAGE_TITLE)
    .filter((k) => k !== "/" && path.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return base ? PAGE_TITLE[base] : fallbackName;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tenantState = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPath, setSidebarPath] = useState(pathname);
  const [initials, setInitials] = useState("··");
  const showShell = !NO_SHELL.includes(pathname);

  if (pathname !== sidebarPath) {
    setSidebarPath(pathname);
    if (sidebarOpen) setSidebarOpen(false);
  }

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

  const brandName = tenantState.tenant?.nombreDisplay || "La Makeka";
  const logo = tenantState.tenant?.logoUrl || "/logo-makeka.png";
  const pageTitle = titleFor(pathname, brandName);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden animate-fade-in"
          style={{ backgroundColor: "rgba(26,26,24,0.5)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 h-[100dvh] max-h-[100dvh] shrink-0 sidebar-slide md:static md:h-auto md:max-h-none md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar tenantState={tenantState} onClose={() => setSidebarOpen(false)} />
      </div>

      <main
        className="flex-1 overflow-y-auto min-w-0 overscroll-y-contain"
        style={{ backgroundColor: "var(--color-pampa)" }}
      >
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
              src={logo}
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

        <div className="pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0 min-h-full">
          {children}
        </div>
      </main>

      {!sidebarOpen && (
        <MobileBottomNav tenantState={tenantState} onMore={() => setSidebarOpen(true)} />
      )}
    </div>
  );
}
