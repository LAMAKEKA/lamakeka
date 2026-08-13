import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Hay un package-lock.json en el directorio padre que hace que Next
    // infiera un workspace root incorrecto. Fijamos la raíz al proyecto.
    root: process.cwd(),
  },
};

export default nextConfig;
