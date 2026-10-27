/**
 * Destinos de email Auth (confirm signup / recovery).
 * Siempre path relativo bajo el origin actual (prod, preview o localhost).
 */

export function signupConfirmRedirect(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent("/setup")}`;
}

export function recoveryRedirect(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
}

/** Allowlist que debe existir en Supabase Auth → URL Configuration. */
export const AUTH_REDIRECT_ALLOWLIST = [
  "https://lamakeka.vercel.app/auth/callback",
  "https://lamakeka.vercel.app/**",
  "http://localhost:3000/auth/callback",
  "http://localhost:3000/**",
  "http://127.0.0.1:3000/auth/callback",
  "http://127.0.0.1:3000/**",
] as const;
