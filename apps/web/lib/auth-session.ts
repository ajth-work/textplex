import type { Session } from "@supabase/supabase-js";

export const AUTH_SESSION_COOKIE_KEY = "textplex.auth-session";
const AUTH_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthSessionSnapshot = {
  accessToken: string;
  user: {
    id: string;
    email: string | null;
    role: string | null;
    display_name: string | null;
    user_metadata: Record<string, unknown> | null;
    app_metadata: Record<string, unknown> | null;
  };
};

function snapshotUser(sessionUser: Session["user"]): AuthSessionSnapshot["user"] {
  const metadata = sessionUser.user_metadata;
  const displayName = metadata && typeof metadata === "object" && typeof (metadata as { display_name?: unknown }).display_name === "string"
    ? (metadata as { display_name: string }).display_name.trim()
    : null;

  return {
    id: sessionUser.id,
    email: sessionUser.email ?? null,
    role: sessionUser.role ?? null,
    display_name: displayName && displayName.length > 0 ? displayName : null,
    user_metadata: metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null,
    app_metadata: sessionUser.app_metadata && typeof sessionUser.app_metadata === "object"
      ? (sessionUser.app_metadata as Record<string, unknown>)
      : null,
  };
}

export function parseAuthSessionCookie(value: string | null | undefined): AuthSessionSnapshot | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<AuthSessionSnapshot> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken.trim() : "";
    const user = parsed.user;
    if (!accessToken || !user || typeof user !== "object" || typeof user.id !== "string" || !user.id.trim()) {
      return null;
    }

    return {
      accessToken,
      user: {
        id: user.id.trim(),
        email: typeof user.email === "string" ? user.email : null,
        role: typeof user.role === "string" ? user.role : null,
        display_name: typeof user.display_name === "string" && user.display_name.trim() ? user.display_name.trim() : null,
        user_metadata: user.user_metadata && typeof user.user_metadata === "object"
          ? (user.user_metadata as Record<string, unknown>)
          : null,
        app_metadata: user.app_metadata && typeof user.app_metadata === "object"
          ? (user.app_metadata as Record<string, unknown>)
          : null,
      },
    };
  } catch {
    return null;
  }
}

function serializeAuthSessionCookie(session: Session | null): string {
  if (!session?.access_token) {
    return `${AUTH_SESSION_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  }

  const snapshot: AuthSessionSnapshot = {
    accessToken: session.access_token,
    user: snapshotUser(session.user),
  };

  return `${AUTH_SESSION_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(snapshot))}; Max-Age=${AUTH_SESSION_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function syncAuthSessionCookie(session: Session | null): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = serializeAuthSessionCookie(session);
}
