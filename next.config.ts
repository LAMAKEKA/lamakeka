import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Hay un package-lock.json en el directorio padre que hace que Next
    // infiera un workspace root incorrecto. Fijamos la raíz al proyecto.
    root: process.cwd(),
  },
  // Celu en LAN (dev): Next 16 bloquea HMR/recursos cross-origin por default.
  allowedDevOrigins: ["192.168.1.7", "localhost", "127.0.0.1"],
};

export default nextConfig;
