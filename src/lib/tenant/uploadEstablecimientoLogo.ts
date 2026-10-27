import type { SupabaseClient } from "@supabase/supabase-js";

export const LOGO_BUCKET = "establecimiento-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export function validateLogoFile(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Usá PNG, JPG, WEBP o SVG.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return "El logo no puede superar 2 MB.";
  }
  return null;
}

function extFor(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/svg+xml") return "svg";
  if (file.type === "image/jpeg") return "jpg";
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["png", "jpg", "jpeg", "webp", "svg"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "png";
}

/**
 * Sube logo a Storage (bucket público) y devuelve URL pública.
 * Path: {userId}/{timestamp}.{ext}
 */
export async function uploadEstablecimientoLogo(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ publicUrl: string } | { error: string }> {
  const invalid = validateLogoFile(file);
  if (invalid) return { error: invalid };

  const path = `${userId}/${Date.now()}.${extFor(file)}`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/png",
  });

  if (error) {
    const msg = error.message || "No se pudo subir el logo.";
    if (/bucket|not found|row-level|policy|403|401/i.test(msg)) {
      return {
        error:
          "No se pudo subir el logo (Storage). ¿Creaste el bucket establecimiento-logos? Podés seguir sin logo y cargarlo después en Mi campo.",
      };
    }
    return { error: msg };
  }

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return { error: "No se obtuvo URL pública del logo." };
  return { publicUrl: data.publicUrl };
}
