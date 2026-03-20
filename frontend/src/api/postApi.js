import { supabase } from "../supabaseClient";

export const createPost = async (data) => {
  const { data: inserted, error } = await supabase
    .from("posts")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return { data: inserted };
};

export const deletePost = async (postId) => {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
};

export const getPosts = async () => {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id,user_id,content,image_url,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const ids = [...new Set((posts || []).map((p) => p.user_id).filter(Boolean))];
  let nameMap = {};
  if (ids.length) {
    const { data: profiles, error: pError } = await supabase
      .from("public_profiles")
      .select("id,name,username")
      .in("id", ids);
    if (pError) throw pError;
    nameMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  }

  const merged = (posts || []).map((p) => ({
    ...p,
    profiles: nameMap[p.user_id] || null,
  }));
  return { data: merged };
};

export const getPostsByUser = async (userId) => {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id,user_id,content,image_url,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: profile, error: pError } = await supabase
    .from("public_profiles")
    .select("id,name,username")
    .eq("id", userId)
    .maybeSingle();
  if (pError) throw pError;

  return {
    data: (posts || []).map((p) => ({
      ...p,
      profiles: profile || null,
    })),
  };
};