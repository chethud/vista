/**
 * MultiLingo backend (FastAPI) — same server as VITE_BACKEND_URL.
 * Endpoints: POST /process, GET /status/:id, GET /download/:id/:filename
 */

import { getBackendBaseUrl, requireBackendBaseUrl } from "../config/appConfig";

function baseUrl() {
  return requireBackendBaseUrl();
}

export function getMultilingoBase() {
  return getBackendBaseUrl();
}

/**
 * @param {FormData} formData — must include `file` and `target_language`
 */
export async function startMultilingoJob(formData) {
  const res = await fetch(`${baseUrl()}/process`, {
    method: "POST",
    body: formData,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
          : text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function fetchMultilingoStatus(taskId) {
  const res = await fetch(`${baseUrl()}/status/${encodeURIComponent(taskId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || `HTTP ${res.status}`);
  }
  return data;
}

export function multilingoDownloadUrl(taskId, filename) {
  return `${baseUrl()}/download/${encodeURIComponent(taskId)}/${encodeURIComponent(filename)}`;
}
