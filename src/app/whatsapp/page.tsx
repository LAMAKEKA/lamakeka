"use client";

import { MessageCircle, Smartphone, Zap, ShieldCheck, Clock } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const COMMANDS = [
  {
    cmd: "resumen",
    emoji: "📊",
    desc: "Resumen diario del establecimiento",
    example: "→ Ver totales, tareas y stock de hoy",
    type: "consulta",
  },
  {
    cmd: "cabezas",
    emoji: "🐄",
    desc: "Total de animales por categoría",
    example: "→ Terneros: 45 · Novillos: 120 · ...",
    type: "consulta",
  },
  {
    cmd: "stock",
    emoji: "📦",
    desc: "Insumos bajo el nivel mínimo",
    example: "→ Sal mineral: 18% · Vacuna: 30% · ...",
    type: "consulta",
  },
  {
    cmd: "tareas",
    emoji: "✅",
    desc: "Tareas pendientes del día",
    example: "→ Lista con prioridad y responsable",
    type: "consulta",
  },
  {
    cmd: "gasto [monto] [concepto]",
    emoji: "💸",
    desc: "Registrar un gasto rápido",
    example: "gasto 15000 nafta",
    type: "accion",
  },
  {
    cmd: "ingreso [monto] [concepto]",
    emoji: "💵",
    desc: "Registrar un ingreso rápido",
    example: "ingreso 850000 novillos",
    type: "accion",
  },
  {
    cmd: "tarea [descripción]",
    emoji: "📋",
    desc: "Crear una tarea pendiente",
    example: "tarea revisar alambrado norte",
    type: "accion",
  },
  {
    cmd: "ayuda",
    emoji: "❓",
    desc: "Ver todos los comandos disponibles",
    example: "→ Esta lista completa",
    type: "consulta",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Guardá el número",
    desc: "Agendá nuestro número de WhatsApp en tu teléfono.",
    icon: Smartphone,
  },
  {
    n: "2",
    title: 'Enviá "Hola makeka"',
    desc: "El bot te reconocerá automáticamente por tu cuenta.",
    icon: MessageCircle,
  },
  {
    n: "3",
    title: "¡Listo para usar!",
    desc: "Consultá datos y registrá eventos desde donde estés.",
    icon: Zap,
  },
];

const FEATURES = [
  {
    icon: Zap,
    iconColor: "#d97706",
    iconBg: "rgba(217,119,6,0.10)",
    title: "Respuesta instantánea",
    desc: "Consultas respondidas en menos de 2 segundos",
  },
  {
    icon: ShieldCheck,
    iconColor: "#16a34a",
    iconBg: "rgba(22,163,74,0.09)",
    title: "Vinculado a tu cuenta",
    desc: "Solo vos podés acceder a los datos de tu establecimiento",
  },
  {
    icon: Clock,
    iconColor: "#2563eb",
    iconBg: "rgba(37,99,235,0.08)",
    title: "Disponible 24/7",
    desc: "Registrá desde el campo, sin importar el horario",
  },
];

// ─── Sample conversation ───────────────────────────────────────────────────────

const CHAT = [
  { from: "user", text: "resumen" },
  {
    from: "bot",
    text: "📊 *Resumen — Lunes 2 Jun*\n\n🐄 Cabezas totales: *1.247*\n✅ Tareas pendientes: *3*\n⚠️ Stock crítico: *1 producto*\n💰 Movimientos hoy: *4*\n\nUsá `ayuda` para ver todos los comandos.",
  },
  { from: "user", text: "gasto 18500 combustible bomba" },
  { from: "bot", text: "✅ Gasto registrado\n💸 *$18.500* — combustible bomba\n\nYa está en tu panel de finanzas." },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WhatsappPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="px-8 pt-7 pb-5 border-b"
        style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,197,169,0.5)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(37,211,102,0.12)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-2xl font-bold"
                  style={{
                    color: "var(--color-tierra)",
                    fontFamily: "var(--font-playfair), Georgia, serif",
                  }}
                >
                  Bot de WhatsApp
                </h1>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
                  style={{ backgroundColor: "rgba(217,119,6,0.12)", color: "#d97706" }}
                >
                  PRÓXIMAMENTE
                </span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: "rgba(26,26,24,0.45)" }}>
                Gestioná tu campo desde el chat, sin abrir la app
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 flex flex-col gap-6">
        {/* Top row: steps + chat preview */}
        <div className="grid grid-cols-5 gap-5">
          {/* Left: steps + features */}
          <div className="col-span-3 flex flex-col gap-5">
            {/* How to connect */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 3px rgba(26,26,24,0.06), 0 1px 2px rgba(26,26,24,0.04)",
                border: "1px solid rgba(212,197,169,0.5)",
              }}
            >
              <h2
                className="font-semibold text-base mb-5"
                style={{
                  color: "var(--color-tierra)",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                }}
              >
                Cómo conectarte
              </h2>
              <div className="flex gap-4">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: "var(--color-campo)" }}
                        >
                          {step.n}
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: "rgba(212,197,169,0.5)" }}
                          />
                        )}
                      </div>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: "rgba(37,211,102,0.10)" }}
                      >
                        <Icon size={18} strokeWidth={1.7} style={{ color: "#25D366" }} />
                      </div>
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--color-tierra)" }}
                        >
                          {step.title}
                        </p>
                        <p
                          className="text-xs mt-1 leading-relaxed"
                          style={{ color: "rgba(26,26,24,0.45)" }}
                        >
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phone number placeholder */}
              <div
                className="mt-5 rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.2)" }}
              >
                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium" style={{ color: "#16a34a" }}>
                      Número del bot
                    </p>
                    <p
                      className="text-sm font-bold tracking-wide"
                      style={{ color: "var(--color-tierra)" }}
                    >
                      +54 9 11 • • • • – • • • •
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(217,119,6,0.12)", color: "#d97706" }}
                >
                  EN CONFIGURACIÓN
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4">
              {FEATURES.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-4 flex flex-col gap-3"
                    style={{
                      backgroundColor: "#ffffff",
                      boxShadow: "0 1px 3px rgba(26,26,24,0.06)",
                      border: "1px solid rgba(212,197,169,0.5)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: f.iconBg }}
                    >
                      <Icon size={16} strokeWidth={1.8} style={{ color: f.iconColor }} />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-tierra)" }}
                      >
                        {f.title}
                      </p>
                      <p
                        className="text-xs mt-1 leading-relaxed"
                        style={{ color: "rgba(26,26,24,0.45)" }}
                      >
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: chat preview */}
          <div className="col-span-2">
            <div
              className="rounded-2xl overflow-hidden flex flex-col h-full"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 3px rgba(26,26,24,0.06), 0 1px 2px rgba(26,26,24,0.04)",
                border: "1px solid rgba(212,197,169,0.5)",
              }}
            >
              {/* Chat header */}
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: "#25D366" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold leading-tight">
                    La Makeka Bot
                  </p>
                  <p className="text-white/70 text-xs">en línea</p>
                </div>
              </div>

              {/* Chat body */}
              <div
                className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto"
                style={{ backgroundColor: "#e5ddd5", minHeight: "280px" }}
              >
                {CHAT.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-line"
                      style={{
                        backgroundColor: msg.from === "user" ? "#dcf8c6" : "#ffffff",
                        color: "var(--color-tierra)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.10)",
                        fontFamily: "monospace",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat input (decorative) */}
              <div
                className="px-3 py-2 flex items-center gap-2 border-t"
                style={{ borderColor: "rgba(212,197,169,0.4)" }}
              >
                <div
                  className="flex-1 rounded-full px-3 py-1.5 text-xs"
                  style={{
                    backgroundColor: "rgba(212,197,169,0.2)",
                    color: "rgba(26,26,24,0.35)",
                  }}
                >
                  Escribí un comando...
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Commands grid */}
        <div
          className="rounded-2xl"
          style={{
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(26,26,24,0.06), 0 1px 2px rgba(26,26,24,0.04)",
            border: "1px solid rgba(212,197,169,0.5)",
          }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(212,197,169,0.4)" }}>
            <div className="flex items-center gap-3">
              <h2
                className="font-semibold text-base"
                style={{
                  color: "var(--color-tierra)",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                }}
              >
                Comandos disponibles
              </h2>
              <div className="flex gap-2">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(37,99,235,0.08)", color: "#2563eb" }}
                >
                  CONSULTA
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(22,163,74,0.09)", color: "#16a34a" }}
                >
                  ACCIÓN
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-0 divide-x divide-y" style={{ borderColor: "rgba(212,197,169,0.3)" }}>
            {COMMANDS.map((cmd, idx) => (
              <div
                key={idx}
                className="p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{cmd.emoji}</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: cmd.type === "consulta"
                        ? "rgba(37,99,235,0.08)"
                        : "rgba(22,163,74,0.09)",
                      color: cmd.type === "consulta" ? "#2563eb" : "#16a34a",
                    }}
                  >
                    {cmd.type.toUpperCase()}
                  </span>
                </div>
                <div>
                  <code
                    className="text-xs font-mono font-semibold block mb-1"
                    style={{ color: "var(--color-tierra)" }}
                  >
                    {cmd.cmd}
                  </code>
                  <p className="text-xs" style={{ color: "rgba(26,26,24,0.5)" }}>
                    {cmd.desc}
                  </p>
                  <p
                    className="text-[10px] mt-1.5 font-mono"
                    style={{ color: "rgba(26,26,24,0.32)" }}
                  >
                    {cmd.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
