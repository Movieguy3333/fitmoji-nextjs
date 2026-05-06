export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const keyForCell = (r: number, c: number) => `${r}:${c}`;

export const randomIntBetween = (min: number, max: number) => {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + Math.floor(Math.random() * (upper - lower + 1));
};
