import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

/**
 * Central session handling for Supabase Auth:
 * - Persists per-browser (localStorage) so each device / browser profile = separate user session.
 * - Auto token refresh + pause when tab hidden (saves battery, avoids duplicate refresh across tabs).
 * - onAuthStateChange keeps React in sync when another tab signs in/out or token refreshes.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "INITIAL_SESSION") {
        setSession(newSession ?? null);
        setAuthReady(true);
        return;
      }
      // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED — keep all tabs / users in sync
      setSession(newSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Pause auto-refresh when tab is hidden; resume when visible (recommended for multi-tab + mobile)
  useEffect(() => {
    if (!supabase) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.startAutoRefresh();
        // Re-read session when coming back (e.g. signed out in another tab)
        supabase.auth.getSession().then(({ data }) => {
          setSession(data.session ?? null);
        });
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      authReady,
      signOut,
    }),
    [session, authReady, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
