"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { resolveAccountLabel } from "../lib/auth-display";
import { isTextPlexAdmin } from "../lib/auth-roles";
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
  const { configured, loading, removeSavedAccount, savedSessions, switchAccount, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const searchKey = searchParams.toString();
  const fallbackReturnTo = useMemo(
    () => `${pathname}${searchKey ? `?${searchKey}` : ""}`,
    [pathname, searchKey],
  );
  const effectiveReturnTo = returnTo ?? fallbackReturnTo;
  const signInHref = `/auth?returnTo=${encodeURIComponent(effectiveReturnTo)}`;
  const addAccountHref = `/auth?mode=add-account&returnTo=${encodeURIComponent(effectiveReturnTo)}`;
  const accountLabel = resolveAccountLabel(user);
  const isAdmin = isTextPlexAdmin(user);

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
          <strong>{accountLabel}</strong>
        </span>
        <span className="account-menu-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="account-menu-panel card" role="menu" aria-label="Account actions">
          <section className="account-menu-switcher" data-inventory-id="shell.account-switcher" aria-label="Saved accounts">
            <span className="account-menu-section-label">Switch account</span>
            <div className="account-menu-account-list">
              {savedSessions.map((savedSession) => {
                const savedAccountLabel = resolveAccountLabel(savedSession.user);
                const isCurrent = savedSession.user.id === user.id;
                const role = savedSession.user.app_metadata?.textplex_role;
                const roleLabel = role === "admin" ? "Admin" : role === "tester" ? "Tester" : null;
                return (
                  <div className={`account-menu-account${isCurrent ? " is-current" : ""}`} key={savedSession.user.id}>
                    <button
                      className="account-menu-account-button"
                      type="button"
                      role="menuitem"
                      disabled={isCurrent || Boolean(switchingAccountId)}
                      onClick={async () => {
                        setSwitchError(null);
                        setSwitchingAccountId(savedSession.user.id);
                        try {
                          await switchAccount(savedSession.user.id);
                          setOpen(false);
                          router.refresh();
                        } catch (error) {
                          setSwitchError(error instanceof Error ? error.message : "Unable to switch accounts.");
                        } finally {
                          setSwitchingAccountId(null);
                        }
                      }}
                    >
                      <span className="account-menu-account-copy">
                        <strong>{savedAccountLabel}</strong>
                        <small>{savedSession.user.email ?? savedSession.user.id}</small>
                      </span>
                      <span className="account-menu-account-meta">{isCurrent ? "Active" : roleLabel ?? "Switch"}</span>
                    </button>
                    {!isCurrent ? (
                      <button
                        className="account-menu-account-remove"
                        type="button"
                        aria-label={`Remove ${savedAccountLabel} from this device`}
                        disabled={Boolean(switchingAccountId)}
                        onClick={() => removeSavedAccount(savedSession.user.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {switchError ? <p className="account-menu-error">{switchError}</p> : null}
            <Link className="account-menu-action account-menu-add-account" href={addAccountHref} role="menuitem" onClick={() => setOpen(false)}>
              Add another account
            </Link>
          </section>
          <Link className="account-menu-action" href="/profile" role="menuitem" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link className="account-menu-action" href="/settings" role="menuitem" onClick={() => setOpen(false)}>
            Settings
          </Link>
          {isAdmin ? (
            <>
              <Link className="account-menu-action" href="/admin/themes" role="menuitem" onClick={() => setOpen(false)}>
                Theme console
              </Link>
              <Link className="account-menu-action" href="/admin/feedback" role="menuitem" onClick={() => setOpen(false)}>
                Feedback admin
              </Link>
            </>
          ) : null}
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
