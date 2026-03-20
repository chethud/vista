-- Fix signup/profile bootstrap: `profiles.name` is NOT NULL but the original trigger
-- only inserted `id`, which fails the insert and can break user registration.
--
-- Run this in Supabase SQL Editor (or via CLI) if you already applied the old trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, '');
  return new;
end;
$$;

-- Recreate trigger if needed (safe if it already exists with same name)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
