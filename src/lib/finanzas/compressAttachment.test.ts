import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ADJUNTO_MAX_BYTES,
  ADJUNTO_MAX_FILES,
  ADJUNTO_MAX_INPUT_BYTES,
  detectAdjuntoKind,
  extOf,
  formatBytes,
  isAllowedAdjunto,
  prepareGastoAttachment,
  prepareGastoAttachments,
  validateAdjuntoSelection,
} from "./compressAttachment";

function fakeFile(
  name: string,
  size: number,
  type: string,
  content = "x"
): File {
  // Pad content roughly to size for size checks (not exact for large)
  const body =
    size <= 64
      ? content.repeat(Math.max(1, size))
      : new Blob([new Uint8Array(Math.min(size, 1024))]);
  const f = new File([body], name, { type, lastModified: Date.now() });
  // Override size for validation unit tests (File size is read-only from blob)
  Object.defineProperty(f, "size", { get: () => size });
  return f;
}

describe("compressAttachment helpers", () => {
  it("extOf y detectAdjuntoKind", () => {
    expect(extOf("factura.PDF")).toBe("pdf");
    expect(extOf("sin")).toBe("");
    expect(detectAdjuntoKind({ name: "a.jpg", type: "image/jpeg" })).toBe("image");
    expect(detectAdjuntoKind({ name: "a.HEIC", type: "" })).toBe("image");
    expect(detectAdjuntoKind({ name: "x.pdf", type: "application/pdf" })).toBe("pdf");
    expect(detectAdjuntoKind({ name: "c.docx", type: "" })).toBe("word");
    expect(detectAdjuntoKind({ name: "d.xlsx", type: "" })).toBe("excel");
    expect(detectAdjuntoKind({ name: "z.exe", type: "application/octet-stream" })).toBe(
      "other"
    );
  });

  it("isAllowedAdjunto", () => {
    expect(isAllowedAdjunto({ name: "f.jpg", type: "image/jpeg" })).toBe(true);
    expect(isAllowedAdjunto({ name: "f.pdf", type: "application/pdf" })).toBe(true);
    expect(isAllowedAdjunto({ name: "f.doc", type: "application/msword" })).toBe(true);
    expect(isAllowedAdjunto({ name: "f.zip", type: "application/zip" })).toBe(false);
  });

  it("formatBytes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toMatch(/KB/);
    expect(formatBytes(3 * 1024 * 1024)).toMatch(/MB/);
  });

  it("validateAdjuntoSelection cantidad y tipos", () => {
    expect(validateAdjuntoSelection([])).toBeNull();
    const tooMany = Array.from({ length: ADJUNTO_MAX_FILES + 1 }, (_, i) =>
      fakeFile(`a${i}.pdf`, 100, "application/pdf")
    );
    expect(validateAdjuntoSelection(tooMany)).toMatch(/Máximo/);
    expect(
      validateAdjuntoSelection([fakeFile("x.zip", 10, "application/zip")])
    ).toMatch(/no es un tipo/);
    expect(
      validateAdjuntoSelection([
        fakeFile("huge.pdf", ADJUNTO_MAX_INPUT_BYTES + 1, "application/pdf"),
      ])
    ).toMatch(/pesa/);
  });
});

describe("prepareGastoAttachment docs", () => {
  it("PDF bajo el tope pasa sin comprimir", async () => {
    const f = fakeFile("factura.pdf", 500_000, "application/pdf");
    const p = await prepareGastoAttachment(f);
    expect(p.kind).toBe("pdf");
    expect(p.compressed).toBe(false);
    expect(p.finalBytes).toBe(500_000);
    expect(p.originalName).toBe("factura.pdf");
  });

  it("Word/Excel bajo el tope pasan", async () => {
    const w = await prepareGastoAttachment(
      fakeFile("nota.docx", 100_000, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    );
    expect(w.kind).toBe("word");
    const x = await prepareGastoAttachment(
      fakeFile("planilla.xlsx", 100_000, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    );
    expect(x.kind).toBe("excel");
  });

  it("PDF sobre el tope post-prepare falla con mensaje claro", async () => {
    const f = fakeFile("gordo.pdf", ADJUNTO_MAX_BYTES + 1, "application/pdf");
    await expect(prepareGastoAttachment(f)).rejects.toThrow(/PDF/);
  });

  it("prepareGastoAttachments batch corta en el primero malo", async () => {
    const ok = fakeFile("a.pdf", 1000, "application/pdf");
    const bad = fakeFile("b.zip", 1000, "application/zip");
    const r = await prepareGastoAttachments([ok, bad]);
    expect(r.error).toMatch(/no es un tipo|Máximo|tipo/);
    expect(r.prepared).toEqual([]);
  });
});

describe("prepareGastoAttachment image path (mock canvas)", () => {
  const g = globalThis as typeof globalThis & {
    document?: Document;
    createImageBitmap?: typeof createImageBitmap;
  };
  const originalCreateImageBitmap = g.createImageBitmap;
  const originalDocument = g.document;

  beforeEach(() => {
    const fakeCtx = { drawImage: vi.fn() };
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => fakeCtx,
      toBlob: (cb: (b: Blob | null) => void) => {
        cb(new Blob([new Uint8Array(1200)], { type: "image/jpeg" }));
      },
    };

    g.document = {
      createElement: (tag: string) => {
        if (tag === "canvas") return fakeCanvas;
        throw new Error(`unexpected createElement(${tag})`);
      },
    } as unknown as Document;

    g.createImageBitmap = (async () => ({
      width: 4000,
      height: 3000,
      close: vi.fn(),
    })) as typeof createImageBitmap;
  });

  afterEach(() => {
    g.createImageBitmap = originalCreateImageBitmap;
    g.document = originalDocument;
  });

  it("comprime imagen grande a jpeg más chico", async () => {
    const f = fakeFile("foto.png", 2_000_000, "image/png");
    const p = await prepareGastoAttachment(f);
    expect(p.kind).toBe("image");
    expect(p.file.type).toBe("image/jpeg");
    expect(p.file.name).toMatch(/\.jpg$/i);
    expect(p.finalBytes).toBeLessThan(p.originalBytes);
    expect(p.compressed).toBe(true);
    expect(p.savedBytes).toBeGreaterThan(0);
  });
});
