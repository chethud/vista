import { supabase } from "../supabaseClient";

const backendBase = () =>
  (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

/**
 * Call the FastAPI backend with the current Supabase session JWT.
 * @param {string} path - e.g. "/auth/me" or "/posts/"
 * @param {RequestInit} [options]
 */
export async function fetchWithJwt(path, options = {}) {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  const base = backendBase();
  if (!base) {
    throw new Error("VITE_BACKEND_URL is not set in frontend/.env");
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Not logged in");
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data?.detail != null ? JSON.stringify(data.detail) : text;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data;
}
