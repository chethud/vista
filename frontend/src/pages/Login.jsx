import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!supabase) {
      alert("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
        return;
      }
      // App route guard will redirect to /profile or /home based on metadata.
      navigate("/");
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
          <h2 className="title">Login</h2>
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
        <h2 className="title">Welcome back</h2>
        <p className="subtitle">Login to continue to your feed.</p>
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
              placeholder="Enter your password"
            />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={login} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/signup")}>
            Create account
          </button>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}