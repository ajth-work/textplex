"use client";

import { useAuth } from "./auth-provider";
import { LoadingSkeleton } from "./loading-skeleton";
import { RoutePage } from "./route-page";
import { isTextPlexAdmin } from "../lib/auth-roles";
import { fetchJson, type AuthMeResponse } from "../lib/textplex";
import { useEffect, useState } from "react";

export function AdminOnly({ children }: Readonly<{ children: React.ReactNode }>) {
  const { configured, loading, user } = useAuth();
  const [serverAuth, setServerAuth] = useState<AuthMeResponse | null>(null);
  const [serverAuthError, setServerAuthError] = useState<string | null>(null);
  const [checkingServerAuth, setCheckingServerAuth] = useState(configured && Boolean(user));

  useEffect(() => {
    if (!configured || !user) {
      setServerAuth(null);
      setServerAuthError(null);
      setCheckingServerAuth(false);
      return undefined;
    }

    let active = true;
    setCheckingServerAuth(true);
    void fetchJson<AuthMeResponse>("/auth/me")
      .then((response) => {
        if (active) {
          setServerAuth(response);
          setServerAuthError(null);
        }
      })
      .catch(() => active && setServerAuthError("The API could not verify this account."))
      .finally(() => active && setCheckingServerAuth(false));

    return () => {
      active = false;
    };
  }, [configured, user]);

  if ((loading || checkingServerAuth) && configured) {
    return (
      <RoutePage eyebrow="Admin" title="Checking access" description="Loading your account permissions." badge="Loading">
        <LoadingSkeleton label="Checking admin access" />
      </RoutePage>
    );
  }

  const isAdmin = serverAuth ? serverAuth.account_role === "admin" : serverAuthError ? isTextPlexAdmin(user) : false;

  if (!isAdmin) {
    const accountRole = serverAuth?.account_role ?? (serverAuthError ? "Unable to verify" : "Checking");
    const usagePermission = serverAuth?.permissions.includes("usage.global.read") ? "Granted" : serverAuthError ? "Unable to verify" : "Not granted";
    return (
      <RoutePage
        eyebrow="Admin"
        title="Admin access required"
        description="This workspace is reserved for TextPlex administration and development planning."
        badge="Restricted"
        links={[{ href: "/home", label: "Home" }, { href: "/profile", label: "Profile" }]}
      >
        <section className="card feature-card">
          <h2>Nothing to change here</h2>
          <p className="small-copy">Your learner profile and reading settings are still available from the account menu.</p>
        </section>
        <section className="card feature-card" data-inventory-id="admin.auth-status-card">
          <h2>Permission check</h2>
          <dl className="admin-auth-status">
            <div><dt>Signed in as</dt><dd>{user?.email ?? "No authenticated account"}</dd></div>
            <div><dt>TextPlex role</dt><dd>{accountRole}</dd></div>
            <div><dt>Global usage permission</dt><dd>{usagePermission}</dd></div>
          </dl>
          {serverAuthError ? <p className="small-copy">{serverAuthError} Check that the API is running, then reload.</p> : null}
          {!serverAuthError && serverAuth && serverAuth.account_role !== "admin" ? <p className="small-copy">This account is authenticated, but its trusted Supabase app metadata is not set to <code>admin</code>.</p> : null}
        </section>
      </RoutePage>
    );
  }

  return children;
}
