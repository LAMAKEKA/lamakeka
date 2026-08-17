export interface SenasaRow {
  eid: string;
  vid: string | null;
  sexo: string | null;
  raza: string | null;
  fecha_nacimiento: string | null;
  fecha_aplicacion: string | null;
  motivo_declaracion: string | null;
}

function escapeCsvCell(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildSenasaCsv(rows: SenasaRow[]): string {
  const headers = ["EID", "VID", "Sexo", "Raza", "Fecha Nacimiento", "Fecha Aplicación", "Motivo"];
  const lines = rows.map((r) =>
    [
      r.eid,
      r.vid ?? "",
      r.sexo ?? "",
      r.raza ?? "",
      r.fecha_nacimiento ?? "",
      r.fecha_aplicacion ?? "",
      r.motivo_declaracion ?? "",
    ].map(escapeCsvCell).join(",")
  );
  return "\uFEFF" + [headers.join(","), ...lines].join("\r\n");
}

// Formato SIGSA (beta): verificar contra el Manual de Declaración de Dispositivos
// de Identificación Electrónica (RFID) antes de usar la importación por archivo.
export function buildSenasaTxt(rows: SenasaRow[], renspa: string, fechaAplicacion: string, motivo: string): string {
  const cabecera = `${renspa}-${fechaAplicacion}-${motivo}`;
  const dispositivos = rows
    .map((r) => [r.eid, r.sexo ?? "", r.raza ?? "", r.fecha_nacimiento ?? ""].join("-"))
    .join(";");
  return `${cabecera};${dispositivos}`;
}
