-- Switch the waitlist to Supabase Auth (X / Twitter OAuth 2.0 provider) + the anon key.
-- The site signs the pilot in with X through Supabase Auth, then writes its own row directly.
-- RLS limits every user to their own row, and a trigger copies the X identity from
-- auth.users, so the browser can't claim someone else's handle.

alter table public.waitlist
  add column if not exists user_id uuid unique references auth.users (id) on delete cascade default auth.uid();

-- X identity comes from the auth user, never from the client
create or replace function public.waitlist_fill_x_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb;
begin
  new.user_id := auth.uid();
  if new.user_id is null then
    raise exception 'not signed in';
  end if;

  select u.raw_user_meta_data into meta from auth.users u where u.id = new.user_id;
  new.x_id       := coalesce(meta ->> 'provider_id', meta ->> 'sub', new.user_id::text);
  new.x_username := coalesce(meta ->> 'user_name', meta ->> 'preferred_username', meta ->> 'name');
  new.x_name     := coalesce(meta ->> 'full_name', meta ->> 'name');
  new.x_avatar   := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists waitlist_fill_x_identity on public.waitlist;
create trigger waitlist_fill_x_identity
  before insert or update on public.waitlist
  for each row execute function public.waitlist_fill_x_identity();

-- signed-in pilots: read / add / change only their own row
drop policy if exists "waitlist: read own row" on public.waitlist;
create policy "waitlist: read own row" on public.waitlist
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "waitlist: insert own row" on public.waitlist;
create policy "waitlist: insert own row" on public.waitlist
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "waitlist: update own row" on public.waitlist;
create policy "waitlist: update own row" on public.waitlist
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.waitlist to authenticated;

-- the Edge Function sign-in table is no longer used
drop table if exists public.x_auth_requests;
