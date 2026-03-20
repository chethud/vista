-- Extra social features: likes + comments

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

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- likes policies
drop policy if exists "Anyone can view likes" on public.post_likes;
create policy "Anyone can view likes"
on public.post_likes
for select
to authenticated
using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
on public.post_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike own likes" on public.post_likes;
create policy "Users can unlike own likes"
on public.post_likes
for delete
to authenticated
using (auth.uid() = user_id);

-- comments policies
drop policy if exists "Anyone can view comments" on public.post_comments;
create policy "Anyone can view comments"
on public.post_comments
for select
to authenticated
using (true);

drop policy if exists "Users can add comments" on public.post_comments;
create policy "Users can add comments"
on public.post_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.post_comments;
create policy "Users can delete own comments"
on public.post_comments
for delete
to authenticated
using (auth.uid() = user_id);

