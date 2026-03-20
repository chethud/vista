-- Ensure the trigger function is owned by `postgres` so it can bypass RLS
-- during auth signup trigger inserts into `public.profiles`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Extra safety: disable RLS during this function execution.
  -- This prevents insert policy checks failing during the auth trigger.
  perform set_config('row_security', 'off', true);

  insert into public.profiles (id, name)
  values (new.id, '')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Make sure the owner can BYPASSRLS (needed for RLS-enabled tables).
alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

