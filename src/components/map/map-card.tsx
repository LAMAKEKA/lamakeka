"use client";

import dynamic from "next/dynamic";
import type { PotreroPin } from "./potrero-map";

const PotrerosMap = dynamic(() => import("./potrero-map"), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: "rgba(240,237,230,0.5)" }}
    >
      <div
        className="w-6 h-6 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: "var(--color-campo)" }}
      />
    </div>
  ),
});

export function MiniMapCard({ potreros }: { potreros: PotreroPin[] }) {
  return <PotrerosMap potreros={potreros} mini />;
}
