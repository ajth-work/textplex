"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { syncAuthSessionCookie } from "../lib/auth-session";
import { readSavedAuthSessions, removeSavedAuthSession, saveAuthSession } from "../lib/saved-auth-sessions";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  savedSessions: Session[];
  removeSavedAccount: (userId: string) => void;
  switchAccount: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser = null }: Readonly<{ children: React.ReactNode; initialUser?: User | null }>) {
  const configured = isSupabaseConfigured();
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(configured);
  const [savedSessions, setSavedSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return undefined;
    }

    const authClient = client;

    let mounted = true;

    async function hydrateSession(nextSession: Session | null): Promise<void> {
      let hydratedSession = nextSession;
      if (nextSession) {
        try {
          const { data: userData } = await authClient.auth.getUser();
          if (userData.user) {
            hydratedSession = { ...nextSession, user: userData.user };
          }
        } catch {
          // Keep the cached session if the verification request is temporarily unavailable.
        }
      }

      if (!mounted) {
        return;
      }

      setSession(hydratedSession);
      setUser(hydratedSession?.user ?? null);
      setSavedSessions(hydratedSession ? saveAuthSession(hydratedSession) : readSavedAuthSessions());
      syncAuthSessionCookie(hydratedSession);
      setLoading(false);
    }

    void authClient.auth.getSession().then(({ data }) => hydrateSession(data.session));

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setSavedSessions(nextSession ? saveAuthSession(nextSession) : readSavedAuthSessions());
      syncAuthSessionCookie(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user,
      savedSessions,
      removeSavedAccount: (userId: string) => {
        setSavedSessions(removeSavedAuthSession(userId));
      },
      switchAccount: async (userId: string) => {
        if (!client || userId === user?.id) {
          return;
        }

        const savedSession = savedSessions.find((candidate) => candidate.user.id === userId);
        if (!savedSession) {
          throw new Error("That saved account is no longer available on this device.");
        }

        setLoading(true);
        const result = await client.auth.setSession({
          access_token: savedSession.access_token,
          refresh_token: savedSession.refresh_token,
        });
        if (result.error) {
          setLoading(false);
          throw result.error;
        }
        if (result.data.session) {
          let hydratedSession = result.data.session;
          try {
            const { data: userData } = await client.auth.getUser();
            if (userData.user) {
              hydratedSession = { ...result.data.session, user: userData.user };
            }
          } catch {
            // Keep the session returned by setSession if verification is temporarily unavailable.
          }
          setSession(hydratedSession);
          setUser(hydratedSession.user);
          setSavedSessions(saveAuthSession(hydratedSession));
          syncAuthSessionCookie(hydratedSession);
          setLoading(false);
        }
      },
      signOut: async () => {
        const currentUserId = user?.id;
        if (client) {
          await client.auth.signOut();
        }
        if (currentUserId) {
          setSavedSessions(removeSavedAuthSession(currentUserId));
        }
        syncAuthSessionCookie(null);
      },
    }),
    [client, configured, loading, savedSessions, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
