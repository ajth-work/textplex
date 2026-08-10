"use client";

import { useAuth } from "./auth-provider";
import { LoadingSkeleton } from "./loading-skeleton";
import { RoutePage } from "./route-page";
import { isTextPlexAdmin } from "../lib/auth-roles";

export function AdminOnly({ children }: Readonly<{ children: React.ReactNode }>) {
  const { configured, loading, user } = useAuth();

  if (loading && configured) {
    return (
      <RoutePage eyebrow="Admin" title="Checking access" description="Loading your account permissions." badge="Loading">
        <LoadingSkeleton label="Checking admin access" />
      </RoutePage>
    );
  }

  if (!isTextPlexAdmin(user)) {
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
      </RoutePage>
    );
  }

  return children;
}
