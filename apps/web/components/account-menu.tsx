"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { resolveAccountLabel } from "../lib/auth-display";
import { useAuth } from "./auth-provider";

type AccountMenuProps = {
  className?: string;
  compact?: boolean;
  returnTo?: string;
};

export function AccountMenu({ className, compact = false, returnTo }: Readonly<AccountMenuProps>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const searchKey = searchParams.toString();
  const fallbackReturnTo = useMemo(
    () => `${pathname}${searchKey ? `?${searchKey}` : ""}`,
    [pathname, searchKey],
  );
  const effectiveReturnTo = returnTo ?? fallbackReturnTo;
  const signInHref = `/auth?returnTo=${encodeURIComponent(effectiveReturnTo)}`;
  const accountLabel = resolveAccountLabel(user);

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (loading && configured) {
    return <span className={`account-menu account-menu-loading${className ? ` ${className}` : ""}`.trim()}>Account</span>;
  }

  if (!user) {
    if (!configured) {
      return null;
    }

    return (
      <Link className={`button button-secondary account-menu account-menu-sign-in${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`.trim()} href={signInHref}>
        Sign in
      </Link>
    );
  }

  return (
    <div ref={menuRef} className={`account-menu account-menu-root${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`.trim()}>
      <button
        type="button"
        className="button button-secondary account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-menu-trigger-copy">
          <span className="account-menu-eyebrow">Account</span>
          <strong>{accountLabel}</strong>
        </span>
        <span className="account-menu-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="account-menu-panel card" role="menu" aria-label="Account actions">
          <Link className="account-menu-action" href="/profile" role="menuitem" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link className="account-menu-action" href="/settings" role="menuitem" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button
            className="account-menu-action account-menu-sign-out"
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.replace("/");
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
