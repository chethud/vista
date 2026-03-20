import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Stable key per project so different Supabase projects on same host don’t clobber sessions */
function authStorageKey(url) {
  try {
    const host = new URL(url).hostname.split(".")[0] || "local";
    return `vista-auth-${host}`;
  } catch {
    return "vista-auth";
  }
}

let supabase = null;
try {
  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }
  if (!supabaseKey) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY");
  }
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: authStorageKey(supabaseUrl),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
} catch (e) {
  console.error("Supabase client init failed:", e);
}

export { supabase };