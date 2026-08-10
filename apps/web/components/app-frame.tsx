"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "./auth-provider";
import { fetchJson, type SettingsSurfaceResponse } from "../lib/textplex";

function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/auth");
}

function isOnboardingComplete(settings: SettingsSurfaceResponse): boolean {
  return settings.entries.some((entry) => entry.key === "onboarding.completed" && entry.value === "true");
}

export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading, user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<"checking" | "complete" | "required" | "error">("checking");

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const publicRoute = isPublicRoute(pathname);
  const protectedRoute = configured && !publicRoute;
  const onboardingCheckRoute = configured && !pathname.startsWith("/auth") && pathname !== "/onboarding";

  useEffect(() => {
    if (!protectedRoute || loading || user) {
      return;
    }

    router.replace(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
  }, [loading, protectedRoute, returnTo, router, user]);

  useEffect(() => {
    if (!onboardingCheckRoute || loading || !user) {
      setOnboardingState("complete");
      return undefined;
    }

    let active = true;
    setOnboardingState("checking");
    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((settings) => {
        if (!active) return;
        if (isOnboardingComplete(settings)) {
          setOnboardingState("complete");
          return;
        }
        setOnboardingState("required");
        router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
      })
      .catch(() => {
        if (active) setOnboardingState("error");
      });

    return () => {
      active = false;
    };
  }, [loading, onboardingCheckRoute, pathname, returnTo, router, user]);

  if (!onboardingCheckRoute || loading || !user || pathname === "/onboarding") {
    return <>{children}</>;
  }

  if (onboardingState === "error") {
    return (
      <main className="onboarding-shell">
        <section className="onboarding-card card">
          <span className="eyebrow">TextPlex beta</span>
          <h1>We couldn&apos;t load your setup</h1>
          <p className="lede">Your account is safe. Try again so we can confirm the short beta introduction before opening the app.</p>
          <button className="button button-primary" type="button" onClick={() => window.location.reload()}>Try again</button>
        </section>
      </main>
    );
  }

  return onboardingState === "complete" ? <>{children}</> : null;
}
