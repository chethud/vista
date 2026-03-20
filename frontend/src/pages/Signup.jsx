import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        alert(
          "Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env"
        );
        return;
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        // Show more details so we can debug DB trigger/RLS issues.
        const msg = [
          error.message || "Signup failed",
          error.code ? `code: ${error.code}` : null,
          error.status ? `status: ${error.status}` : null,
          error.details ? `details: ${error.details}` : null,
          error.hint ? `hint: ${error.hint}` : null,
          error
            ? `raw: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");
        console.error("Signup error:", error);
        alert(msg);
        return;
      }
      alert("Check your email");
      navigate("/login");
    } catch (e) {
      alert(e?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <div className="app-shell app-shell-home">
        <div className="ig-shell auth-shell">
          <div className="ig-feed-main auth-screen">
        <div className="auth-card auth-card-premium">
          <h2 className="title">Signup</h2>
          <p className="error-text">
          Supabase is not configured. Check `frontend/.env` for `VITE_SUPABASE_URL` and
          `VITE_SUPABASE_ANON_KEY`.
          </p>
        </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell auth-shell">
        <div className="ig-feed-main auth-screen">
      <div className="auth-card auth-card-premium">
        <h2 className="title">Create account</h2>
        <p className="subtitle">Join and start posting with your profile.</p>
        <GoogleSignInButton label="Continue with Google" />
        <div className="auth-divider" aria-hidden="true">
          <span>or email</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={signup} disabled={loading}>
            {loading ? "Signing up..." : "Signup"}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/login")}>
            Back to login
          </button>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}