"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "./auth-provider";
import { fetchJson, type SettingsSurfaceResponse } from "../lib/textplex";
import { cacheOnboardingCompletion, clearCachedOnboardingCompletion, hasCachedOnboardingCompletion } from "../lib/onboarding-state";
import { isTextPlexTester } from "../lib/auth-roles";
import { appVersion } from "../lib/build-info";
import { acknowledgeTesterBuild, getTesterChangelogSince, readTesterLastBuild } from "../lib/tester-build-updates";
import { TesterBuildUpdateGate } from "./tester-build-update-gate";

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
  const [onboardingState, setOnboardingState] = useState<"checking" | "complete" | "required">("checking");
  const [testerBuildState, setTesterBuildState] = useState<"checking" | "required" | "complete">("checking");
  const [testerLastBuild, setTesterLastBuild] = useState<string | null>(null);

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const publicRoute = isPublicRoute(pathname);
  const protectedRoute = configured && !publicRoute;
  const onboardingCheckRoute = configured && !pathname.startsWith("/auth") && pathname !== "/onboarding";
  const testerBuildCheckRoute = configured && !publicRoute && pathname !== "/onboarding";
  const isTester = isTextPlexTester(user);

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
    const cachedCompletion = hasCachedOnboardingCompletion(user.id);
    if (!cachedCompletion) {
      setOnboardingState("checking");
    } else {
      setOnboardingState("complete");
    }

    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((settings) => {
        if (!active) return;
        if (isOnboardingComplete(settings)) {
          cacheOnboardingCompletion(user.id);
          setOnboardingState("complete");
          return;
        }
        clearCachedOnboardingCompletion(user.id);
        setOnboardingState("required");
        router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
      })
      .catch(() => {
        if (!active || cachedCompletion) return;
        setOnboardingState("required");
        router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
      });

    return () => {
      active = false;
    };
  }, [loading, onboardingCheckRoute, pathname, returnTo, router, user]);

  useEffect(() => {
    if (!testerBuildCheckRoute || loading || !user || !isTester) {
      setTesterBuildState("complete");
      setTesterLastBuild(null);
      return;
    }

    const lastBuild = readTesterLastBuild(user.id);
    setTesterLastBuild(lastBuild);
    setTesterBuildState(lastBuild === appVersion ? "complete" : "required");
  }, [isTester, loading, pathname, testerBuildCheckRoute, user]);

  if (testerBuildState === "required" && user && isTester) {
    return (
      <TesterBuildUpdateGate
        currentBuild={appVersion}
        lastBuild={testerLastBuild}
        entries={getTesterChangelogSince(testerLastBuild, appVersion)}
        onAcknowledge={() => {
          acknowledgeTesterBuild(user.id, appVersion);
          setTesterBuildState("complete");
        }}
      />
    );
  }

  if (!onboardingCheckRoute || loading || !user || pathname === "/onboarding") {
    return <>{children}</>;
  }

  return onboardingState === "complete" && testerBuildState !== "checking" ? <>{children}</> : null;
}
