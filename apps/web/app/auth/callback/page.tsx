"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      router.replace("/auth");
      return;
    }
    void client.auth.getSession().finally(() => router.replace("/profile"));
  }, [router]);

  return (
    <main className="auth-shell">
      <section className="auth-card card">
        <span className="eyebrow">Account</span>
        <h1>Finishing sign-in…</h1>
        <p className="lede">Your secure session is being restored.</p>
      </section>
    </main>
  );
}
