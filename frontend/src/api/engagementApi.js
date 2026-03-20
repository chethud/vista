import { supabase } from "../supabaseClient";

export const getLikeCount = async (postId) => {
  const { count, error } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error) throw error;
  return count || 0;
};

export const isPostLikedByUser = async (postId, userId) => {
  if (!postId || !userId) return false;
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
};

export const likePost = async (postId, userId) => {
  const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  if (error) throw error;
};

export const unlikePost = async (postId, userId) => {
  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw error;
};

export const getComments = async (postId) => {
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id,post_id,user_id,content,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const ids = [...new Set((comments || []).map((c) => c.user_id).filter(Boolean))];
  let map = {};
  if (ids.length) {
    const { data: profiles, error: pErr } = await supabase
      .from("public_profiles")
      .select("id,name,username")
      .in("id", ids);
    if (pErr) throw pErr;
    map = Object.fromEntries(
      (profiles || []).map((p) => [p.id, p.name?.trim() || (p.username ? `@${p.username}` : "Unknown")])
    );
  }

  return (comments || []).map((c) => ({ ...c, user_name: map[c.user_id] || "Unknown" }));
};

export const addComment = async (postId, userId, content) => {
  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    user_id: userId,
    content: content.trim(),
  });
  if (error) throw error;
};

export const deleteComment = async (commentId) => {
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw error;
};

