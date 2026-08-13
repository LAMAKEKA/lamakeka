export function normalizeEid(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 15);
}

export function isValidEid(raw: string): boolean {
  return /^\d{15}$/.test(normalizeEid(raw));
}
