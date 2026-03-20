-- User follow system
-- A user can follow other users, and view follower/following counts.

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp without time zone default now(),
  constraint user_follows_pkey primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

alter table public.user_follows enable row level security;

drop policy if exists "Anyone can view follows" on public.user_follows;
create policy "Anyone can view follows"
on public.user_follows
for select
to authenticated
using (true);

drop policy if exists "Users can follow" on public.user_follows;
create policy "Users can follow"
on public.user_follows
for insert
to authenticated
with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow own relations" on public.user_follows;
create policy "Users can unfollow own relations"
on public.user_follows
for delete
to authenticated
using (auth.uid() = follower_id);

