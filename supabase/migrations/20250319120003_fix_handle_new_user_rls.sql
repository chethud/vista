-- Signup is failing with "unexpected_failure" (500) because the auth trigger
-- inserts into `public.profiles`, but `public.profiles` has RLS enabled.
--
-- Your RLS insert policy uses `auth.uid() = id`, and during the auth trigger
-- execution `auth.uid()` can be NULL, causing the insert to be rejected.
--
-- This migration updates the trigger function to temporarily disable RLS
-- for the insert statement.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Disable row-level security for this function execution.
  -- (GUC is scoped to the current transaction.)
  perform set_config('row_security', 'off', true);

  insert into public.profiles (id, name)
  values (new.id, '')
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

