"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Email o contraseña incorrectos.",
  "Email not confirmed": "Confirmá tu email antes de ingresar.",
  "Too many requests": "Demasiados intentos. Esperá unos minutos.",
  "email rate limit exceeded": "Límite de emails alcanzado. Esperá unos minutos.",
};

function translateError(msg: string) {
  return ERROR_MAP[msg] ?? `Error: ${msg}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(translateError(authError.message));
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-pampa)" }}
    >
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo-makeka.png"
            alt="La Makeka AI"
            width={80}
            height={80}
            className="rounded-2xl mb-4 mx-auto"
          />
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              color: "var(--color-tierra)",
            }}
          >
            La Makeka AI
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(26,26,24,0.45)" }}>
            Gestión ganadera premium
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "#ffffff",
            boxShadow:
              "0 4px 24px rgba(26,26,24,0.08), 0 1px 3px rgba(26,26,24,0.05)",
            border: "1px solid rgba(212,197,169,0.5)",
          }}
        >
          <h2
            className="text-xl font-semibold mb-6"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              color: "var(--color-tierra)",
            }}
          >
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-tierra)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@email.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  border: "1.5px solid rgba(212,197,169,0.8)",
                  backgroundColor: "var(--color-pampa)",
                  color: "var(--color-tierra)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-cuero)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(139,78,42,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(212,197,169,0.8)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--color-tierra)" }}
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs font-medium"
                  style={{ color: "var(--color-cuero)" }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
                  style={{
                    border: "1.5px solid rgba(212,197,169,0.8)",
                    backgroundColor: "var(--color-pampa)",
                    color: "var(--color-tierra)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--color-cuero)";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(139,78,42,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(212,197,169,0.8)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(26,26,24,0.35)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "rgba(220,38,38,0.06)",
                  color: "#dc2626",
                  border: "1px solid rgba(220,38,38,0.15)",
                }}
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity mt-2"
              style={{
                backgroundColor: "var(--color-campo)",
                color: "#ffffff",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <p
            className="text-center text-sm mt-6"
            style={{ color: "rgba(26,26,24,0.5)" }}
          >
            ¿No tenés cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold"
              style={{ color: "var(--color-cuero)" }}
            >
              Registrate gratis
            </Link>
          </p>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "rgba(26,26,24,0.3)" }}
        >
          © 2026 La Makeka AI · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
