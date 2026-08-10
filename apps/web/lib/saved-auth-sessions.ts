import type { Session } from "@supabase/supabase-js";

export const SAVED_AUTH_SESSIONS_STORAGE_KEY = "textplex.saved-auth-sessions";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isStoredSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<Session>;
  const user = session.user;
  return Boolean(
    typeof session.access_token === "string" &&
      session.access_token &&
      typeof session.refresh_token === "string" &&
      session.refresh_token &&
      user &&
      typeof user === "object" &&
      typeof user.id === "string" &&
      user.id,
  );
}

export function readSavedAuthSessions(): Session[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(SAVED_AUTH_SESSIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sessions = parsed.filter(isStoredSession);
    const unique = new Map<string, Session>();
    sessions.forEach((session) => unique.set(session.user.id, session));
    return [...unique.values()];
  } catch {
    return [];
  }
}

export function saveAuthSession(session: Session): Session[] {
  const sessions = readSavedAuthSessions().filter((savedSession) => savedSession.user.id !== session.user.id);
  sessions.unshift(session);

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(SAVED_AUTH_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // The active Supabase session remains usable when browser storage is unavailable.
    }
  }

  return sessions;
}

export function removeSavedAuthSession(userId: string): Session[] {
  const sessions = readSavedAuthSessions().filter((session) => session.user.id !== userId);
  const storage = getStorage();
  if (storage) {
    try {
      if (sessions.length > 0) {
        storage.setItem(SAVED_AUTH_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      } else {
        storage.removeItem(SAVED_AUTH_SESSIONS_STORAGE_KEY);
      }
    } catch {
      // Removing a saved account is best effort if browser storage is unavailable.
    }
  }
  return sessions;
}
