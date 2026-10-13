"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MAP: Record<string, string> = {
  "Password should be at least 6 characters":
    "La contraseña debe tener al menos 6 caracteres.",
  "New password should be different from the old password.":
    "La nueva contraseña tiene que ser distinta a la anterior.",
  "Auth session missing":
    "Sesión de recuperación vencida. Pedí un link nuevo.",
};

function translateError(msg: string) {
  for (const [k, v] of Object.entries(ERROR_MAP)) {
    if (msg.includes(k) || msg === k) return v;
  }
  return `Error: ${msg}`;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(translateError(updateError.message));
        setLoading(false);
        return;
      }

      setDone(true);
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de red.";
      setError(translateError(msg));
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--color-pampa)" }}
      >
        <div className="w-full max-w-[420px] text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ backgroundColor: "rgba(22,163,74,0.1)" }}
          >
            <CheckCircle2 size={32} color="#16a34a" />
          </div>
          <h2
            className="text-2xl font-bold mb-3"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              color: "var(--color-tierra)",
            }}
          >
            Contraseña actualizada
          </h2>
          <p className="text-sm mb-6" style={{ color: "rgba(26,26,24,0.55)" }}>
            Ya podés entrar con la nueva contraseña.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="w-full max-w-xs mx-auto py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "var(--color-campo)", color: "#ffffff" }}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-pampa)" }}
    >
      <div className="w-full max-w-[420px]">
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
            Nueva contraseña
          </p>
        </div>

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
            Elegí una contraseña nueva
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-tierra)" }}
              >
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none"
                  style={{
                    border: "1.5px solid rgba(212,197,169,0.8)",
                    backgroundColor: "var(--color-pampa)",
                    color: "var(--color-tierra)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(26,26,24,0.35)" }}
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-tierra)" }}
              >
                Confirmar
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  border: "1.5px solid rgba(212,197,169,0.8)",
                  backgroundColor: "var(--color-pampa)",
                  color: "var(--color-tierra)",
                }}
              />
            </div>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2"
              style={{
                backgroundColor: "var(--color-campo)",
                color: "#ffffff",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar contraseña"
              )}
            </button>
          </form>

          <p
            className="text-center text-sm mt-6"
            style={{ color: "rgba(26,26,24,0.5)" }}
          >
            <Link
              href="/forgot-password"
              className="font-semibold"
              style={{ color: "var(--color-cuero)" }}
            >
              Pedir otro link
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
