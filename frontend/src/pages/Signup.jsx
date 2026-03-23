import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AuthLayout from "../components/AuthLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const signup = async (e) => {
    e?.preventDefault();
    setError(null);
    setInfo(null);
    if (!supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env");
      return;
    }
    const em = email.trim();
    if (!em || !isValidEmail(em)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      const { error: err } = await supabase.auth.signUp({ email: em, password });
      if (err) {
        const msg = [
          err.message || "Signup failed",
          err.hint ? `Hint: ${err.hint}` : null,
        ]
          .filter(Boolean)
          .join(" ");
        setError(msg);
        console.error("Signup error:", err);
        return;
      }
      setInfo("Check your email to confirm your account, then you can log in.");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <AuthLayout title="Create account" subtitle="Join Vista">
        <p className="error-text">
          Supabase is not configured. Check <code>frontend/.env</code> for <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Use Google or sign up with email. You’ll complete your profile next."
      footer={
        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <GoogleSignInButton label="Continue with Google" />
      <div className="auth-divider" aria-hidden="true">
        <span>or email</span>
      </div>
      <form className="form-grid" onSubmit={signup} noValidate>
        {error ? <p className="error-text">{error}</p> : null}
        {info ? <p className="auth-success">{info}</p> : null}
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input
            id="su-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label htmlFor="su-password">Password</label>
          <input
            id="su-password"
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div className="field">
          <label htmlFor="su-confirm">Confirm password</label>
          <input
            id="su-confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
          />
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={loading || !!info}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
          <Link className="btn btn-secondary" to="/login">
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
