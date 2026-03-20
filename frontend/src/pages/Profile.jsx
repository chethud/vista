import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBottomNav from "../components/AppBottomNav";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { getFollowCounts, getFollowersList, getFollowingList } from "../api/followApi";

export default function Profile() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [place, setPlace] = useState("");
  const [saving, setSaving] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const user = session?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,username,age,phone_no,sex,date_of_birth,place")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("profiles load error:", error);
        return;
      }

      setName(data?.name || "");
      setUsername(data?.username || "");
      setAge(data?.age ?? "");
      setPhoneNo(data?.phone_no || "");
      setSex(data?.sex || "");
      setDateOfBirth(data?.date_of_birth || "");
      setPlace(data?.place || "");

      try {
        const [counts, followerList, followingList] = await Promise.all([
          getFollowCounts(user.id),
          getFollowersList(user.id),
          getFollowingList(user.id),
        ]);
        setFollowersCount(counts.followers);
        setFollowingCount(counts.following);
        setFollowers(followerList);
        setFollowing(followingList);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [session?.user?.id]);

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  const saveProfile = async () => {
    if (!supabase) {
      alert("Supabase is not configured. Check frontend/.env");
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        alert("Please login first.");
        return;
      }

      if (!name.trim()) {
        alert("Name is required.");
        return;
      }

      if (username && !/^[A-Za-z0-9_]{3,30}$/.test(username)) {
        alert("Username must be 3-30 chars and contain only letters, numbers, underscore.");
        return;
      }

      const ageInt = age === "" ? null : Number.parseInt(age, 10);
      if (age !== "" && Number.isNaN(ageInt)) {
        alert("Age must be a number.");
        return;
      }

      const payload = {
        name: name.trim(),
        username: username ? username.trim().toLowerCase() : null,
        age: ageInt,
        phone_no: phoneNo || null,
        sex: sex || null,
        date_of_birth: dateOfBirth || null,
        place: place || null,
      };

      const { data: updatedRows, error: updateError } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select("id");

      if (updateError) {
        const msg = [
          updateError.message,
          updateError.code ? `code: ${updateError.code}` : null,
          updateError.details ? `details: ${updateError.details}` : null,
          updateError.hint ? `hint: ${updateError.hint}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        alert(msg);
        return;
      }

      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          ...payload,
        });

        if (insertError) {
          const msg = [
            insertError.message,
            insertError.code ? `code: ${insertError.code}` : null,
            insertError.details ? `details: ${insertError.details}` : null,
            insertError.hint ? `hint: ${insertError.hint}` : null,
          ]
            .filter(Boolean)
            .join("\n");
          alert(msg);
          return;
        }
      }

      alert("Profile saved");
      // Force reload so App's profile guard re-checks `public.profiles`.
      window.location.href = "/home";
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell app-shell-home">
      <div className="ig-shell">
        <div className="ig-feed-main screen-panel">
        <h2 className="title">Profile Details</h2>
        <p className="subtitle">Complete your details to continue to the feed.</p>

        <div className="form-grid">
          <div className="field">
            <label>Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="field">
            <label>Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
            />
          </div>

          <div className="field">
            <label>Age</label>
            <input
              className="input"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
            />
          </div>

          <div className="field">
            <label>Phone No</label>
            <input
              className="input"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              placeholder="Phone number"
            />
          </div>

          <div className="field">
            <label>Sex</label>
            <select className="select" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Select</option>
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="field">
            <label>Date of Birth</label>
            <input
              className="input"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Place</label>
            <input
              className="input"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Place"
            />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/users")}>
            Users
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/settings")}>
            Settings
          </button>
          <button className="btn btn-danger" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="follow-stats">
          <div className="profile-kv"><span>Followers</span><strong>{followersCount}</strong></div>
          <div className="profile-kv"><span>Following</span><strong>{followingCount}</strong></div>
        </div>

        <div className="follow-grid">
          <section className="follow-box">
            <h4>Followers</h4>
            <div className="follow-list">
              {followers.length ? followers.map((u) => (
                <button
                  key={u.id}
                  className="user-chip user-chip-btn"
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  {u.name || "Unnamed"}
                </button>
              )) : <span className="subtitle">No followers yet</span>}
            </div>
          </section>
          <section className="follow-box">
            <h4>Following</h4>
            <div className="follow-list">
              {following.length ? following.map((u) => (
                <button
                  key={u.id}
                  className="user-chip user-chip-btn"
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  {u.name || "Unnamed"}
                </button>
              )) : <span className="subtitle">Not following anyone yet</span>}
            </div>
          </section>
        </div>
        </div>
        <AppBottomNav />
      </div>
    </div>
  );
}

