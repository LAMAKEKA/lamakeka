"use client";

import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { ConfiguradorCampos } from "@/components/manga/ConfiguradorCampos";

export default function MangaConfiguracionPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/manga"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ color: "rgba(26,26,24,0.5)", border: "1px solid rgba(212,197,169,0.6)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(212,197,169,0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
          }}
        >
          <ArrowLeft size={15} />
        </Link>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(58,74,50,0.1)" }}
        >
          <Settings size={17} style={{ color: "var(--color-campo)" }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{
              color: "var(--color-tierra)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            Configuración de campos
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(26,26,24,0.45)" }}>
            Los cambios se reflejan de inmediato en el formulario de manga
          </p>
        </div>
      </div>

      <ConfiguradorCampos />
    </div>
  );
}
