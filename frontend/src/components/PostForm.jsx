import { useState } from "react";
import { supabase } from "../supabaseClient";
import { createPost } from "../api/postApi";

/**
 * @param {{ onPosted?: () => void }} props
 */
export default function PostForm({ onPosted }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!supabase) {
      alert("Supabase is not configured. Check frontend/.env");
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      alert("Please login to post.");
      return;
    }

    const trimmed = content.trim();
    if (!trimmed && !file) {
      alert("Add some text or choose an image (your table requires at least one).");
      return;
    }

    setPosting(true);
    try {
      let image_url = null;

      if (file) {
        const path = `public/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post")
          .upload(path, file);

        if (uploadError) {
          alert(uploadError.message);
          return;
        }

        const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
        image_url = `${base}/storage/v1/object/public/post/${uploadData.path}`;
      }

      await createPost({
        user_id: user.id,
        content: trimmed || null,
        image_url,
      });

      alert("Posted!");
      setContent("");
      setFile(null);
      onPosted?.();
    } catch (e) {
      const msg =
        e?.message ||
        e?.details ||
        e?.hint ||
        "Failed to create post";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="post-form">
      <textarea
        className="textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
      />
      <input
        className="input"
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <div className="btn-row">
        <button className="btn btn-primary" type="button" onClick={handlePost} disabled={posting}>
          {posting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}