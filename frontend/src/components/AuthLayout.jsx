import { Link } from "react-router-dom";

/**
 * Shared shell for login, signup, and password flows.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="app-shell app-shell-home auth-page-root">
      <div className="ig-shell auth-shell">
        <div className="ig-feed-main auth-screen">
          <header className="auth-brand-block">
            <Link to="/login" className="auth-brand-link" aria-label="Vista home">
              <span className="auth-logo" aria-hidden>
                <svg viewBox="0 0 32 32" width="40" height="40" fill="none">
                  <defs>
                    <linearGradient id="authLg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6d7dff" />
                      <stop offset="100%" stopColor="#7f56d9" />
                    </linearGradient>
                  </defs>
                  <rect width="32" height="32" rx="10" fill="url(#authLg)" />
                  <path
                    d="M10 22V10l6 8 6-8v12"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </span>
              <span className="auth-brand-name">Vista</span>
            </Link>
            <p className="auth-tagline">Share moments · translate · connect</p>
          </header>

          <div className="auth-card auth-card-premium">
            <h1 className="title">{title}</h1>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
            {children}
            {footer ? <div className="auth-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
