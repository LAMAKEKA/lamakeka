"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Loader2 } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function AgricolaPage() {
  const router = useRouter();
  const { tenant, loading } = useTenant();

  const enabled =
    tenant?.modulesEnabled?.includes("agricola") ?? false;

  useEffect(() => {
    if (loading) return;
    if (!enabled) router.replace("/");
  }, [loading, enabled, router]);

  if (loading || !enabled) {
    return (
      <div className="page-pad flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin" style={{ color: "var(--color-campo)" }} />
      </div>
    );
  }

  return (
    <div className="page-pad max-w-lg mx-auto py-8">
      <div
        className="rounded-2xl border p-6 text-center"
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          borderColor: "rgba(212,197,169,0.55)",
        }}
      >
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(58,74,50,0.1)", color: "var(--color-campo)" }}
        >
          <Sprout size={28} strokeWidth={2} />
        </div>
        <h1
          className="text-xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            color: "var(--color-tierra)",
          }}
        >
          Agrícola
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(26,26,24,0.65)" }}>
          Módulo en construcción — lotes y cultivos pronto.
        </p>
        <p className="text-xs mt-4" style={{ color: "rgba(26,26,24,0.45)" }}>
          {tenant?.nombreDisplay ?? "Campo"} · plataforma multi-rubro
        </p>
      </div>
    </div>
  );
}
