-- =========================================================
-- FULL SCHEMA (consolidated)
-- Project: Vista social app
-- =========================================================
-- Notes:
-- - Run in Supabase SQL Editor as a privileged role.
-- - This script is idempotent where practical.
-- - Assumes `auth.users` and `storage` schemas exist (Supabase default).

-- =========================
-- EXTENSIONS
-- =========================
create extension if not exists "uuid-ossp";

-- =========================
-- PROFILES
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  username text,
  age int,
  phone_no text,
  sex text check (sex in ('male', 'female', 'other')),
  date_of_birth date,
  place text,
  created_at timestamp without time zone default now()
);

-- If table already existed before username feature, ensure the column exists.
alter table public.profiles
add column if not exists username text;

-- username constraints/index
create unique index if not exists profiles_username_uq on public.profiles (username);

alter table public.profiles
drop constraint if exists profiles_username_chk;

alter table public.profiles
add constraint profiles_username_chk
check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$');

-- Backfill missing usernames (safe deterministic values)
update public.profiles
set username = lower(
  coalesce(nullif(regexp_replace(name, '[^a-zA-Z0-9_]+', '', 'g'), ''), 'user')
  || '_' || substring(id::text, 1, 6)
)
where username is null;

-- =========================
-- POSTS
-- =========================
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamp without time zone default now(),
  constraint content_or_image_check check (content is not null or image_url is not null)
);

-- =========================
-- FOLLOWS
-- =========================
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp without time zone default now(),
  constraint user_follows_pkey primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

-- =========================
-- LIKES + COMMENTS
-- =========================
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp without time zone default now(),
  constraint post_likes_pkey primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid not null default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp without time zone default now(),
  constraint post_comments_pkey primary key (id),
  constraint post_comments_content_chk check (length(trim(content)) > 0)
);

-- =========================
-- RLS ON
-- =========================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.user_follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- =========================
-- PROFILES POLICIES
-- =========================
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Authenticated can view profiles for feed" on public.profiles;

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
-- FOLLOWS POLICIES
-- =========================
drop policy if exists "Anyone can view follows" on public.user_follows;
drop policy if exists "Users can follow" on public.user_follows;
drop policy if exists "Users can unfollow own relations" on public.user_follows;

create policy "Anyone can view follows"
on public.user_follows
for select
to authenticated
using (true);

create policy "Users can follow"
on public.user_follows
for insert
to authenticated
with check (auth.uid() = follower_id);

create policy "Users can unfollow own relations"
on public.user_follows
for delete
to authenticated
using (auth.uid() = follower_id);

-- =========================
-- LIKES POLICIES
-- =========================
drop policy if exists "Anyone can view likes" on public.post_likes;
drop policy if exists "Users can like posts" on public.post_likes;
drop policy if exists "Users can unlike own likes" on public.post_likes;

create policy "Anyone can view likes"
on public.post_likes
for select
to authenticated
using (true);

create policy "Users can like posts"
on public.post_likes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can unlike own likes"
on public.post_likes
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- COMMENTS POLICIES
-- =========================
drop policy if exists "Anyone can view comments" on public.post_comments;
drop policy if exists "Users can add comments" on public.post_comments;
drop policy if exists "Users can delete own comments" on public.post_comments;

create policy "Anyone can view comments"
on public.post_comments
for select
to authenticated
using (true);

create policy "Users can add comments"
on public.post_comments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete own comments"
on public.post_comments
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- AUTH SIGNUP TRIGGER
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform set_config('row_security', 'off', true);
    insert into public.profiles (id, name)
    values (new.id, '')
    on conflict (id) do nothing;
  exception
    when others then
      null;
  end;

  return new;
end;
$$;

-- Ensure owner has enough privilege in Supabase
alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- =========================
-- PUBLIC PROFILE VIEW (safe fields only)
-- =========================
drop view if exists public.public_profiles;

create or replace view public.public_profiles
with (security_invoker = true)
as
select
  id,
  name,
  username,
  place
from public.profiles;

grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;

-- =========================
-- STORAGE (bucket: post)
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

-- =========================
-- MESSAGING (DM)
-- =========================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_1 uuid not null references public.profiles(id) on delete cascade,
  participant_2 uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid references public.profiles(id) on delete set null,
  constraint conversations_participants_ordered check (participant_1 < participant_2),
  constraint conversations_participants_uq unique (participant_1, participant_2)
);

create index if not exists conversations_p1_idx on public.conversations (participant_1);
create index if not exists conversations_p2_idx on public.conversations (participant_2);
create index if not exists conversations_last_msg_idx on public.conversations (last_message_at desc nulls last);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_chk check (length(trim(body)) > 0)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

create or replace function public.on_new_message_update_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(trim(new.body), 200),
    last_sender_id = new.sender_id
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_bump_conversation on public.messages;
create trigger trg_messages_bump_conversation
after insert on public.messages
for each row
execute procedure public.on_new_message_update_conversation();

create or replace function public.get_or_create_conversation(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  low uuid;
  high uuid;
  cid uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if other_id is null or other_id = me then
    raise exception 'invalid recipient';
  end if;
  if not exists (select 1 from public.profiles where id = other_id) then
    raise exception 'user not found';
  end if;

  low := least(me, other_id);
  high := greatest(me, other_id);

  insert into public.conversations (participant_1, participant_2)
  values (low, high)
  on conflict (participant_1, participant_2) do nothing;

  select c.id into cid
  from public.conversations c
  where c.participant_1 = low and c.participant_2 = high;

  return cid;
end;
$$;

alter function public.get_or_create_conversation(uuid) owner to postgres;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conv select members" on public.conversations;
drop policy if exists "conv insert members" on public.conversations;

create policy "conv select members"
on public.conversations
for select
to authenticated
using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "conv insert members"
on public.conversations
for insert
to authenticated
with check (
  participant_1 < participant_2
  and (auth.uid() = participant_1 or auth.uid() = participant_2)
);

drop policy if exists "msg select if member" on public.messages;
drop policy if exists "msg insert if member" on public.messages;
drop policy if exists "msg delete own" on public.messages;

create policy "msg select if member"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
  )
);

create policy "msg insert if member"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
  )
);

create policy "msg delete own"
on public.messages
for delete
to authenticated
using (auth.uid() = sender_id);

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

