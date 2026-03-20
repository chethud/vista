-- Phase 1 extension:
-- 1) Add username to profiles for username-based search
-- 2) Expose username in public_profiles view for safe public reads

alter table public.profiles
add column if not exists username text;

-- Backfill missing usernames with deterministic unique values.
update public.profiles
set username = lower(
  coalesce(nullif(regexp_replace(name, '[^a-zA-Z0-9_]+', '', 'g'), ''), 'user')
  || '_' || substring(id::text, 1, 6)
)
where username is null;

-- Guardrails
create unique index if not exists profiles_username_uq on public.profiles (username);

alter table public.profiles
drop constraint if exists profiles_username_chk;

alter table public.profiles
add constraint profiles_username_chk
check (username ~ '^[A-Za-z0-9_]{3,30}$');

-- Safe public projection now includes username.
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

