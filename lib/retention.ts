const HOUR_MS = 60 * 60 * 1_000;
const INACTIVITY_WINDOW_MS = 72 * HOUR_MS;
const HARD_LIMIT_MS = 7 * 24 * HOUR_MS;

export function initialExpiry(now = new Date()): string {
  return new Date(now.getTime() + INACTIVITY_WINDOW_MS).toISOString();
}

export function refreshedExpiry(
  createdAt: string,
  now = new Date(),
): string {
  const inactivityExpiry = now.getTime() + INACTIVITY_WINDOW_MS;
  const hardExpiry = new Date(createdAt).getTime() + HARD_LIMIT_MS;
  return new Date(Math.min(inactivityExpiry, hardExpiry)).toISOString();
}
