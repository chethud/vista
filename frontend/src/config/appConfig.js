/**
 * Central configuration for the Vite app (local + Vercel).
 * Mirrors README / frontend/.env.example — all API calls use VITE_BACKEND_URL here.
 */

/**
 * FastAPI origin, no trailing slash (e.g. http://127.0.0.1:8000 or https://api.onrender.com).
 */
export function getBackendBaseUrl() {
  return (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/$/, "");
}

/**
 * @throws {Error} when backend URL is required but missing
 */
export function requireBackendBaseUrl() {
  const base = getBackendBaseUrl();
  if (!base) {
    throw new Error(
      "VITE_BACKEND_URL is not set. Copy frontend/.env.example to frontend/.env locally, or set it in Vercel Environment Variables (your Render / FastAPI URL, no trailing slash)."
    );
  }
  return base;
}

export const UI_MESSAGES = {
  backendNotConfigured:
    "Set VITE_BACKEND_URL in frontend/.env (or Vercel env) to your FastAPI URL — e.g. http://127.0.0.1:8000 locally or your Render HTTPS URL.",
};

export const APP = {
  name: "MultiLingo",
  /** Vite mode: development | production */
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
