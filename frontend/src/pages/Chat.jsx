import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import AppBottomNav from "../components/AppBottomNav";
import {
  fetchMessages,
  sendMessage,
  subscribeToNewMessages,
} from "../api/messageApi";
import { getUserProfileById } from "../api/followApi";

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const meId = session?.user?.id;
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (!conversationId || !meId || !supabase) return;

    let unsub = () => {};

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: conv, error: cErr } = await supabase
          .from("conversations")
          .select("id,participant_1,participant_2")
          .eq("id", conversationId)
          .maybeSingle();

        if (cErr) throw cErr;
        if (!conv) {
          setError("Conversation not found or you don’t have access.");
          setLoading(false);
          return;
        }
        const otherId =
          conv.participant_1 === meId ? conv.participant_2 : conv.participant_1;
        const profile = await getUserProfileById(otherId);
        setOther(profile || { id: otherId, name: "User", username: null });

        const msgs = await fetchMessages(conversationId);
        setMessages(msgs);

        unsub = subscribeToNewMessages(conversationId, (row) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        });
      } catch (e) {
        setError(e?.message || "Failed to load chat");
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => unsub();
  }, [conversationId, meId]);

  const onSend = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !conversationId || sending) return;
    setSending(true);
    setError(null);
    try {
      const row = await sendMessage(conversationId, t);
      setText("");
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    } catch (err) {
      setError(err?.message || "Could not send");
    } finally {
      setSending(false);
    }
  };

  const title = useMemo(() => {
    if (!other) return "Chat";
    const u = other.username ? ` @${other.username}` : "";
    return `${other.name || "User"}${u}`;
  }, [other]);

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <div className="ig-feed-main chat-page screen-panel">
        <div className="feed-header chat-header screen-header">
          <div>
            <h2 className="title">{title}</h2>
            <p className="subtitle">Direct message</p>
          </div>
          <div className="feed-actions">
            <button className="btn btn-secondary" onClick={() => navigate("/messages")}>
              All chats
            </button>
            {other?.id ? (
              <button className="btn btn-ghost" onClick={() => navigate(`/users/${other.id}`)}>
                Profile
              </button>
            ) : null}
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="chat-thread">
          {loading ? (
            <p className="subtitle">Loading…</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === meId;
              return (
                <div key={m.id} className={`chat-bubble-wrap ${mine ? "mine" : "theirs"}`}>
                  <div className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
                    <p>{m.body}</p>
                    <time className="chat-time">
                      {new Date(m.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form className="chat-composer" onSubmit={onSend}>
          <input
            className="input chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={4000}
            disabled={sending || loading}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
            {sending ? "…" : "Send"}
          </button>
        </form>
        </div>
        <AppBottomNav />
      </div>
    </div>
  );
}
