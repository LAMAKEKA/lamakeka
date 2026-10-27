/**
 * Prepara adjuntos de finanzas antes de subir a Storage.
 * - Imágenes: redimensiona + JPEG (canvas). HEIC sin decode nativo → se valida size.
 * - PDF / Word / Excel: ya vienen comprimidos (deflate); se valida tope y se sube tal cual.
 *   (Re-escribir PDF/DOCX en browser sin libs pesadas no baja materialmente el peso.)
 */

export const ADJUNTO_MAX_FILES = 10;
/** Tope post-prepare por archivo (Storage bucket = 10 MB). */
export const ADJUNTO_MAX_BYTES = 8 * 1024 * 1024;
/** Tope de entrada antes de intentar comprimir (foto celu cruda). */
export const ADJUNTO_MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const ADJUNTO_MAX_EDGE = 1600;
export const ADJUNTO_JPEG_QUALITY = 0.72;

export const ADJUNTO_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type AdjuntoKind = "image" | "pdf" | "word" | "excel" | "other";

export type PreparedAttachment = {
  file: File;
  kind: AdjuntoKind;
  originalName: string;
  originalBytes: number;
  finalBytes: number;
  compressed: boolean;
  /** true si el cliente bajó bytes (solo imágenes tipicamente) */
  savedBytes: number;
};

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/heic",
  "image/heif",
]);

const PDF_MIME = new Set(["application/pdf"]);

const WORD_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXCEL_MIME = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXT_KIND: Record<string, AdjuntoKind> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  bmp: "image",
  heic: "image",
  heif: "image",
  pdf: "pdf",
  doc: "word",
  docx: "word",
  xls: "excel",
  xlsx: "excel",
};

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

export function detectAdjuntoKind(file: { name: string; type: string }): AdjuntoKind {
  const t = (file.type || "").toLowerCase();
  if (IMAGE_MIME.has(t) || t.startsWith("image/")) return "image";
  if (PDF_MIME.has(t)) return "pdf";
  if (WORD_MIME.has(t)) return "word";
  if (EXCEL_MIME.has(t)) return "excel";
  const ext = extOf(file.name);
  return EXT_KIND[ext] ?? "other";
}

export function isAllowedAdjunto(file: { name: string; type: string }): boolean {
  const kind = detectAdjuntoKind(file);
  return kind !== "other";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Valida selección multi (cantidad + tipos) antes de comprimir. */
export function validateAdjuntoSelection(files: File[]): string | null {
  if (files.length === 0) return null;
  if (files.length > ADJUNTO_MAX_FILES) {
    return `Máximo ${ADJUNTO_MAX_FILES} archivos por movimiento.`;
  }
  for (const f of files) {
    if (!isAllowedAdjunto(f)) {
      return `"${f.name}" no es un tipo permitido (imagen, PDF, Word o Excel).`;
    }
    if (f.size > ADJUNTO_MAX_INPUT_BYTES) {
      return `"${f.name}" pesa ${formatBytes(f.size)} (máx entrada ${formatBytes(ADJUNTO_MAX_INPUT_BYTES)}).`;
    }
  }
  return null;
}

function canRasterize(mime: string): boolean {
  const t = mime.toLowerCase();
  return (
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/png" ||
    t === "image/webp" ||
    t === "image/gif" ||
    t === "image/bmp"
  );
}

/**
 * Comprime imagen con canvas → JPEG.
 * Si falla decode (HEIC en algunos browsers) o no baja de peso, devuelve original si cabe.
 */
export async function compressImageFile(
  file: File,
  opts?: { maxEdge?: number; quality?: number; maxBytes?: number }
): Promise<{ file: File; compressed: boolean }> {
  const maxEdge = opts?.maxEdge ?? ADJUNTO_MAX_EDGE;
  const quality = opts?.quality ?? ADJUNTO_JPEG_QUALITY;
  const maxBytes = opts?.maxBytes ?? ADJUNTO_MAX_BYTES;

  if (!canRasterize(file.type) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
    // HEIC u otros: sin decode → pasar si cabe
    if (file.size <= maxBytes) return { file, compressed: false };
    throw new Error(
      `"${file.name}" es HEIC/HEIF y el navegador no pudo comprimirla. Convertí a JPG o bajá el peso (< ${formatBytes(maxBytes)}).`
    );
  }

  const doc = globalThis.document;
  const createBitmap = globalThis.createImageBitmap;
  if (!doc || typeof createBitmap !== "function") {
    if (file.size <= maxBytes) return { file, compressed: false };
    throw new Error(`No se pudo comprimir "${file.name}" (sin canvas).`);
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createBitmap(file);
  } catch {
    if (file.size <= maxBytes) return { file, compressed: false };
    throw new Error(`No se pudo leer la imagen "${file.name}". Probá JPG o PNG.`);
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = doc.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if (file.size <= maxBytes) return { file, compressed: false };
      throw new Error(`No se pudo comprimir "${file.name}".`);
    }
    ctx.drawImage(bitmap, 0, 0, w, h);

    const qualities = [quality, 0.6, 0.5, 0.4];
    let best: Blob | null = null;

    for (const q of qualities) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", q)
      );
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= maxBytes) {
        best = blob;
        break;
      }
    }

    if (!best) {
      if (file.size <= maxBytes) return { file, compressed: false };
      throw new Error(`No se pudo comprimir "${file.name}".`);
    }

    // Si el original ya era más chico (png chico / jpeg bueno), quedate con el menor
    if (best.size >= file.size && file.size <= maxBytes) {
      return { file, compressed: false };
    }

    if (best.size > maxBytes) {
      throw new Error(
        `"${file.name}" sigue en ${formatBytes(best.size)} después de comprimir (máx ${formatBytes(maxBytes)}).`
      );
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    const out = new File([best], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    return { file: out, compressed: out.size < file.size };
  } finally {
    bitmap.close();
  }
}

/**
 * Prepara un archivo para upload: comprime imágenes; docs solo validan tope.
 */
export async function prepareGastoAttachment(file: File): Promise<PreparedAttachment> {
  if (!isAllowedAdjunto(file)) {
    throw new Error(`"${file.name}" no es un tipo permitido.`);
  }
  if (file.size > ADJUNTO_MAX_INPUT_BYTES) {
    throw new Error(
      `"${file.name}" pesa ${formatBytes(file.size)} (máx ${formatBytes(ADJUNTO_MAX_INPUT_BYTES)}).`
    );
  }

  const kind = detectAdjuntoKind(file);
  const originalBytes = file.size;
  const originalName = file.name;

  if (kind === "image") {
    const { file: out, compressed } = await compressImageFile(file);
    return {
      file: out,
      kind,
      originalName,
      originalBytes,
      finalBytes: out.size,
      compressed,
      savedBytes: Math.max(0, originalBytes - out.size),
    };
  }

  // PDF / Word / Excel: contenedores ya comprimidos
  if (file.size > ADJUNTO_MAX_BYTES) {
    const label =
      kind === "pdf" ? "PDF" : kind === "word" ? "Word" : kind === "excel" ? "Excel" : "Archivo";
    throw new Error(
      `${label} "${file.name}" pesa ${formatBytes(file.size)}. Máximo ${formatBytes(ADJUNTO_MAX_BYTES)} (exportá comprimido o dividí el doc).`
    );
  }

  return {
    file,
    kind,
    originalName,
    originalBytes,
    finalBytes: file.size,
    compressed: false,
    savedBytes: 0,
  };
}

export async function prepareGastoAttachments(
  files: File[]
): Promise<{ prepared: PreparedAttachment[]; error: string | null }> {
  const selErr = validateAdjuntoSelection(files);
  if (selErr) return { prepared: [], error: selErr };

  const prepared: PreparedAttachment[] = [];
  for (const f of files) {
    try {
      prepared.push(await prepareGastoAttachment(f));
    } catch (e) {
      const msg = e instanceof Error ? e.message : `Error con "${f.name}"`;
      return { prepared: [], error: msg };
    }
  }
  return { prepared, error: null };
}
