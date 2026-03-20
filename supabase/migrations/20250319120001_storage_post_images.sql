-- Optional: storage for post images used by the frontend (`post` bucket).
-- Run in Supabase SQL Editor if image uploads fail with "Bucket not found" / RLS errors.
--
-- Note: uploads use path `public/<timestamp>-<filename>` (no user id in path).
-- Policies below allow any signed-in user to upload; tune if you need stricter rules.

insert into storage.buckets (id, name, public)
values ('post', 'post', true)
on conflict (id) do nothing;

drop policy if exists "post insert authenticated" on storage.objects;
create policy "post insert authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'post');

drop policy if exists "post select public" on storage.objects;
create policy "post select public"
on storage.objects
for select
to public
using (bucket_id = 'post');
