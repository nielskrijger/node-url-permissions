/**
 * Retuns `true` when value is a number.
 */
export function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
