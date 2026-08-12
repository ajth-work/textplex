"use client";

import { useAuth } from "./auth-provider";
import { AccountMenu } from "./account-menu";

export function AccountFooter() {
  const { configured, loading, user } = useAuth();
  const showAccount = configured && (loading || Boolean(user));

  return (
    <footer className="app-account-footer" aria-label="TextPlex account and copyright" data-inventory-id="shell.footer">
      {showAccount ? (
        <div className="app-account-footer-account" data-inventory-id="shell.account-menu">
          <span className="app-account-footer-label">Account</span>
          <AccountMenu compact />
        </div>
      ) : null}
      <span className="app-account-footer-copy">
        Use only books and materials you own, license, or are otherwise authorized to use.
      </span>
      <span className="app-account-footer-mark">© 2026 TextPlex</span>
    </footer>
  );
}
