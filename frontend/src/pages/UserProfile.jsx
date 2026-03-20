import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  followUser,
  getFollowCounts,
  getFollowersList,
  getFollowingList,
  getUserProfileById,
  isFollowingUser,
  unfollowUser,
} from "../api/followApi";
import { getPostsByUser } from "../api/postApi";
import { getOrCreateConversation } from "../api/messageApi";
import { supabase } from "../supabaseClient";
import AppBottomNav from "../components/AppBottomNav";
import PostCard from "../components/PostCard";

export default function UserProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !userId) return;
      const { data: authData } = await supabase.auth.getUser();
      const meId = authData?.user?.id || null;
      setMe(meId);

      try {
        const [p, c, flwrs, flwing, userPosts] = await Promise.all([
          getUserProfileById(userId),
          getFollowCounts(userId),
          getFollowersList(userId),
          getFollowingList(userId),
          getPostsByUser(userId),
        ]);
        setProfile(p);
        setCounts(c);
        setFollowers(flwrs);
        setFollowing(flwing);
        setPosts(userPosts.data || []);
        if (meId && meId !== userId) {
          setIsFollowing(await isFollowingUser(meId, userId));
        }
      } catch (e) {
        alert(e?.message || "Failed to load user profile");
      }
    };
    load();
  }, [userId]);

  const toggleFollow = async () => {
    if (!me || !userId || me === userId) return;
    setBusy(true);
    try {
      if (isFollowing) {
        await unfollowUser(me, userId);
      } else {
        await followUser(me, userId);
      }
      const [c, flwrs, flwing] = await Promise.all([
        getFollowCounts(userId),
        getFollowersList(userId),
        getFollowingList(userId),
      ]);
      setCounts(c);
      setFollowers(flwrs);
      setFollowing(flwing);
      setIsFollowing(!isFollowing);
    } catch (e) {
      alert(e?.message || "Failed to update follow status");
    } finally {
      setBusy(false);
    }
  };

  const openChat = async () => {
    if (!me || !userId || me === userId) return;
    setMsgBusy(true);
    try {
      const cid = await getOrCreateConversation(userId);
      navigate(`/messages/${cid}`);
    } catch (e) {
      alert(e?.message || "Could not open chat");
    } finally {
      setMsgBusy(false);
    }
  };

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <div className="ig-feed-main screen-panel">
        <div className="feed-header screen-header">
          <div>
            <h2 className="title">{profile?.name || "User Profile"}</h2>
            <p className="subtitle">
              Public profile: followers, following and posts
              {profile?.username ? ` • @${profile.username}` : ""}
              {profile?.place ? ` • ${profile.place}` : ""}.
            </p>
          </div>
          <div className="feed-actions">
            {me && me !== userId ? (
              <>
                <button className="btn btn-secondary" onClick={openChat} disabled={msgBusy}>
                  {msgBusy ? "…" : "Message"}
                </button>
                <button className="btn btn-secondary" onClick={toggleFollow} disabled={busy}>
                  {busy ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
              </>
            ) : null}
            <button className="btn btn-ghost" onClick={() => navigate("/users")}>
              All Users
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/home")}>
              Home
            </button>
          </div>
        </div>

        <div className="follow-stats">
          <div className="profile-kv"><span>Followers</span><strong>{counts.followers}</strong></div>
          <div className="profile-kv"><span>Following</span><strong>{counts.following}</strong></div>
        </div>

        <div className="follow-grid">
          <section className="follow-box">
            <h4>Followers</h4>
            <div className="follow-list">
              {followers.length
                ? followers.map((u) => (
                    <button key={u.id} className="user-chip user-chip-btn" onClick={() => navigate(`/users/${u.id}`)}>
                      {u.name || "Unnamed"}
                    </button>
                  ))
                : <span className="subtitle">No followers yet</span>}
            </div>
          </section>
          <section className="follow-box">
            <h4>Following</h4>
            <div className="follow-list">
              {following.length
                ? following.map((u) => (
                    <button key={u.id} className="user-chip user-chip-btn" onClick={() => navigate(`/users/${u.id}`)}>
                      {u.name || "Unnamed"}
                    </button>
                  ))
                : <span className="subtitle">Not following anyone yet</span>}
            </div>
          </section>
        </div>

        <div className="post-list" style={{ marginTop: 12 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={me} onPostChanged={() => navigate(0)} />
          ))}
        </div>
        </div>
        <AppBottomNav />
      </div>
    </div>
  );
}

