-- Allow profile names to be visible in the feed.
-- Without this, joins like posts -> profiles(name) can return null for other users
-- because current policy only allows "view own profile".

-- Keep existing own-profile policy, add read access for feed usage.
drop policy if exists "Authenticated can view profiles for feed" on public.profiles;
create policy "Authenticated can view profiles for feed"
on public.profiles
for select
to authenticated
using (true);

