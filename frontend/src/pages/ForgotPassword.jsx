import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const send = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    try {
      setLoading(true);
      const redirectTo = `${window.location.origin}/update-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setMessage("Check your inbox for a password reset link.");
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <AuthLayout title="Forgot password" subtitle="Reset via email">
        <p className="error-text">Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We’ll email you a link to choose a new password."
      footer={
        <p className="auth-footer-text">
          <Link to="/login">Back to login</Link>
        </p>
      }
    >
      <form className="form-grid" onSubmit={send}>
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="auth-success">{message}</p> : null}
        <div className="field">
          <label htmlFor="fp-email">Email</label>
          <input
            id="fp-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
