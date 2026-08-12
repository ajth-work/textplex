const onboardingCompletionStoragePrefix = "textplex:onboarding-completed:";

function onboardingCompletionStorageKey(userId: string): string {
  return `${onboardingCompletionStoragePrefix}${userId}`;
}

export function hasCachedOnboardingCompletion(userId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(onboardingCompletionStorageKey(userId)) === "true";
  } catch {
    return false;
  }
}

export function cacheOnboardingCompletion(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(onboardingCompletionStorageKey(userId), "true");
  } catch {
    // The server remains authoritative when browser storage is unavailable.
  }
}

export function clearCachedOnboardingCompletion(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(onboardingCompletionStorageKey(userId));
  } catch {
    // A stale cache cannot prevent the server check from correcting the state.
  }
}
