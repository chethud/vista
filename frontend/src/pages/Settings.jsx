import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBottomNav from "../components/AppBottomNav";

const THEMES = [
  { id: "aurora", label: "Aurora (default)" },
  { id: "light", label: "Light" },
  { id: "sunset", label: "Sunset" },
];

export default function Settings() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem("app_theme") || "aurora");
  const [compact, setCompact] = useState(localStorage.getItem("app_compact") === "1");

  const activeThemeLabel = useMemo(
    () => THEMES.find((x) => x.id === theme)?.label || "Aurora",
    [theme]
  );

  const saveSettings = () => {
    localStorage.setItem("app_theme", theme);
    localStorage.setItem("app_compact", compact ? "1" : "0");
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.toggle("compact-ui", compact);
    alert("Settings saved");
    navigate("/home");
  };

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <div className="ig-feed-main screen-panel settings-card">
        <h2 className="title">Settings</h2>
        <p className="subtitle">Customize your app theme and layout style.</p>

        <div className="field">
          <label>Theme</label>
          <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="subtitle" style={{ marginTop: 8 }}>Current: {activeThemeLabel}</p>
        </div>

        <div className="field">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            <span>Compact layout (smaller cards and spacing)</span>
          </label>
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={saveSettings}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/home")}>
            Back to Home
          </button>
          <button className="btn btn-ghost" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>
        </div>
        <AppBottomNav />
      </div>
    </div>
  );
}

