-- Marketing CMS schema for Supabase.
-- Run once in the Supabase SQL editor (safe to re-run).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.content_status as enum (
    'todo',
    'changes_suggested',
    'in_progress',
    'ready_for_review',
    'ready_for_schedule',
    'done'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user). The first user to sign up becomes the owner.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles where role = 'owner')
         then 'member'::public.user_role
         else 'owner'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  brief text,
  status public.content_status not null default 'todo',
  platforms text[] not null default '{}'
    check (platforms <@ array['linkedin', 'x', 'instagram']::text[]),
  copy_linkedin text,
  copy_x text,
  copy_instagram text,
  hashtags text,
  link_url text,
  images text[] not null default '{}'
    check (coalesce(array_length(images, 1), 0) <= 4),
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  publish_at timestamptz,
  position double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_status_idx on public.content (status, position);
create index if not exists content_publish_at_idx on public.content (publish_at);

-- X copy is limited to 280 characters; links (http://, https://, www.) don't count.
-- Must match xCharCount() in src/lib/types.ts.
-- (Earlier versions limited it to 200 words; that rule and its helper are removed here.)
alter table public.content drop constraint if exists content_copy_x_words;
drop function if exists public.word_count(text);

create or replace function public.x_char_count(t text)
returns integer
language sql
immutable
as $$
  select coalesce(
    char_length(btrim(regexp_replace(t, '(https?://|www\.)\S+', '', 'gi'), E' \t\r\n')),
    0
  );
$$;

alter table public.content drop constraint if exists content_copy_x_chars;
alter table public.content
  add constraint content_copy_x_chars check (public.x_char_count(copy_x) <= 280) not valid;

-- Only the owner can move content into Ready for schedule or Done / Posted.
create or replace function public.content_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status
     and new.status in ('ready_for_schedule', 'done')
     and not public.is_owner() then
    raise exception 'Only the owner can move content to %', new.status
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists content_before_update on public.content;
create trigger content_before_update
  before update on public.content
  for each row execute function public.content_before_update();

-- ---------------------------------------------------------------------------
-- Post ideas for the calendar
-- ---------------------------------------------------------------------------
create table if not exists public.post_ideas (
  id uuid primary key default gen_random_uuid(),
  idea_date date not null,
  text text not null check (char_length(text) between 1 and 500),
  platforms text[] not null default '{}'
    check (platforms <@ array['linkedin', 'x', 'instagram']::text[]),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists post_ideas_date_idx on public.post_ideas (idea_date);

-- ---------------------------------------------------------------------------
-- Row level security: signed-in team members share one workspace.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.post_ideas enable row level security;

drop policy if exists "profiles readable by team" on public.profiles;
create policy "profiles readable by team" on public.profiles
  for select to authenticated using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists "owner updates any profile" on public.profiles;
create policy "owner updates any profile" on public.profiles
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "content readable by team" on public.content;
create policy "content readable by team" on public.content
  for select to authenticated using (true);

drop policy if exists "team creates content" on public.content;
create policy "team creates content" on public.content
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "team updates content" on public.content;
create policy "team updates content" on public.content
  for update to authenticated using (true) with check (true);

drop policy if exists "author or owner deletes content" on public.content;
create policy "author or owner deletes content" on public.content
  for delete to authenticated using (author_id = auth.uid() or public.is_owner());

drop policy if exists "ideas readable by team" on public.post_ideas;
create policy "ideas readable by team" on public.post_ideas
  for select to authenticated using (true);

drop policy if exists "team adds ideas" on public.post_ideas;
create policy "team adds ideas" on public.post_ideas
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "creator or owner deletes ideas" on public.post_ideas;
create policy "creator or owner deletes ideas" on public.post_ideas
  for delete to authenticated using (created_by = auth.uid() or public.is_owner());

-- ---------------------------------------------------------------------------
-- Storage: post images and avatars (public read, signed-in upload)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('content-images', 'content-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "team uploads content images" on storage.objects;
create policy "team uploads content images" on storage.objects
  for insert to authenticated with check (bucket_id = 'content-images');

drop policy if exists "team deletes content images" on storage.objects;
create policy "team deletes content images" on storage.objects
  for delete to authenticated using (bucket_id = 'content-images');

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users replace own avatar" on storage.objects;
create policy "users replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Every post idea also creates a Todo card on the board.
-- ---------------------------------------------------------------------------
alter table public.post_ideas
  add column if not exists content_id uuid references public.content (id) on delete cascade;

create index if not exists post_ideas_content_idx on public.post_ideas (content_id);

-- Creates the idea and its Todo card in one transaction (runs with the caller's permissions).
create or replace function public.create_post_idea(p_idea_date date, p_text text, p_platforms text[])
returns public.post_ideas
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_id uuid;
  v_idea public.post_ideas;
  v_text text := btrim(p_text);
begin
  insert into public.content (title, brief, status, platforms, author_id, assignee_id, publish_at)
  values (
    left(v_text, 200),
    case when char_length(v_text) > 200 then v_text end,
    'todo',
    coalesce(p_platforms, '{}'),
    auth.uid(),
    auth.uid(),
    (p_idea_date + time '10:00') at time zone 'Asia/Kolkata'
  )
  returning id into v_content_id;

  insert into public.post_ideas (idea_date, text, platforms, created_by, content_id)
  values (p_idea_date, v_text, coalesce(p_platforms, '{}'), auth.uid(), v_content_id)
  returning * into v_idea;

  return v_idea;
end;
$$;

grant execute on function public.create_post_idea(date, text, text[]) to authenticated;

-- Give any earlier ideas a Todo card too.
do $$
declare r record; v_id uuid;
begin
  for r in select * from public.post_ideas where content_id is null loop
    insert into public.content (title, brief, status, platforms, author_id, assignee_id, publish_at)
    values (left(r.text, 200), case when char_length(r.text) > 200 then r.text end, 'todo',
            r.platforms, r.created_by, r.created_by,
            (r.idea_date + time '10:00') at time zone 'Asia/Kolkata')
    returning id into v_id;
    update public.post_ideas set content_id = v_id where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Campaigns: a group of posts with a goal, a date range and shared defaults.
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  brief text,
  start_date date,
  end_date date,
  color text not null default '#0462d2' check (color ~ '^#[0-9a-fA-F]{6}$'),
  default_hashtags text,
  default_link text,
  status text not null default 'planning' check (status in ('planning', 'active', 'finished')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint campaigns_dates check (end_date is null or start_date is null or end_date >= start_date)
);

alter table public.content
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;
create index if not exists content_campaign_idx on public.content (campaign_id);

alter table public.post_ideas
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;

alter table public.campaigns enable row level security;

drop policy if exists "campaigns readable by team" on public.campaigns;
create policy "campaigns readable by team" on public.campaigns
  for select to authenticated using (true);

drop policy if exists "team creates campaigns" on public.campaigns;
create policy "team creates campaigns" on public.campaigns
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "team updates campaigns" on public.campaigns;
create policy "team updates campaigns" on public.campaigns
  for update to authenticated using (true) with check (true);

drop policy if exists "creator or owner deletes campaigns" on public.campaigns;
create policy "creator or owner deletes campaigns" on public.campaigns
  for delete to authenticated using (created_by = auth.uid() or public.is_owner());

-- Ideas can belong to a campaign; their Todo card joins the same campaign.
drop function if exists public.create_post_idea(date, text, text[]);

create or replace function public.create_post_idea(
  p_idea_date date,
  p_text text,
  p_platforms text[],
  p_campaign_id uuid default null
)
returns public.post_ideas
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_id uuid;
  v_idea public.post_ideas;
  v_text text := btrim(p_text);
  v_tags text;
  v_link text;
begin
  if p_campaign_id is not null then
    select default_hashtags, default_link into v_tags, v_link
    from public.campaigns where id = p_campaign_id;
  end if;

  insert into public.content (title, brief, status, platforms, author_id, assignee_id, publish_at,
                              campaign_id, hashtags, link_url)
  values (
    left(v_text, 200),
    case when char_length(v_text) > 200 then v_text end,
    'todo',
    coalesce(p_platforms, '{}'),
    auth.uid(),
    auth.uid(),
    (p_idea_date + time '10:00') at time zone 'Asia/Kolkata',
    p_campaign_id,
    v_tags,
    v_link
  )
  returning id into v_content_id;

  insert into public.post_ideas (idea_date, text, platforms, created_by, content_id, campaign_id)
  values (p_idea_date, v_text, coalesce(p_platforms, '{}'), auth.uid(), v_content_id, p_campaign_id)
  returning * into v_idea;

  return v_idea;
end;
$$;

grant execute on function public.create_post_idea(date, text, text[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Comments, change requests and status history on each post.
-- ---------------------------------------------------------------------------
create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  kind text not null default 'comment' check (kind in ('comment', 'change_request', 'status')),
  body text not null check (char_length(body) between 1 and 2000),
  resolved boolean not null default false,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists content_comments_content_idx on public.content_comments (content_id, created_at);

alter table public.content_comments enable row level security;

drop policy if exists "comments readable by team" on public.content_comments;
create policy "comments readable by team" on public.content_comments
  for select to authenticated using (true);

-- People write comments and change requests as themselves; status entries come from the trigger.
drop policy if exists "team writes comments" on public.content_comments;
create policy "team writes comments" on public.content_comments
  for insert to authenticated
  with check (author_id = auth.uid() and kind in ('comment', 'change_request'));

-- Anyone on the team can resolve or reopen a change request.
drop policy if exists "team resolves change requests" on public.content_comments;
create policy "team resolves change requests" on public.content_comments
  for update to authenticated
  using (kind = 'change_request')
  with check (kind = 'change_request');

drop policy if exists "authors delete own comments" on public.content_comments;
create policy "authors delete own comments" on public.content_comments
  for delete to authenticated
  using (kind <> 'status' and (author_id = auth.uid() or public.is_owner()));

-- Record every status change in the post's activity.
create or replace function public.content_log_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  labels jsonb := '{"todo":"Todo","changes_suggested":"Changes suggested","in_progress":"In progress",
    "ready_for_review":"Ready for review","ready_for_schedule":"Ready for schedule","done":"Done / Posted"}';
begin
  if new.status is distinct from old.status then
    insert into public.content_comments (content_id, author_id, kind, body)
    values (new.id, auth.uid(), 'status',
            'moved this from ' || (labels ->> old.status::text) || ' to ' || (labels ->> new.status::text));
  end if;
  return null;
end;
$$;

drop trigger if exists content_log_status on public.content;
create trigger content_log_status
  after update of status on public.content
  for each row execute function public.content_log_status();

-- Suggest changes: saves the note as a change request and moves the card, together.
create or replace function public.suggest_changes(p_content_id uuid, p_note text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_note is null or btrim(p_note) = '' then
    raise exception 'Describe the changes you are suggesting.' using errcode = '22023';
  end if;

  insert into public.content_comments (content_id, author_id, kind, body)
  values (p_content_id, auth.uid(), 'change_request', btrim(p_note));

  update public.content set status = 'changes_suggested'
  where id = p_content_id and status <> 'changes_suggested';
end;
$$;

grant execute on function public.suggest_changes(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Google sign-in with an owner-managed allowlist.
-- Only emails on public.allowed_emails can create an account (see the
-- "Before user created" auth hook below). The owner adds and removes emails.
-- ---------------------------------------------------------------------------
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(btrim(email)) and email like '%_@_%'),
  role public.user_role not null default 'member',
  added_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

drop policy if exists "owner reads allowlist" on public.allowed_emails;
create policy "owner reads allowlist" on public.allowed_emails
  for select to authenticated using (public.is_owner());

drop policy if exists "owner adds emails" on public.allowed_emails;
create policy "owner adds emails" on public.allowed_emails
  for insert to authenticated with check (public.is_owner() and role = 'member');

-- The auth hook runs as supabase_auth_admin and needs to read the list.
grant select on public.allowed_emails to supabase_auth_admin;
drop policy if exists "auth hook reads allowlist" on public.allowed_emails;
create policy "auth hook reads allowlist" on public.allowed_emails
  for select to supabase_auth_admin using (true);

-- The owner, plus everyone who already has an account, stays allowed.
insert into public.allowed_emails (email, role)
values ('vighneshp65@gmail.com', 'owner')
on conflict (email) do update set role = 'owner';

update public.profiles set role = 'owner'
where id in (select id from auth.users where lower(email) = 'vighneshp65@gmail.com');

insert into public.allowed_emails (email, role)
select lower(u.email), coalesce(p.role, 'member')
from auth.users u left join public.profiles p on p.id = u.id
where u.email is not null
on conflict (email) do nothing;

-- New accounts take their role from the allowlist, and their name and photo from Google.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((select a.role from public.allowed_emails a where a.email = lower(new.email)), 'member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Auth hook: refuse to create an account for an email that isn't on the allowlist.
-- Enable it in Supabase: Authentication > Hooks > Before User Created > Postgres > public.hook_before_user_created.
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_email text := lower(event -> 'user' ->> 'email');
begin
  if v_email is null or not exists (select 1 from public.allowed_emails where email = v_email) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'This Google account is not on the DrupalAsia Marketing CMS team list. Ask the owner to add it.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

-- Is the signed-in user still on the allowlist? (Checked by the app on every sign-in.)
create or replace function public.am_i_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails a join auth.users u on lower(u.email) = a.email
    where u.id = auth.uid()
  );
$$;

grant execute on function public.am_i_allowed() to authenticated;

-- Owner view of the team: every allowed email, whether they've signed in yet, and their name.
create or replace function public.team_members()
returns table (email text, role public.user_role, added_at timestamptz, joined boolean, user_id uuid, full_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can see the team list.' using errcode = '42501';
  end if;
  return query
    select a.email, a.role, a.created_at, u.id is not null, u.id, p.full_name, p.avatar_url
    from public.allowed_emails a
    left join auth.users u on lower(u.email) = a.email
    left join public.profiles p on p.id = u.id
    order by (a.role = 'owner') desc, a.created_at;
end;
$$;

grant execute on function public.team_members() to authenticated;

-- Owner removes someone: they leave the allowlist and their login is deleted.
-- Their posts, ideas and comments stay; the author shows as removed.
create or replace function public.remove_team_member(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if not public.is_owner() then
    raise exception 'Only the owner can remove people.' using errcode = '42501';
  end if;
  if exists (select 1 from public.allowed_emails where email = v_email and role = 'owner') then
    raise exception 'The owner can''t be removed.' using errcode = '42501';
  end if;
  delete from public.allowed_emails where email = v_email;
  delete from auth.users where lower(email) = v_email;
end;
$$;

grant execute on function public.remove_team_member(text) to authenticated;

-- Keep a removed person's calendar ideas (earlier the ideas were deleted with their profile).
alter table public.post_ideas alter column created_by drop not null;
alter table public.post_ideas drop constraint if exists post_ideas_created_by_fkey;
alter table public.post_ideas
  add constraint post_ideas_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Calendar: ideas can move to another date, and deleting an idea keeps its card.
-- ---------------------------------------------------------------------------
drop policy if exists "team updates ideas" on public.post_ideas;
create policy "team updates ideas" on public.post_ideas
  for update to authenticated using (true) with check (true);

-- The idea no longer owns its card: deleting the idea leaves the card on the board.
alter table public.post_ideas drop constraint if exists post_ideas_content_id_fkey;
alter table public.post_ideas
  add constraint post_ideas_content_id_fkey foreign key (content_id) references public.content (id) on delete set null;

-- Move an idea to another day; its card's target date moves too, keeping the time of day (IST).
create or replace function public.move_post_idea(p_idea_id uuid, p_new_date date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_content_id uuid;
begin
  update public.post_ideas set idea_date = p_new_date where id = p_idea_id
  returning content_id into v_content_id;
  if not found then
    raise exception 'Idea not found.' using errcode = 'P0002';
  end if;

  if v_content_id is not null then
    update public.content
    set publish_at = (p_new_date + coalesce((publish_at at time zone 'Asia/Kolkata')::time, time '10:00'))
                     at time zone 'Asia/Kolkata'
    where id = v_content_id;
  end if;
end;
$$;

grant execute on function public.move_post_idea(uuid, date) to authenticated;

-- When a card's target date changes (edit form, calendar), its idea follows to the same day.
create or replace function public.content_sync_idea_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.publish_at is not null and new.publish_at is distinct from old.publish_at then
    update public.post_ideas
    set idea_date = (new.publish_at at time zone 'Asia/Kolkata')::date
    where content_id = new.id
      and idea_date is distinct from (new.publish_at at time zone 'Asia/Kolkata')::date;
  end if;
  return null;
end;
$$;

drop trigger if exists content_sync_idea_date on public.content;
create trigger content_sync_idea_date
  after update of publish_at on public.content
  for each row execute function public.content_sync_idea_date();
