-- Reset and harden RLS policies for this app.
-- Run this in Supabase SQL Editor when you see:
-- "new row violates row-level security policy"

-- =========================
-- Ensure RLS is ON
-- =========================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- =========================
-- PROFILES POLICIES
-- =========================
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================
-- POSTS POLICIES
-- =========================
drop policy if exists "Anyone can view posts" on public.posts;
drop policy if exists "Users can create posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

create policy "Anyone can view posts"
on public.posts
for select
to public
using (true);

create policy "Users can create posts"
on public.posts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete own posts"
on public.posts
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- STORAGE POLICIES (bucket: post)
-- =========================
insert into storage.buckets (id, name, public)
values ('post', 'post', true)
on conflict (id) do nothing;

drop policy if exists "post insert authenticated" on storage.objects;
drop policy if exists "post select public" on storage.objects;

create policy "post insert authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'post');

create policy "post select public"
on storage.objects
for select
to public
using (bucket_id = 'post');

