/**
 * Pide por prompt cuántas copias de una figurita publicar (1..max).
 * Devuelve null si el usuario cancela; reintenta ante entradas inválidas.
 * Extraído del happy path de publicar (compartido por Todas y Repetidas).
 */
export function askQuantity(max: number): number | null {
  const input = window.prompt(
    `¿Cuántas copias de esta figurita querés publicar? (máximo ${max})`,
    '1',
  );
  if (input === null) return null;
  const qty = parseInt(input, 10);
  if (isNaN(qty) || qty < 1 || qty > max) {
    alert(`Ingresá un número entre 1 y ${max}`);
    return askQuantity(max);
  }
  return qty;
}
