import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBottomNav from "../components/AppBottomNav";
import { useAuth } from "../contexts/AuthContext";
import {
  followUser,
  getConnectedUsers,
  getFollowingIds,
  searchUsersByUsername,
  unfollowUser,
} from "../api/followApi";

export default function Users() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const meId = session?.user?.id;
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [connected, following] = await Promise.all([
          getConnectedUsers(meId),
          getFollowingIds(meId),
        ]);
        setUsers(connected);
        setFollowingIds(following);
      } catch (e) {
        alert(e?.message || "Failed to load users");
      }
    };
    if (meId) load();
  }, [meId]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const found = await searchUsersByUsername(q, meId);
        if (!cancelled) setSearchResults(found);
      } catch (e) {
        if (!cancelled) alert(e?.message || "Search failed");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, meId]);

  const q = query.trim().toLowerCase();
  const list = query.trim() ? searchResults : users;
  const filtered = list.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q.replace(/^@/, ""))
  );
  const isSearchMode = query.trim().length > 0;

  const toggleFollow = async (targetId, targetUser) => {
    if (!meId || !targetId || targetId === meId) return;
    setBusyId(targetId);
    const currentlyFollowing = followingIds.has(targetId);
    try {
      if (currentlyFollowing) {
        await unfollowUser(meId, targetId);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        await followUser(meId, targetId);
        setFollowingIds((prev) => new Set(prev).add(targetId));
        setUsers((prev) => {
          if (prev.some((u) => u.id === targetId)) return prev;
          return [targetUser, ...prev];
        });
      }
    } catch (e) {
      alert(e?.message || "Follow action failed");
    } finally {
      setBusyId(null);
    }
  };

  const emptyText = useMemo(() => {
    if (isSearchMode) return "No user found for that username.";
    return "No connected users to show yet.";
  }, [isSearchMode]);

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <div className="ig-feed-main screen-panel">
        <div className="feed-header screen-header">
          <div>
            <h2 className="title">Users</h2>
            <p className="subtitle">
              Search by username and follow from results. Without search, you see connected users.
            </p>
          </div>
          <div className="feed-actions">
            <button className="btn btn-secondary" onClick={() => navigate("/home")}>
              Home
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/profile")}>
              My Profile
            </button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Search user</label>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type @username to find and follow..."
          />
        </div>

        <div className="user-grid">
          {filtered.length ? (
            filtered.map((u) => (
              <button key={u.id} className="user-card" onClick={() => navigate(`/users/${u.id}`)}>
                <div className="user-name">{u.name || "Unnamed"}</div>
                <div className="user-sub">@{u.username || "no_username"}</div>
                <div className="user-sub">{u.place || "No place"}</div>
                {meId && u.id !== meId ? (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      disabled={busyId === u.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow(u.id, u);
                      }}
                    >
                      {busyId === u.id
                        ? "..."
                        : followingIds.has(u.id)
                          ? "Following"
                          : "Follow"}
                    </button>
                  </div>
                ) : null}
              </button>
            ))
          ) : (
            <p className="subtitle">{emptyText}</p>
          )}
        </div>
        </div>
        <AppBottomNav />
      </div>
    </div>
  );
}

