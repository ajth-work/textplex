"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "./auth-provider";

function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/auth");
}

export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading, user } = useAuth();

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const publicRoute = isPublicRoute(pathname);
  const protectedRoute = configured && !publicRoute;

  useEffect(() => {
    if (!protectedRoute || loading || user) {
      return;
    }

    router.replace(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
  }, [loading, protectedRoute, returnTo, router, user]);

  if (!protectedRoute || user) {
    return <>{children}</>;
  }

  return null;
}
