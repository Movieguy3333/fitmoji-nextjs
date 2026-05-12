/**
 * Formats a number into a compact string with a 'K' suffix if >= 1000.
 * e.g., 75495 -> 75.5K, 1000 -> 1K, 950 -> 950
 */
export const formatCompactNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
};
