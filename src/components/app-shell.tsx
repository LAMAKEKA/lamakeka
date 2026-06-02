"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Image from "next/image";
import { Sidebar } from "./sidebar";

const NO_SIDEBAR = ["/login", "/register", "/setup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showSidebar = !NO_SIDEBAR.includes(pathname);

  if (!showSidebar) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: "rgba(26,26,24,0.5)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 shrink-0 sidebar-slide lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto min-w-0"
        style={{ backgroundColor: "var(--color-pampa)" }}
      >
        {/* Mobile top bar */}
        <div
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b lg:hidden"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "rgba(212,197,169,0.5)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ color: "var(--color-campo)" }}
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/logo-makeka.png"
              alt="La Makeka"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span
              className="text-base font-bold"
              style={{
                color: "var(--color-tierra)",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}
            >
              La Makeka
            </span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
