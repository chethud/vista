import { useLocation, useNavigate } from "react-router-dom";

const ITEMS = [
  { to: "/home", label: "Home", icon: "home" },
  { to: "/users", label: "Explore", icon: "search" },
  { to: "/translate", label: "Translate", icon: "translate" },
  { to: "/messages", label: "Chat", icon: "chat" },
  { to: "/profile", label: "Profile", icon: "user" },
  { to: "/settings", label: "Settings", icon: "gear" },
];

function Icon({ kind }) {
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (kind === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    );
  }
  if (kind === "translate") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L1 17l5.5-5.5 1.5 1.5z" />
      </svg>
    );
  }
  if (kind === "chat") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-5.5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      </svg>
    );
  }
  if (kind === "user") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="2.25" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" />
    </svg>
  );
}

export default function AppBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <nav className="ig-bottom-nav" aria-label="Primary">
      {ITEMS.map((item) => (
        <button
          key={item.to}
          type="button"
          className={`nav-icon-btn ${isActive(item.to) ? "active" : ""}`}
          onClick={() => navigate(item.to)}
        >
          <Icon kind={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
