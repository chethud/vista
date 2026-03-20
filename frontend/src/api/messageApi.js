import { supabase } from "../supabaseClient";

/** @returns {Promise<string>} conversation id */
export async function getOrCreateConversation(otherUserId) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_id: otherUserId,
  });
  if (error) throw error;
  return data;
}

/**
 * @param {string} meId
 * @returns {Promise<Array<{ conversation: object, other: object|null }>>}
 */
export async function listMyConversations(meId) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: rows, error } = await supabase
    .from("conversations")
    .select(
      "id,participant_1,participant_2,last_message_at,last_message_preview,last_sender_id,created_at"
    )
    .or(`participant_1.eq.${meId},participant_2.eq.${meId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  const convs = rows || [];
  const otherIds = convs.map((c) =>
    c.participant_1 === meId ? c.participant_2 : c.participant_1
  );
  if (!otherIds.length) return [];

  const { data: profiles, error: pErr } = await supabase
    .from("public_profiles")
    .select("id,name,username")
    .in("id", otherIds);
  if (pErr) throw pErr;
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  return convs.map((c) => {
    const oid = c.participant_1 === meId ? c.participant_2 : c.participant_1;
    return { conversation: c, other: byId[oid] || { id: oid, name: "User", username: null } };
  });
}

export async function fetchMessages(conversationId, { limit = 100 } = {}) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId, body) {
  if (!supabase) throw new Error("Supabase not configured");
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not logged in");
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: trimmed,
    })
    .select("id,conversation_id,sender_id,body,created_at")
    .single();
  if (error) throw error;
  return data;
}

/**
 * @param {string} conversationId
 * @param {(row: object) => void} onInsert
 * @returns {() => void} unsubscribe
 */
export function subscribeToNewMessages(conversationId, onInsert) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) onInsert(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to inbox-level changes so /messages updates instantly when
 * anyone sends/replies (including from another tab/device).
 */
export function subscribeToInboxChanges(meId, onChange) {
  if (!supabase || !meId) return () => {};

  const channel = supabase
    .channel(`inbox:${meId}`)
    // Conversation appears for me as participant_1
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_1=eq.${meId}`,
      },
      () => onChange?.()
    )
    // Conversation appears for me as participant_2
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_2=eq.${meId}`,
      },
      () => onChange?.()
    )
    // Any new message I can see via RLS (participant in that conversation)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      () => onChange?.()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
