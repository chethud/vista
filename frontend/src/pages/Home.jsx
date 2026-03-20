import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPosts } from "../api/postApi";
import PostCard from "../components/PostCard";
import PostForm from "../components/PostForm";
import AppBottomNav from "../components/AppBottomNav";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { getFollowCounts } from "../api/followApi";

export default function Home() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!session?.user?.id) {
      setCurrentUserId(null);
      setProfile(null);
      return;
    }
    loadPosts();
    loadProfile();
  }, [session?.user?.id]);

  const loadPosts = async () => {
    try {
      const res = await getPosts();
      const data = res.data;
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load posts");
    }
  };

  const loadProfile = async () => {
    if (!supabase) return;
    const user = session?.user;
    if (!user) return;
    setCurrentUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("id,name,age,phone_no,sex,date_of_birth,place")
      .eq("id", user.id)
      .maybeSingle();

    setProfile(data || null);
    try {
      const stats = await getFollowCounts(user.id);
      setFollowCounts(stats);
    } catch (e) {
      console.error(e);
    }
  };

  const storyUsers = [];
  const seen = new Set();
  if (profile?.id || currentUserId) {
    const myId = profile?.id || currentUserId;
    storyUsers.push({
      id: myId,
      name: profile?.name?.trim() || "You",
      username: null,
      mine: true,
    });
    seen.add(myId);
  }
  for (const p of posts) {
    const pr = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    if (!pr?.id || seen.has(pr.id)) continue;
    seen.add(pr.id);
    storyUsers.push({
      id: pr.id,
      name: pr.name?.trim() || (pr.username ? `@${pr.username}` : "User"),
      username: pr.username || null,
      mine: false,
    });
    if (storyUsers.length >= 12) break;
  }

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <section className="feed-main ig-feed-main">
          <div className="ig-topbar">
            <div>
              <h2 className="title ig-brand">Vista</h2>
              <p className="subtitle ig-sub">
                {profile?.name?.trim() || session?.user?.email || "Welcome back"}
              </p>
            </div>
            <div className="feed-actions">
              <button className="btn btn-secondary btn-xs" onClick={() => navigate("/messages")}>
                Chat
              </button>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate("/settings")}>
                Settings
              </button>
            </div>
          </div>

          <div className="ig-stats-row">
            <div className="ig-stat-card">
              <span>Followers</span>
              <strong>{followCounts.followers}</strong>
            </div>
            <div className="ig-stat-card">
              <span>Following</span>
              <strong>{followCounts.following}</strong>
            </div>
            <div className="ig-stat-card">
              <span>Posts</span>
              <strong>{posts.length}</strong>
            </div>
          </div>

          <div className="ig-stories">
            {storyUsers.map((u) => (
              <button
                key={u.id}
                className={`ig-story ${u.mine ? "mine" : ""}`}
                onClick={() => navigate(u.mine ? "/profile" : `/users/${u.id}`)}
                type="button"
              >
                <span className="ig-story-ring">
                  <span className="ig-story-avatar">
                    {(u.username || u.name || "U").slice(0, 1).toUpperCase()}
                  </span>
                </span>
                <span className="ig-story-name">
                  {u.mine ? "Your story" : u.username ? `@${u.username}` : u.name}
                </span>
              </button>
            ))}
          </div>

          <PostForm onPosted={loadPosts} />
          {error ? <p className="error-text">{error}</p> : null}
          <div className="ig-section-head">
            <h3>For You</h3>
            <button className="btn btn-ghost btn-xs" onClick={loadPosts}>
              Refresh
            </button>
          </div>
          <div className="post-list ig-feed-list">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                currentUserId={currentUserId}
                onFollowChanged={loadProfile}
                onPostChanged={loadPosts}
              />
            ))}
          </div>
        </section>

        <AppBottomNav />
      </div>
    </div>
  );
}