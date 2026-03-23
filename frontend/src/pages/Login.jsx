import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AuthLayout from "../components/AuthLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env");
      return;
    }
    const em = email.trim();
    if (!em || !isValidEmail(em)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    try {
      setLoading(true);
      const { error: err } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <AuthLayout title="Log in" subtitle="Sign in to Vista">
        <p className="error-text">
          Supabase is not configured. Check <code>frontend/.env</code> for <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in with Google or your email to continue."
      footer={
        <p className="auth-footer-text">
          No account? <Link to="/signup">Create one</Link>
        </p>
      }
    >
      <GoogleSignInButton label="Continue with Google" />
      <div className="auth-divider" aria-hidden="true">
        <span>or email</span>
      </div>
      <form className="form-grid" onSubmit={login} noValidate>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <div className="auth-label-row">
            <label htmlFor="login-password">Password</label>
            <Link to="/forgot-password" className="auth-link-small">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
          <Link className="btn btn-secondary" to="/signup">
            Create account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
