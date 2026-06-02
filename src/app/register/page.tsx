"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ERROR_MAP: Record<string, string> = {
  "User already registered": "Este email ya está registrado.",
  "Password should be at least 6 characters":
    "La contraseña debe tener al menos 6 caracteres.",
  "Unable to validate email address: invalid format":
    "El formato del email no es válido.",
  "email rate limit exceeded":
    "Límite de emails alcanzado. Esperá unos minutos e intentá de nuevo.",
  "Email rate limit exceeded":
    "Límite de emails alcanzado. Esperá unos minutos e intentá de nuevo.",
  "over_email_send_rate_limit":
    "Límite de emails alcanzado. Esperá unos minutos e intentá de nuevo.",
  "Signup requires a valid password":
    "La contraseña no cumple los requisitos mínimos.",
};

function translateError(msg: string) {
  return ERROR_MAP[msg] ?? `Error: ${msg}`;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({ label, value, onChange, type = "text", placeholder, required }: FieldProps) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: "var(--color-tierra)" }}
      >
        {label}
        {required && <span style={{ color: "var(--color-cuero)" }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
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
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function set(field: keyof typeof form) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nombre: form.nombre,
          apellido: form.apellido,
          whatsapp: form.whatsapp,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(translateError(authError.message));
      setLoading(false);
      return;
    }

    // Check if email confirmation is required
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      router.push("/setup");
      router.refresh();
    } else {
      // Email confirmation pending
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
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
            ¡Revisá tu email!
          </h2>
          <p className="text-sm mb-6" style={{ color: "rgba(26,26,24,0.55)" }}>
            Te enviamos un link de confirmación a{" "}
            <strong style={{ color: "var(--color-tierra)" }}>{form.email}</strong>.
            Hacé click en el link para activar tu cuenta.
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
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: "var(--color-pampa)" }}
    >
      <div className="w-full max-w-[480px]">
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
            Creá tu cuenta gratis
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
            Crear cuenta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre + Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Nombre"
                value={form.nombre}
                onChange={set("nombre")}
                placeholder="Juan"
                required
              />
              <Field
                label="Apellido"
                value={form.apellido}
                onChange={set("apellido")}
                placeholder="Pérez"
                required
              />
            </div>

            {/* Email */}
            <Field
              label="Email"
              value={form.email}
              onChange={set("email")}
              type="email"
              placeholder="juan@email.com"
              required
            />

            {/* WhatsApp */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-tierra)" }}
              >
                WhatsApp{" "}
                <span style={{ color: "rgba(26,26,24,0.35)", fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: "rgba(26,26,24,0.4)" }}
                >
                  +54
                </span>
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp")(e.target.value)}
                  placeholder="11 2345-6789"
                  className="w-full pl-12 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
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
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-tierra)" }}
              >
                Contraseña <span style={{ color: "var(--color-cuero)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password")(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
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

            {/* Confirm Password */}
            <Field
              label="Confirmar contraseña"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              type={showPassword ? "text" : "password"}
              placeholder="Repetí tu contraseña"
              required
            />

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
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <p
            className="text-center text-sm mt-6"
            style={{ color: "rgba(26,26,24,0.5)" }}
          >
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold"
              style={{ color: "var(--color-cuero)" }}
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
