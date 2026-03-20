import { supabase } from "../supabaseClient";

export const getFollowCounts = async (userId) => {
  const [{ count: followers, error: followersError }, { count: following, error: followingError }] =
    await Promise.all([
      supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId),
      supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),
    ]);

  if (followersError) throw followersError;
  if (followingError) throw followingError;

  return {
    followers: followers || 0,
    following: following || 0,
  };
};

const getNamesByIds = async (ids) => {
  if (!ids?.length) return [];
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id,name,username")
    .in("id", ids);
  if (error) throw error;
  return data || [];
};

export const getFollowersList = async (userId) => {
  const { data, error } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  const ids = (data || []).map((x) => x.follower_id);
  return getNamesByIds(ids);
};

export const getFollowingList = async (userId) => {
  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  const ids = (data || []).map((x) => x.following_id);
  return getNamesByIds(ids);
};

export const isFollowingUser = async (followerId, followingId) => {
  if (!followerId || !followingId || followerId === followingId) return false;
  const { data, error } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

export const followUser = async (followerId, followingId) => {
  const { error } = await supabase.from("user_follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });
  if (error) throw error;
};

export const unfollowUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id,name,username,place")
    .order("username", { ascending: true });
  if (error) throw error;
  return data || [];
};

/**
 * Privacy-friendly discovery: return only people connected to me
 * (followers + following), excluding myself.
 */
export const getConnectedUsers = async (meId) => {
  if (!meId) return [];

  const [{ data: asFollower, error: e1 }, { data: asFollowing, error: e2 }] = await Promise.all([
    supabase.from("user_follows").select("following_id").eq("follower_id", meId),
    supabase.from("user_follows").select("follower_id").eq("following_id", meId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const ids = [
    ...new Set([
      ...(asFollower || []).map((r) => r.following_id),
      ...(asFollowing || []).map((r) => r.follower_id),
    ]),
  ].filter((id) => id && id !== meId);

  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id,name,username,place")
    .in("id", ids)
    .order("username", { ascending: true });
  if (error) throw error;
  return data || [];
};

export const searchUsersByUsername = async (query, meId) => {
  const q = String(query || "").trim().replace(/^@/, "").toLowerCase();
  if (!q) return [];
  let req = supabase
    .from("public_profiles")
    .select("id,name,username,place")
    .ilike("username", `%${q}%`)
    .order("username", { ascending: true })
    .limit(30);
  if (meId) {
    req = req.neq("id", meId);
  }
  const { data, error } = await req;
  if (error) throw error;
  return data || [];
};

export const getFollowingIds = async (meId) => {
  if (!meId) return new Set();
  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", meId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.following_id).filter(Boolean));
};

export const getUserProfileById = async (userId) => {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id,name,username,place")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

