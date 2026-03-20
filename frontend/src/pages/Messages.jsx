import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listMyConversations, subscribeToInboxChanges } from "../api/messageApi";
import AppBottomNav from "../components/AppBottomNav";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Messages() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const meId = session?.user?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!meId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listMyConversations(meId);
      setItems(list);
    } catch (e) {
      setError(e?.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [meId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!meId) return;

    let timer = null;
    const unsubscribe = subscribeToInboxChanges(meId, () => {
      // small debounce to collapse bursts of realtime events
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        load();
      }, 120);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe?.();
    };
  }, [meId, load]);

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <div className="ig-feed-main messaging-page screen-panel">
        <div className="feed-header screen-header">
          <div>
            <h2 className="title">Messages</h2>
            <p className="subtitle">Direct conversations with other users.</p>
          </div>
          <div className="feed-actions">
            <button className="btn btn-secondary" onClick={() => navigate("/users")}>
              New chat
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/home")}>
              Home
            </button>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {loading ? (
          <p className="subtitle">Loading…</p>
        ) : items.length === 0 ? (
          <p className="subtitle">
            No messages yet. Open <strong>Users</strong> and visit a profile to start a chat.
          </p>
        ) : (
          <ul className="conversation-list">
            {items.map(({ conversation: c, other }) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="conversation-row"
                  onClick={() => navigate(`/messages/${c.id}`)}
                >
                  <div className="conversation-row-main">
                    <strong>{other?.name || "User"}</strong>
                    {other?.username ? (
                      <span className="conversation-meta">@{other.username}</span>
                    ) : null}
                    {c.last_message_preview ? (
                      <p className="conversation-preview">{c.last_message_preview}</p>
                    ) : (
                      <p className="conversation-preview muted">No messages yet</p>
                    )}
                  </div>
                  <span className="conversation-time">{formatTime(c.last_message_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        </div>
        <AppBottomNav />
      </div>
    </div>
  );
}
