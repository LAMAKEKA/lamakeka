"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MAP: Record<string, string> = {
  "Email not confirmed": "Confirmá tu email antes de recuperar la contraseña.",
  "For security purposes, you can only request this after":
    "Esperá un momento antes de pedir otro email.",
  "email rate limit exceeded": "Límite de emails alcanzado. Esperá unos minutos.",
  "Email rate limit exceeded": "Límite de emails alcanzado. Esperá unos minutos.",
};

function translateError(msg: string) {
  for (const [k, v] of Object.entries(ERROR_MAP)) {
    if (msg.includes(k) || msg === k) return v;
  }
  return `Error: ${msg}`;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      if (resetError) {
        setError(translateError(resetError.message));
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de red.";
      setError(translateError(msg));
      setLoading(false);
    }
  }

  if (sent) {
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
            Revisá tu email
          </h2>
          <p className="text-sm mb-6" style={{ color: "rgba(26,26,24,0.55)" }}>
            Si existe una cuenta con{" "}
            <strong style={{ color: "var(--color-tierra)" }}>{email.trim()}</strong>,
            te mandamos un link para restablecer la contraseña.
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold"
            style={{ color: "var(--color-cuero)" }}
          >
            ← Volver al login
          </Link>
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
            Recuperar contraseña
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
            className="text-xl font-semibold mb-2"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              color: "var(--color-tierra)",
            }}
          >
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-sm mb-6" style={{ color: "rgba(26,26,24,0.5)" }}>
            Ingresá tu email y te mandamos un link para crear una nueva.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  Enviando...
                </>
              ) : (
                "Enviar link"
              )}
            </button>
          </form>

          <p
            className="text-center text-sm mt-6"
            style={{ color: "rgba(26,26,24,0.5)" }}
          >
            <Link
              href="/login"
              className="font-semibold"
              style={{ color: "var(--color-cuero)" }}
            >
              ← Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
