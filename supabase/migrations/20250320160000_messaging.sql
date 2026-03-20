-- Direct messages: one row per user pair (participant_1 < participant_2 UUID order)

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

-- Keep conversation preview in sync
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

-- Create or return existing DM thread (ordered pair)
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

-- Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
