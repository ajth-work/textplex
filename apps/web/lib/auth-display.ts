"use client";

type AccountIdentity = {
  email?: string | null;
  id?: string | null;
  display_name?: string | null;
  user_metadata?: unknown;
};

function readDisplayName(user: AccountIdentity | null | undefined): string | null {
  if (typeof user?.display_name === "string" && user.display_name.trim()) {
    return user.display_name.trim();
  }

  const metadata = user?.user_metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const displayName = (metadata as Record<string, unknown>).display_name;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
}

export function resolveAccountLabel(user: AccountIdentity | null | undefined): string {
  return readDisplayName(user) ?? user?.email?.split("@")[0]?.trim() ?? user?.id ?? "this account";
}
