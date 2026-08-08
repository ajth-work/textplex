"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "./auth-provider";

type SignOutButtonProps = {
  className?: string;
  redirectTo?: string;
  children?: string;
};

export function SignOutButton({ className, redirectTo = "/", children = "Sign out" }: Readonly<SignOutButtonProps>) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={signingOut}
      onClick={async () => {
        setSigningOut(true);
        try {
          await signOut();
          router.replace(redirectTo);
          router.refresh();
        } finally {
          setSigningOut(false);
        }
      }}
    >
      {signingOut ? "Signing out..." : children}
    </button>
  );
}
