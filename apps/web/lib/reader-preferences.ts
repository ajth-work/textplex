export const READER_NAV_HIDE_DELAY_STORAGE_KEY = "textplex.readerNavHideDelayMs";
export const READER_NAV_HIDE_DELAY_CHANGE_EVENT = "textplex:reader-nav-hide-delay-change";
export const READER_NAV_HIDE_DELAY_DEFAULT_MS = 3200;
export const READER_NAV_HIDE_DELAY_MIN_MS = 1000;
export const READER_NAV_HIDE_DELAY_MAX_MS = 15000;
export const READER_NAV_HIDE_DELAY_STEP_MS = 100;

export function resolveReaderNavHideDelayMs(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return READER_NAV_HIDE_DELAY_DEFAULT_MS;
  }

  const stepped = Math.round(parsed / READER_NAV_HIDE_DELAY_STEP_MS) * READER_NAV_HIDE_DELAY_STEP_MS;
  return Math.min(READER_NAV_HIDE_DELAY_MAX_MS, Math.max(READER_NAV_HIDE_DELAY_MIN_MS, stepped));
}

export function readReaderNavHideDelayMs(): number {
  if (typeof window === "undefined") {
    return READER_NAV_HIDE_DELAY_DEFAULT_MS;
  }

  return resolveReaderNavHideDelayMs(window.localStorage.getItem(READER_NAV_HIDE_DELAY_STORAGE_KEY));
}

export function persistReaderNavHideDelayMs(value: number): number {
  const nextValue = resolveReaderNavHideDelayMs(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(READER_NAV_HIDE_DELAY_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new CustomEvent(READER_NAV_HIDE_DELAY_CHANGE_EVENT));
  }
  return nextValue;
}

export function formatReaderNavHideDelay(ms: number): string {
  return `${(ms / 1000).toFixed(1)} seconds`;
}
