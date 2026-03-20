import { useEffect, useState } from "react";
import { followUser, isFollowingUser, unfollowUser } from "../api/followApi";
import {
  addComment,
  deleteComment,
  getComments,
  getLikeCount,
  isPostLikedByUser,
  likePost,
  unlikePost,
} from "../api/engagementApi";
import { deletePost } from "../api/postApi";

export default function PostCard({ post, currentUserId, onFollowChanged, onPostChanged }) {
  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const username = profile?.username ? `@${profile.username}` : null;
  const authorName = profile?.name?.trim() || username || "Unknown user";
  const targetUserId = post.user_id;
  const canFollow = !!currentUserId && !!targetUserId && currentUserId !== targetUserId;
  const isOwner = !!currentUserId && currentUserId === targetUserId;
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!canFollow) return;
      try {
        const yes = await isFollowingUser(currentUserId, targetUserId);
        if (!cancelled) setFollowing(yes);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [canFollow, currentUserId, targetUserId]);

  useEffect(() => {
    let cancelled = false;
    const loadLikes = async () => {
      try {
        const [count, mine] = await Promise.all([
          getLikeCount(post.id),
          isPostLikedByUser(post.id, currentUserId),
        ]);
        if (!cancelled) {
          setLikesCount(count);
          setLiked(mine);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadLikes();
    return () => {
      cancelled = true;
    };
  }, [post.id, currentUserId]);

  const toggleFollow = async () => {
    if (!canFollow) return;
    setBusy(true);
    try {
      if (following) {
        await unfollowUser(currentUserId, targetUserId);
        setFollowing(false);
      } else {
        await followUser(currentUserId, targetUserId);
        setFollowing(true);
      }
      onFollowChanged?.();
    } catch (e) {
      const msg = e?.message || e?.details || "Follow action failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async () => {
    if (!currentUserId) return;
    try {
      if (liked) {
        await unlikePost(post.id, currentUserId);
        setLiked(false);
        setLikesCount((x) => Math.max(0, x - 1));
      } else {
        await likePost(post.id, currentUserId);
        setLiked(true);
        setLikesCount((x) => x + 1);
      }
    } catch (e) {
      alert(e?.message || "Like action failed");
    }
  };

  const openComments = async () => {
    setCommentsOpen((x) => !x);
    if (commentsOpen) return;
    setLoadingComments(true);
    try {
      const list = await getComments(post.id);
      setComments(list);
    } catch (e) {
      alert(e?.message || "Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const addNewComment = async () => {
    if (!currentUserId) return;
    if (!commentText.trim()) return;
    try {
      await addComment(post.id, currentUserId, commentText);
      setCommentText("");
      const list = await getComments(post.id);
      setComments(list);
    } catch (e) {
      alert(e?.message || "Failed to add comment");
    }
  };

  const removeComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      alert(e?.message || "Failed to delete comment");
    }
  };

  const removePost = async () => {
    if (!isOwner) return;
    const ok = window.confirm("Delete this post?");
    if (!ok) return;
    try {
      await deletePost(post.id);
      onPostChanged?.();
    } catch (e) {
      alert(e?.message || "Failed to delete post");
    }
  };

  return (
    <div className="post-card">
      <div className="post-head">
        <div className="post-author-wrap">
          <div className="post-author">{authorName}</div>
          {username ? <div className="post-username">{username}</div> : null}
        </div>
        <div className="post-head-actions">
          {canFollow ? (
            <button className="btn btn-secondary btn-xs" onClick={toggleFollow} disabled={busy}>
              {busy ? "..." : following ? "Following" : "Follow"}
            </button>
          ) : null}
          {isOwner ? (
            <button className="btn btn-danger btn-xs" onClick={removePost}>
              Delete
            </button>
          ) : null}
        </div>
      </div>
      {post.content ? <p className="post-content">{post.content}</p> : null}
      {post.image_url && <img className="post-image" src={post.image_url} alt="Post" />}
      <div className="post-actions-row">
        <button className="btn btn-secondary btn-xs" onClick={toggleLike}>
          {liked ? "Unlike" : "Like"} ({likesCount})
        </button>
        <button className="btn btn-ghost btn-xs" onClick={openComments}>
          {commentsOpen ? "Hide comments" : "Comments"}
        </button>
      </div>
      {commentsOpen ? (
        <div className="comments-box">
          {loadingComments ? (
            <p className="subtitle">Loading comments...</p>
          ) : (
            <div className="comments-list">
              {comments.length ? (
                comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    <strong>{c.user_name}</strong>: {c.content}
                    {c.user_id === currentUserId ? (
                      <button className="comment-del" onClick={() => removeComment(c.id)}>
                        delete
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="subtitle">No comments yet</p>
              )}
            </div>
          )}
          <div className="comment-add">
            <input
              className="input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
            />
            <button className="btn btn-primary btn-xs" onClick={addNewComment}>
              Send
            </button>
          </div>
        </div>
      ) : null}
      <div className="post-meta">{post.created_at ? new Date(post.created_at).toLocaleString() : ""}</div>
    </div>
  );
}