-- Make signup trigger non-fatal:
-- If inserting into `public.profiles` fails, allow auth signup to succeed.
-- The frontend `/profile` page will create the profiles row via `upsert`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    -- Best-effort: try to bypass RLS for this insert execution.
    perform set_config('row_security', 'off', true);

    insert into public.profiles (id, name)
    values (new.id, '')
    on conflict (id) do nothing;
  exception
    when others then
      -- Ignore profile bootstrap failures.
      -- Users will be redirected to /profile where we upsert the row.
      null;
  end;

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

