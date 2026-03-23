import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import UserProfile from "./pages/UserProfile";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Multilingo from "./pages/Multilingo";

export default function App() {
  const { supabase, session, authReady } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const theme = localStorage.getItem("app_theme") || "aurora";
    const compact = localStorage.getItem("app_compact") === "1";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.toggle("compact-ui", compact);
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase || !userId) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,name")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("profiles select error:", error);
          setProfile(null);
          return;
        }

        setProfile(data);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const profileComplete = useMemo(() => {
    const name = profile?.name;
    return typeof name === "string" && name.trim().length > 0;
  }, [profile]);

  const LoadingGate = () => <div className="loading-center">Loading...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : profileComplete ? (
            <Navigate replace to="/home" />
          ) : (
            <Navigate replace to="/profile" />
          )
        }
      />

      <Route
        path="/login"
        element={
          !authReady ? (
            <LoadingGate />
          ) : session ? (
            profileLoading ? (
              <LoadingGate />
            ) : (
              <Navigate replace to={profileComplete ? "/home" : "/profile"} />
            )
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/signup"
        element={
          !authReady ? (
            <LoadingGate />
          ) : session ? (
            profileLoading ? (
              <LoadingGate />
            ) : (
              <Navigate replace to={profileComplete ? "/home" : "/profile"} />
            )
          ) : (
            <Signup />
          )
        }
      />

      <Route
        path="/profile"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : profileComplete ? (
            <Navigate replace to="/home" />
          ) : (
            <Profile />
          )
        }
      />

      <Route
        path="/home"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : profileComplete ? (
            <Home />
          ) : (
            <Navigate replace to="/profile" />
          )
        }
      />

      <Route
        path="/settings"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : (
            <Settings />
          )
        }
      />

      <Route
        path="/users"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : (
            <Users />
          )
        }
      />

      <Route
        path="/users/:userId"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : (
            <UserProfile />
          )
        }
      />

      <Route
        path="/messages"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : (
            <Messages />
          )
        }
      />

      <Route
        path="/messages/:conversationId"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : (
            <Chat />
          )
        }
      />

      <Route
        path="/translate"
        element={
          !authReady ? (
            <LoadingGate />
          ) : !session ? (
            <Navigate replace to="/login" />
          ) : profileLoading ? (
            <LoadingGate />
          ) : (
            <Multilingo />
          )
        }
      />

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}