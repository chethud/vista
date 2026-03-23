import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBottomNav from "../components/AppBottomNav";
import {
  fetchMultilingoStatus,
  getMultilingoBase,
  multilingoDownloadUrl,
  startMultilingoJob,
} from "../api/multilingoApi";
import "./Multilingo.css";

const LANGUAGES = [
  { code: "hi", label: "🇮🇳 हिंदी (Hindi)" },
  { code: "kn", label: "🇮🇳 ಕನ್ನಡ (Kannada)" },
  { code: "ta", label: "🇮🇳 தமிழ் (Tamil)" },
  { code: "te", label: "🇮🇳 తెలుగు (Telugu)" },
];

const LANG_NAMES = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.label]));

const TILES = [
  { script: "हिंदी", en: "Hindi" },
  { script: "ಕನ್ನಡ", en: "Kannada" },
  { script: "தமிழ்", en: "Tamil" },
  { script: "తెలుగు", en: "Telugu" },
];

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${["B", "KB", "MB", "GB"][i]}`;
}

/** Map 0–100 progress to step index 0–4 for UI */
function stepStates(progress) {
  return [0, 1, 2, 3, 4].map((i) => {
    const thr = (i + 1) * 20;
    if (progress >= thr) return "done";
    if (progress >= thr - 20) return "on";
    return "";
  });
}

export default function Multilingo() {
  const navigate = useNavigate();
  const [view, setView] = useState("hero"); // hero | upload | processing | result
  const [file, setFile] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState("hi");
  const [submitting, setSubmitting] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const apiConfigured = (() => {
    try {
      getMultilingoBase();
      return true;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const startElapsed = useCallback(() => {
    const t0 = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
  }, []);

  const stopElapsed = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(
    (id) => {
      fetchMultilingoStatus(id)
        .then((data) => {
          setStatus(data);
          if (data.status === "completed") {
            stopElapsed();
            setSubmitting(false);
            setView("result");
            return;
          }
          if (data.status === "error") {
            stopElapsed();
            setError(data.message || "Processing failed");
            setView("upload");
            setSubmitting(false);
            return;
          }
          if (data.status === "not_found") {
            pollRef.current = setTimeout(() => poll(id), 2000);
            return;
          }
          pollRef.current = setTimeout(() => poll(id), 2000);
        })
        .catch(() => {
          pollRef.current = setTimeout(() => poll(id), 4000);
        });
    },
    [stopElapsed]
  );

  const onPickFile = (f) => {
    if (!f) return;
    const max = 500 * 1024 * 1024;
    if (!f.type.startsWith("audio/") && !f.type.startsWith("video/")) {
      setError("Choose an audio or video file.");
      return;
    }
    if (f.size > max) {
      setError("Max file size is 500MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file || !apiConfigured) return;
    setError(null);
    setSubmitting(true);
    setView("processing");
    setStatus({ status: "processing", progress: 0, message: "Starting…" });
    startElapsed();

    const fd = new FormData();
    fd.append("file", file);
    fd.append("target_language", targetLanguage);

    try {
      const data = await startMultilingoJob(fd);
      if (!data.task_id) throw new Error("No task_id from server");
      setTaskId(data.task_id);
      poll(data.task_id);
    } catch (err) {
      stopElapsed();
      setError(err?.message || "Upload failed");
      setSubmitting(false);
      setView("upload");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove("ml-drag");
    if (e.dataTransfer.files?.[0]) onPickFile(e.dataTransfer.files[0]);
  };

  const progress = status?.progress ?? 0;
  const message = status?.message ?? "…";
  const steps = stepStates(progress);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <div className="page-card ml-page">
          <div className="ml-topbar">
            <div>
              <h2 className="title">MultiLingo</h2>
              <p className="subtitle">English audio/video → Hindi, Kannada, Tamil, Telugu</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate("/home")}>
                Home
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => {
                  setView("upload");
                  setError(null);
                }}
              >
                Upload
              </button>
            </div>
          </div>

          {!apiConfigured ? (
            <p className="error-text" style={{ marginTop: 12 }}>
              Add <code>VITE_BACKEND_URL</code> to <code>frontend/.env</code> (e.g. http://127.0.0.1:8000) and restart Vite.
            </p>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}

          {view === "hero" ? (
            <div className="ml-hero">
              <h1>Translate to Indian languages</h1>
              <p>
                Whisper listens in English, text is translated, then gTTS speaks the result. Videos get new audio
                muxed to match length.
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => setView("upload")}>
                Start translation
              </button>
              <div className="ml-lang-grid">
                {TILES.map((t) => (
                  <div key={t.en} className="ml-lang-tile">
                    <span>🇮🇳</span>
                    <div className="script">{t.script}</div>
                    <small>{t.en}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {view === "upload" ? (
            <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.flac,.m4a,.ogg,.aac,.mp4,.avi,.mov,.mkv,.webm,.wmv,.flv"
                hidden
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              {!file ? (
                <div
                  ref={dropRef}
                  className="ml-dropzone"
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    dropRef.current?.classList.add("ml-drag");
                  }}
                  onDragLeave={() => dropRef.current?.classList.remove("ml-drag")}
                  onDrop={onDrop}
                >
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>☁️</div>
                  <strong>Drop a file here or click to choose</strong>
                  <p className="subtitle" style={{ marginTop: 8 }}>
                    MP3, WAV, M4A, MP4, MOV, MKV… · max 500MB
                  </p>
                </div>
              ) : (
                <div className="ml-file-preview">
                  <div className="ml-file-icon">{file.type.startsWith("video") ? "🎬" : "🎵"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, wordBreak: "break-all" }}>{file.name}</div>
                    <div className="subtitle">{formatFileSize(file.size)}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="field" style={{ marginTop: 18 }}>
                <label>Target language</label>
                <select
                  className="select"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="btn-row" style={{ marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={!file || submitting || !apiConfigured}>
                  {submitting ? "Starting…" : "Start translation"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setView("hero")}>
                  Back
                </button>
              </div>
            </form>
          ) : null}

          {view === "processing" ? (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>Processing</strong>
                <span className="subtitle">Elapsed {fmtTime(elapsed)}</span>
              </div>
              <div className="ml-progress-track">
                <div className="ml-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>{progress}%</span>
                <span className="subtitle">{message}</span>
              </div>
              <div className="ml-steps">
                {["ASR", "Translate", "TTS", "Video", "Reports"].map((label, i) => (
                  <div
                    key={label}
                    className={`ml-step ${steps[i] === "done" ? "ml-done" : ""} ${steps[i] === "on" ? "ml-on" : ""}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {view === "result" && status?.status === "completed" ? (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Done</p>
              <p className="subtitle">
                {LANG_NAMES[status.target_language] || status.target_language} ·{" "}
                {status.processing_time != null ? `${status.processing_time.toFixed(1)}s` : "—"}
              </p>

              {status.original_text && status.translated_text ? (
                <div className="ml-text-grid" style={{ marginTop: 16 }}>
                  <div>
                    <div className="subtitle" style={{ marginBottom: 6 }}>
                      English
                    </div>
                    <div className="ml-text-preview screen-panel">{status.original_text}</div>
                  </div>
                  <div>
                    <div className="subtitle" style={{ marginBottom: 6 }}>
                      Translation
                    </div>
                    <div className="ml-text-preview screen-panel">{status.translated_text}</div>
                  </div>
                </div>
              ) : null}

              {status.outputs?.length ? (
                <div style={{ marginTop: 20 }}>
                  <div className="subtitle" style={{ marginBottom: 8 }}>
                    Downloads
                  </div>
                  <div className="ml-download-grid">
                    {status.outputs.map((o) => (
                      <div key={o.filename} className="ml-download-card">
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{o.description || o.type}</div>
                        <div className="subtitle" style={{ wordBreak: "break-all" }}>
                          {o.filename}
                        </div>
                        <a
                          className="btn btn-secondary btn-xs"
                          href={multilingoDownloadUrl(taskId, o.filename)}
                          download={o.filename}
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="btn-row" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setView("upload");
                    setFile(null);
                    setTaskId(null);
                    setStatus(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Translate another file
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigate("/home")}>
                  Back to feed
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <AppBottomNav />
      </div>
    </div>
  );
}
