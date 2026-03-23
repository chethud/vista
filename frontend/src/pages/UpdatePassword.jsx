import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../components/AuthLayout";

function hashLooksLikeAuth() {
  if (typeof window === "undefined") return false;
  const h = window.location.hash || "";
  return /access_token|refresh_token|type=recovery/i.test(h);
}

export default function UpdatePassword() {
  const navigate = useNavigate();
  const { session, authReady } = useAuth();
  const [hashWait, setHashWait] = useState(hashLooksLikeAuth);

  useEffect(() => {
    if (session) {
      setHashWait(false);
      return;
    }
    if (!hashWait) return;
    const id = window.setTimeout(() => setHashWait(false), 3000);
    return () => window.clearTimeout(id);
  }, [session, hashWait]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured.");
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
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/home", { replace: true }), 1200);
    } catch (err) {
      setError(err?.message || "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <AuthLayout title="Set new password">
        <p className="error-text">Configure Supabase in frontend/.env</p>
      </AuthLayout>
    );
  }

  if (!authReady) {
    return (
      <div className="app-shell app-shell-home">
        <div className="loading-center">Loading…</div>
      </div>
    );
  }

  if (!session && hashWait) {
    return (
      <div className="app-shell app-shell-home">
        <div className="loading-center">Completing sign-in from your link…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthLayout
        title="Link invalid or expired"
        subtitle="Open the reset link from your email on this device, or request a new one."
        footer={
          <p className="auth-footer-text">
            <Link to="/forgot-password">Forgot password</Link> · <Link to="/login">Log in</Link>
          </p>
        }
      />
    );
  }

  return (
    <AuthLayout
      title={done ? "Password updated" : "Set new password"}
      subtitle={
        done
          ? "Redirecting you to the app…"
          : "Choose a strong password you haven’t used elsewhere."
      }
      footer={
        <p className="auth-footer-text">
          <Link to="/login">Back to login</Link>
        </p>
      }
    >
      {done ? (
        <p className="auth-success">You’re all set.</p>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="field">
            <label htmlFor="np-pass">New password</label>
            <input
              id="np-pass"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="field">
            <label htmlFor="np-confirm">Confirm password</label>
            <input
              id="np-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Saving…" : "Update password"}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
