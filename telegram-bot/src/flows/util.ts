/**
 * Parsea índices 1-based separados por coma (ej. "1,3,5"). Devuelve [] si algún
 * token es inválido o cae fuera de [1, max]. Deduplica preservando el orden.
 */
export function parseIndices(text: string, max: number): number[] {
  const parts = text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) return [];
  // Estricto: solo dígitos. Number.parseInt es lenient ("1abc" -> 1), lo que
  // aceptaría un índice equivocado; exigir /^\d+$/ rechaza esos tokens.
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : Number.NaN));
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > max)) return [];
  return [...new Set(nums)];
}
