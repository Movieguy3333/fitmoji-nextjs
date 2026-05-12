export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const keyForCell = (r: number, c: number) => `${r}:${c}`;

export const pickString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const pickTimestampVersion = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') return null;
  const seconds = (value as { seconds?: unknown }).seconds;
  const nanoseconds = (value as { nanoseconds?: unknown }).nanoseconds;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const nanosPart =
    typeof nanoseconds === 'number' && Number.isFinite(nanoseconds)
      ? `-${Math.max(0, Math.floor(nanoseconds))}`
      : '';
  return `${Math.max(0, Math.floor(seconds))}${nanosPart}`;
};

export const randomIntBetween = (min: number, max: number) => {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + Math.floor(Math.random() * (upper - lower + 1));
};

export const pickWeightedValue = <T extends { weight: number }>(items: readonly T[]): T => {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= Math.max(1, item.weight);
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
};

export const parseTimestampMs = (value: unknown): number | null => {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  if (!value || typeof value !== 'object') return null;

  const timestampLike = value as { seconds?: unknown; toMillis?: unknown };
  if (typeof timestampLike.toMillis === 'function') {
    try {
      const ms = timestampLike.toMillis();
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  if (typeof timestampLike.seconds === 'number' && Number.isFinite(timestampLike.seconds)) {
    return timestampLike.seconds * 1000;
  }
  return null;
};

export const parseStoredPositiveInt = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;

export const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

