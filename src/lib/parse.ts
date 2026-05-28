/**
 * Safely parse a string/number to a finite number.
 * Returns null if the input is empty, non-numeric, or infinite.
 */
export function parseNum(s: string | number | undefined | null): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
