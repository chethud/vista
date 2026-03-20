-- DB-level privacy hardening for profiles:
-- 1) Remove broad read policy from `public.profiles`
-- 2) Expose only safe fields via `public.public_profiles` view

-- Keep own-profile policy, remove broad feed read policy if present.
drop policy if exists "Authenticated can view profiles for feed" on public.profiles;

-- Public/safe projection for other-user reads.
create or replace view public.public_profiles
with (security_invoker = true)
as
select
  id,
  name,
  place
from public.profiles;

grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;

