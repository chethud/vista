# Supabase SQL for this project

Apply these in order in the **Supabase Dashboard → SQL Editor** (or your Supabase CLI workflow).

1. **`migrations/20250319120000_fix_handle_new_user_profile.sql`**  
   Fixes the auth trigger so a row is inserted into `public.profiles` with a valid `name` (empty string until the user completes the profile form). Without this, `name NOT NULL` + `insert (id)` breaks signup.

2. **`migrations/20250319120001_storage_post_images.sql`** (optional)  
   Creates the `post` storage bucket and basic RLS so authenticated users can upload and the public can read (matches the frontend upload path).

3. **`migrations/20250319120007_allow_profile_read_for_feed.sql`**  
   Allows authenticated users to read profile rows so post cards can show other users' names in feed joins (`posts -> profiles(name)`).

4. **`migrations/20250319120008_user_follows.sql`**  
   Adds follow/unfollow functionality (`user_follows` table + RLS) so users can follow others and view follower/following counts.

5. **`migrations/20250319120009_public_profiles_view.sql`**  
   Enforces profile privacy by removing broad `profiles` read policy and exposing only safe fields (`id,name,place`) through `public_profiles` view for other-user reads.

6. **`migrations/20250319120010_post_likes_comments.sql`**  
   Adds post likes and comments tables with RLS policies:
   - like/unlike post
   - add/delete own comments
   - read comments/likes for authenticated feed usage

7. **`migrations/20250319120011_username_and_user_posts_optimization.sql`**  
   Adds `profiles.username` (unique) and updates `public_profiles` view to include username for search and public rendering. Also enables optimized user-post fetching flow.

8. **`migrations/20250320160000_messaging.sql`**  
   Direct messages: `conversations` (one row per user pair), `messages`, RLS, trigger to update last-message preview, RPC `get_or_create_conversation(other_id)`, and adds `messages` to `supabase_realtime` when possible (live chat in the app).

Your app stores:

- **Profiles** → `public.profiles` (via Supabase client + RLS)
- **Posts** → `public.posts` (via FastAPI backend using the service role key)

Ensure `frontend/.env` has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_BACKEND_URL`.  
Ensure `backend/.env` has `SUPABASE_URL`, **`SUPABASE_SERVICE_ROLE_KEY`** (service role, not the anon/publishable key), and **`SUPABASE_JWT_SECRET`** (Project Settings → API → **JWT Secret**) so FastAPI can verify `Authorization: Bearer <access_token>` from the logged-in user.

Protected routes: `GET/POST /posts/*` and `GET /auth/me` require a valid Supabase user JWT. Use `frontend/src/api/backendClient.js` → `fetchWithJwt("/auth/me")` after login.

## Google sign-in (“Continue with Google”)

In **Supabase Dashboard → Authentication → Providers → Google**:

1. Enable Google and add your **Client ID** and **Client secret** from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 Web client).
2. Under **Authentication → URL Configuration**, set **Site URL** to your app origin (e.g. `http://127.0.0.1:5173` in dev).
3. Add the same origin(s) under **Redirect URLs** (e.g. `http://127.0.0.1:5173/` and your production URL). The app redirects to `/` after OAuth so the session is restored on the home route.
