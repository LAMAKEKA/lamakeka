"use client";

import { useState, useRef } from "react";
import type { DragEvent } from "react";
import { X, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { exportToExcel } from "@/lib/exportExcel";

export interface RowValidation {
  errors: string[];
}

interface ParsedRow {
  raw: Record<string, unknown>;
  errors: string[];
}

interface ImportModalProps {
  title: string;
  columns: string[];
  templateFilename: string;
  templateExample: Record<string, unknown>;
  validateRow: (raw: Record<string, unknown>) => RowValidation;
  onConfirm: (validRows: Record<string, unknown>[]) => Promise<void>;
  onClose: () => void;
}

export function ImportModal({
  title,
  columns,
  templateFilename,
  templateExample,
  validateRow,
  onConfirm,
  onClose,
}: ImportModalProps) {
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    exportToExcel([templateExample], title, templateFilename);
  }

  function processFile(file: File) {
    setFileError(null);
    setRows(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (rawRows.length === 0) {
          setFileError("El archivo no tiene datos.");
          return;
        }
        const parsed: ParsedRow[] = rawRows.map((r) => ({
          raw: r,
          errors: validateRow(r).errors,
        }));
        setRows(parsed);
      } catch {
        setFileError("No se pudo leer el archivo. Usá formato .xlsx o .xls.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  async function handleConfirm() {
    if (!rows) return;
    const valid = rows.filter((r) => r.errors.length === 0).map((r) => r.raw);
    if (valid.length === 0) return;
    setImporting(true);
    setFileError(null);
    try {
      await onConfirm(valid);
      setResult({ success: valid.length, failed: rows.length - valid.length });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Error al importar.");
      setImporting(false);
    }
  }

  const validCount = rows?.filter((r) => r.errors.length === 0).length ?? 0;
  const invalidCount = rows?.filter((r) => r.errors.length > 0).length ?? 0;
  const previewRows = rows?.slice(0, 5) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(26,26,24,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "0 20px 60px rgba(26,26,24,0.18)",
          border: "1px solid rgba(212,197,169,0.5)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0"
          style={{ borderColor: "rgba(212,197,169,0.4)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: "rgba(26,26,24,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(212,197,169,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
          {result ? (
            /* ── Success ── */
            <div className="flex flex-col items-center py-10 gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(22,163,74,0.09)" }}
              >
                <CheckCircle2 size={28} style={{ color: "#16a34a" }} />
              </div>
              <div className="text-center">
                <p
                  className="text-lg font-semibold"
                  style={{ color: "var(--color-tierra)", fontFamily: "var(--font-playfair), Georgia, serif" }}
                >
                  Importación completada
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(26,26,24,0.5)" }}>
                  {result.success}{" "}
                  {result.success === 1 ? "registro importado" : "registros importados"}
                  {result.failed > 0 && ` · ${result.failed} con errores omitidos`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--color-campo)" }}
              >
                Cerrar
              </button>
            </div>
          ) : rows ? (
            /* ── Preview ── */
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ backgroundColor: "rgba(22,163,74,0.09)", color: "#16a34a" }}
                  >
                    {validCount} válidas
                  </span>
                  {invalidCount > 0 && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ backgroundColor: "rgba(220,38,38,0.07)", color: "#dc2626" }}
                    >
                      {invalidCount} con errores
                    </span>
                  )}
                  {rows.length > 5 && (
                    <span className="text-xs" style={{ color: "rgba(26,26,24,0.4)" }}>
                      · Mostrando 5 de {rows.length} filas
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setRows(null); setFileError(null); }}
                  className="text-xs font-medium"
                  style={{ color: "rgba(26,26,24,0.45)" }}
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Preview table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(212,197,169,0.5)" }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid rgba(212,197,169,0.4)",
                          backgroundColor: "rgba(240,237,230,0.5)",
                        }}
                      >
                        <th
                          className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
                          style={{ color: "rgba(26,26,24,0.38)", width: 32 }}
                        >
                          #
                        </th>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
                            style={{ color: "rgba(26,26,24,0.38)" }}
                          >
                            {col}
                          </th>
                        ))}
                        <th
                          className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
                          style={{ color: "rgba(26,26,24,0.38)" }}
                        >
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => {
                        const hasError = row.errors.length > 0;
                        return (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                i < previewRows.length - 1
                                  ? "1px solid rgba(212,197,169,0.22)"
                                  : "none",
                              backgroundColor: hasError
                                ? "rgba(220,38,38,0.028)"
                                : "transparent",
                            }}
                          >
                            <td
                              className="px-3 py-3 text-xs tabular-nums"
                              style={{ color: "rgba(26,26,24,0.35)" }}
                            >
                              {i + 1}
                            </td>
                            {columns.map((col) => (
                              <td
                                key={col}
                                className="px-3 py-3 text-sm"
                                style={{ color: hasError ? "#b91c1c" : "var(--color-tierra)" }}
                              >
                                {String(row.raw[col] ?? "")}
                              </td>
                            ))}
                            <td className="px-3 py-3 whitespace-nowrap">
                              {hasError ? (
                                <span className="text-xs" style={{ color: "#dc2626" }}>
                                  ⚠ {row.errors[0]}
                                </span>
                              ) : (
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: "#16a34a" }}
                                >
                                  ✓ OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {fileError && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "rgba(220,38,38,0.06)",
                    color: "#dc2626",
                    border: "1px solid rgba(220,38,38,0.15)",
                  }}
                >
                  <AlertCircle size={15} className="shrink-0" />
                  {fileError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setRows(null); setFileError(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    border: "1.5px solid rgba(212,197,169,0.8)",
                    color: "var(--color-tierra)",
                    backgroundColor: "transparent",
                  }}
                >
                  Volver
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={importing || validCount === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "var(--color-campo)",
                    opacity: importing || validCount === 0 ? 0.6 : 1,
                  }}
                >
                  {importing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Importando...
                    </>
                  ) : (
                    `Confirmar importación (${validCount} fila${validCount !== 1 ? "s" : ""})`
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ── Upload zone ── */
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center py-14 rounded-2xl cursor-pointer"
                style={{
                  border: `2px dashed ${dragging ? "var(--color-cuero)" : "rgba(212,197,169,0.7)"}`,
                  backgroundColor: dragging ? "rgba(139,78,42,0.04)" : "rgba(240,237,230,0.25)",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(58,74,50,0.08)" }}
                >
                  <Upload
                    size={24}
                    style={{ color: "var(--color-campo)" }}
                    strokeWidth={1.8}
                  />
                </div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--color-tierra)" }}
                >
                  Arrastrá tu archivo Excel aquí
                </p>
                <p className="text-xs" style={{ color: "rgba(26,26,24,0.4)" }}>
                  o hacé click para seleccionar &nbsp;·&nbsp; .xlsx / .xls
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {fileError && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "rgba(220,38,38,0.06)",
                    color: "#dc2626",
                    border: "1px solid rgba(220,38,38,0.15)",
                  }}
                >
                  <AlertCircle size={15} className="shrink-0" />
                  {fileError}
                </div>
              )}

              {/* Template download */}
              <div
                className="flex items-center justify-between px-4 py-3.5 rounded-xl"
                style={{
                  backgroundColor: "rgba(240,237,230,0.5)",
                  border: "1px solid rgba(212,197,169,0.4)",
                }}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet
                    size={18}
                    style={{ color: "var(--color-cuero)" }}
                    strokeWidth={1.6}
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-tierra)" }}
                    >
                      Plantilla de importación
                    </p>
                    <p className="text-xs" style={{ color: "rgba(26,26,24,0.4)" }}>
                      Descargá el formato correcto con un ejemplo
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "rgba(58,74,50,0.09)", color: "var(--color-campo)" }}
                >
                  <Download size={13} strokeWidth={2} />
                  Descargar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
