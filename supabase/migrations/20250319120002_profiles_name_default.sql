-- Make signup/profile bootstrap more robust.
-- Your `public.profiles.name` is `NOT NULL` but your original auth trigger inserted only `(id)`.
-- Setting a default prevents "Database error saving new user" if the trigger still inserts `id` only.

alter table public.profiles
alter column name set default '';

-- (Optional) If any existing rows have NULL name, set them to empty string.
-- This should rarely be needed after enforcing NOT NULL.
update public.profiles
set name = ''
where name is null;

