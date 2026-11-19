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

-- ---------------------------------------------------------------------------
-- Team roles: Content manager and Designer (the owner assigns them).
-- Designers can't create posts or ideas; content managers can request a
-- graphic, which assigns a designer to the post.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.team_role as enum ('content_manager', 'designer');
exception when duplicate_object then null; end $$;

alter table public.profiles add column if not exists team_role public.team_role not null default 'content_manager';
alter table public.allowed_emails add column if not exists team_role public.team_role not null default 'content_manager';

create or replace function public.is_designer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and team_role = 'designer' and role <> 'owner');
$$;

grant execute on function public.is_designer() to authenticated;

-- People can't change their own role or team role.
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and team_role = (select p.team_role from public.profiles p where p.id = auth.uid())
  );

-- Designers can't create posts, and so can't add calendar ideas (each idea creates a post).
drop policy if exists "team creates content" on public.content;
create policy "team creates content" on public.content
  for insert to authenticated with check (author_id = auth.uid() and not public.is_designer());

drop policy if exists "team adds ideas" on public.post_ideas;
create policy "team adds ideas" on public.post_ideas
  for insert to authenticated with check (created_by = auth.uid() and not public.is_designer());

-- New accounts take their role and team role from the allowlist.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role, team_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((select a.role from public.allowed_emails a where a.email = lower(new.email)), 'member'),
    coalesce((select a.team_role from public.allowed_emails a where a.email = lower(new.email)), 'content_manager')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Owner's team list now includes each person's team role.
drop function if exists public.team_members();
create or replace function public.team_members()
returns table (email text, role public.user_role, team_role public.team_role, added_at timestamptz, joined boolean,
               user_id uuid, full_name text, avatar_url text)
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
    select a.email, a.role, a.team_role, a.created_at, u.id is not null, u.id, p.full_name, p.avatar_url
    from public.allowed_emails a
    left join auth.users u on lower(u.email) = a.email
    left join public.profiles p on p.id = u.id
    order by (a.role = 'owner') desc, a.created_at;
end;
$$;

grant execute on function public.team_members() to authenticated;

-- Owner changes someone's team role (on the allowlist and, once they've signed in, their profile).
create or replace function public.set_team_role(p_email text, p_team_role public.team_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if not public.is_owner() then
    raise exception 'Only the owner can change roles.' using errcode = '42501';
  end if;
  if exists (select 1 from public.allowed_emails where email = v_email and role = 'owner') then
    raise exception 'The owner''s role can''t be changed.' using errcode = '42501';
  end if;
  update public.allowed_emails set team_role = p_team_role where email = v_email;
  if not found then
    raise exception 'That email isn''t on the team list.' using errcode = 'P0002';
  end if;
  update public.profiles set team_role = p_team_role
  where id in (select id from auth.users where lower(email) = v_email);
end;
$$;

grant execute on function public.set_team_role(text, public.team_role) to authenticated;

-- Graphic requests on a post.
alter table public.content add column if not exists designer_id uuid references public.profiles (id) on delete set null;
alter table public.content add column if not exists graphic_status text;
alter table public.content add column if not exists graphic_note text;
alter table public.content add column if not exists graphic_requested_at timestamptz;
alter table public.content drop constraint if exists content_graphic_status_check;
alter table public.content add constraint content_graphic_status_check
  check (graphic_status is null or graphic_status in ('requested', 'delivered'));
alter table public.content drop constraint if exists content_graphic_note_len;
alter table public.content add constraint content_graphic_note_len
  check (graphic_note is null or char_length(graphic_note) <= 1000);

create index if not exists content_designer_idx on public.content (designer_id) where designer_id is not null;

-- Only designers can be put on a graphic request; only content managers and the owner can request one.
create or replace function public.content_graphic_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.graphic_status = 'requested'
     and (tg_op = 'INSERT' or old.graphic_status is distinct from 'requested' or old.designer_id is distinct from new.designer_id) then
    if public.is_designer() then
      raise exception 'Only content managers can request a graphic.' using errcode = '42501';
    end if;
    if new.designer_id is null
       or not exists (select 1 from public.profiles where id = new.designer_id and team_role = 'designer') then
      raise exception 'Pick a designer for the graphic request.' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' or old.graphic_status is distinct from 'requested' then
      new.graphic_requested_at := now();
    end if;
  end if;
  if new.graphic_status is null then
    new.designer_id := null;
    new.graphic_note := null;
    new.graphic_requested_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists content_graphic_rules on public.content;
create trigger content_graphic_rules
  before insert or update of graphic_status, designer_id on public.content
  for each row execute function public.content_graphic_rules();

-- Log graphic requests and deliveries in the post's activity.
create or replace function public.content_log_graphic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_old text := case when tg_op = 'UPDATE' then old.graphic_status end;
  v_old_designer uuid := case when tg_op = 'UPDATE' then old.designer_id end;
begin
  if new.graphic_status = 'requested' and (v_old is distinct from 'requested' or v_old_designer is distinct from new.designer_id) then
    select coalesce(full_name, 'a designer') into v_name from public.profiles where id = new.designer_id;
    insert into public.content_comments (content_id, author_id, kind, body)
    values (new.id, auth.uid(), 'status',
            left('requested a graphic from ' || coalesce(v_name, 'a designer')
                 || coalesce(': ' || nullif(btrim(new.graphic_note), ''), ''), 2000));
  elsif new.graphic_status = 'delivered' and v_old is distinct from 'delivered' then
    insert into public.content_comments (content_id, author_id, kind, body)
    values (new.id, auth.uid(), 'status', 'delivered the graphic');
  elsif new.graphic_status is null and v_old is not null then
    insert into public.content_comments (content_id, author_id, kind, body)
    values (new.id, auth.uid(), 'status', 'cancelled the graphic request');
  end if;
  return null;
end;
$$;

drop trigger if exists content_log_graphic on public.content;
create trigger content_log_graphic
  after insert or update of graphic_status, designer_id on public.content
  for each row execute function public.content_log_graphic();

-- Friendly error for designers trying to add a calendar idea.
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
  if public.is_designer() then
    raise exception 'Designers can''t add post ideas.' using errcode = '42501';
  end if;

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
-- Blogs: kept in the content table (so the board, review, comments, deadlines
-- and graphic requests all work) but as their own kind, never in a campaign.
-- ---------------------------------------------------------------------------
alter table public.content add column if not exists kind text not null default 'post';
alter table public.content add column if not exists body text;
alter table public.content add column if not exists keywords text;

alter table public.content drop constraint if exists content_kind_check;
alter table public.content add constraint content_kind_check check (kind in ('post', 'blog'));

alter table public.content drop constraint if exists content_blog_no_campaign;
alter table public.content add constraint content_blog_no_campaign
  check (kind = 'post' or (campaign_id is null and platforms = '{}'));

create index if not exists content_kind_status_idx on public.content (kind, status, position);

-- ---------------------------------------------------------------------------
-- Content approver: same as a content manager, but can also move cards into
-- Ready for schedule and Done / Posted (like the owner).
-- Run the ALTER TYPE on its own first: a new enum value must be committed before use.
-- ---------------------------------------------------------------------------
alter type public.team_role add value if not exists 'content_approver';

create or replace function public.can_approve()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'owner' or team_role::text = 'content_approver')
  );
end;
$$;

grant execute on function public.can_approve() to authenticated;

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
     and not public.can_approve() then
    raise exception 'Only the owner or a content approver can move content to %', new.status
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comment images: up to 4 per comment (stored in content-images under comments/).
-- A comment can be images only, so the text may be empty when images are attached.
-- ---------------------------------------------------------------------------
alter table public.content_comments add column if not exists images text[] not null default '{}';

alter table public.content_comments drop constraint if exists content_comments_body_check;
alter table public.content_comments drop constraint if exists content_comments_body_or_images;
alter table public.content_comments add constraint content_comments_body_or_images check (
  char_length(body) <= 2000
  and cardinality(images) <= 4
  and (char_length(btrim(body)) >= 1 or cardinality(images) >= 1)
);

-- ---------------------------------------------------------------------------
-- X first reply: an optional reply the same account posts under its own X post
-- (the details that don't fit in 280 characters). No character limit.
-- ---------------------------------------------------------------------------
alter table public.content add column if not exists copy_x_reply text;

-- ---------------------------------------------------------------------------
-- Public marketing calendar (/public/calendar): anyone with the link can view it,
-- signed in or not. It returns only titles, dates, campaigns and platforms —
-- no briefs, copy, images, people, statuses or comments. Blogs aren't included.
-- At most ~2 months per call.
-- ---------------------------------------------------------------------------
create or replace function public.public_calendar(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when p_to < p_from or p_to - p_from > 62 then null else jsonb_build_object(
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'publish_at', c.publish_at,
        'campaign_id', c.campaign_id, 'platforms', c.platforms) order by c.publish_at)
      from public.content c
      where c.kind = 'post'
        and c.publish_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
        and c.publish_at < ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
    ), '[]'::jsonb),
    'ideas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'idea_date', i.idea_date, 'text', i.text,
        'campaign_id', i.campaign_id, 'platforms', i.platforms, 'content_id', i.content_id) order by i.idea_date)
      from public.post_ideas i
      where i.idea_date between p_from and p_to
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name, 'color', k.color))
      from public.campaigns k
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.public_calendar(date, date) from public;
grant execute on function public.public_calendar(date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notifications: in-app bell + browser push. Nobody is notified about their own actions.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  content_id uuid references public.content (id) on delete cascade,
  kind text not null check (kind in ('assigned', 'review_requested', 'changes_suggested', 'comment',
                                     'graphic_requested', 'graphic_delivered', 'approved', 'deadline')),
  title text not null,
  body text,
  count int not null default 1,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create unique index if not exists notifications_dedupe_idx on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;
drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own notifications delete" on public.notifications;
create policy "own notifications delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Live updates for the bell.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- Which kinds each person has turned off.
create table if not exists public.notification_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  muted text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
drop policy if exists "own notification settings" on public.notification_settings;
create policy "own notification settings" on public.notification_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Browser push subscriptions (one per browser/device).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions read" on public.push_subscriptions;
create policy "own push subscriptions read" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "own push subscriptions delete" on public.push_subscriptions;
create policy "own push subscriptions delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- Saving a subscription moves the browser to the signed-in person (a shared browser re-subscribes).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
end; $$;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- The sentence shown in the bell and in push messages.
create or replace function public.notification_text(p_kind text, p_actor text, p_title text, p_body text, p_count int)
returns text language sql immutable as $$
  select case p_kind
    when 'assigned' then coalesce(p_actor, 'Someone') || ' assigned you "' || p_title || '"'
    when 'review_requested' then coalesce(p_actor, 'Someone') || ' sent "' || p_title || '" for your review'
    when 'changes_suggested' then coalesce(p_actor, 'Someone') || ' suggested changes on "' || p_title || '"'
      || coalesce(': ' || nullif(p_body, ''), '')
    when 'comment' then case when p_count > 1
      then p_count || ' new comments on "' || p_title || '"'
      else coalesce(p_actor, 'Someone') || ' commented on "' || p_title || '"' || coalesce(': ' || nullif(p_body, ''), '') end
    when 'graphic_requested' then coalesce(p_actor, 'Someone') || ' asked you for a graphic for "' || p_title || '"'
      || coalesce(': ' || nullif(p_body, ''), '')
    when 'graphic_delivered' then coalesce(p_actor, 'The designer') || ' delivered the graphic for "' || p_title || '"'
    when 'approved' then coalesce(p_actor, 'Someone') || ' approved "' || p_title || '" for scheduling'
    when 'deadline' then '"' || p_title || '": ' || coalesce(p_body, 'deadline coming up')
    else p_title end;
$$;

-- Create (or, for comments, fold into) a notification for one person.
create or replace function public.notify(p_user uuid, p_actor uuid, p_content uuid, p_kind text, p_body text,
                                         p_dedupe text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_id uuid;
begin
  if p_user is null or p_user = p_actor then return; end if;
  if not exists (select 1 from public.profiles where id = p_user) then return; end if;
  if exists (select 1 from public.notification_settings where user_id = p_user and p_kind = any (muted)) then return; end if;
  select title into v_title from public.content where id = p_content;
  if v_title is null then return; end if;

  -- Several comments on one post within 30 minutes become one notification (no extra push).
  if p_kind = 'comment' then
    select id into v_id from public.notifications
    where user_id = p_user and content_id = p_content and kind = 'comment' and read_at is null
      and created_at > now() - interval '30 minutes'
    order by created_at desc limit 1;
    if v_id is not null then
      update public.notifications
      set count = count + 1, body = left(p_body, 200), actor_id = p_actor, created_at = now()
      where id = v_id;
      return;
    end if;
  end if;

  insert into public.notifications (user_id, actor_id, content_id, kind, title, body, dedupe_key)
  values (p_user, p_actor, p_content, p_kind, left(v_title, 200), left(p_body, 200), p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end; $$;
revoke all on function public.notify(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

-- Posts and blogs: assignment, review, approval and graphic requests.
create or replace function public.content_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.assignee_id, v_actor, new.id, 'assigned', null);
    if new.status = 'ready_for_review' then
      perform public.notify(new.reviewer_id, v_actor, new.id, 'review_requested', null);
    end if;
    if new.graphic_status = 'requested' then
      perform public.notify(new.designer_id, v_actor, new.id, 'graphic_requested', new.graphic_note);
    end if;
    return null;
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    perform public.notify(new.assignee_id, v_actor, new.id, 'assigned', null);
  end if;
  if new.status = 'ready_for_review'
     and (old.status is distinct from 'ready_for_review' or new.reviewer_id is distinct from old.reviewer_id) then
    perform public.notify(new.reviewer_id, v_actor, new.id, 'review_requested', null);
  end if;
  if new.status = 'ready_for_schedule' and old.status is distinct from 'ready_for_schedule' then
    perform public.notify(new.assignee_id, v_actor, new.id, 'approved', null);
  end if;
  if new.graphic_status = 'requested'
     and (old.graphic_status is distinct from 'requested' or new.designer_id is distinct from old.designer_id) then
    perform public.notify(new.designer_id, v_actor, new.id, 'graphic_requested', new.graphic_note);
  end if;
  if new.graphic_status = 'delivered' and old.graphic_status is distinct from 'delivered' then
    perform public.notify(new.assignee_id, v_actor, new.id, 'graphic_delivered', null);
    if new.author_id is distinct from new.assignee_id then
      perform public.notify(new.author_id, v_actor, new.id, 'graphic_delivered', null);
    end if;
  end if;
  return null;
end; $$;

drop trigger if exists content_notify on public.content;
create trigger content_notify after insert or update on public.content
  for each row execute function public.content_notify();

-- Comments and change requests.
create or replace function public.comment_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_body text := nullif(btrim(new.body), '');
  r uuid;
begin
  if new.kind = 'status' then return null; end if;
  select assignee_id, reviewer_id, author_id into c from public.content where id = new.content_id;
  if not found then return null; end if;
  if v_body is null and cardinality(new.images) > 0 then v_body := '(image)'; end if;

  if new.kind = 'change_request' then
    for r in select distinct x from unnest(array[c.assignee_id, c.author_id]) as x where x is not null loop
      perform public.notify(r, new.author_id, new.content_id, 'changes_suggested', v_body);
    end loop;
  else
    for r in select distinct x from unnest(array[c.assignee_id, c.reviewer_id, c.author_id]) as x where x is not null loop
      perform public.notify(r, new.author_id, new.content_id, 'comment', v_body);
    end loop;
  end if;
  return null;
end; $$;

drop trigger if exists comment_notify on public.content_comments;
create trigger comment_notify after insert on public.content_comments
  for each row execute function public.comment_notify();

-- Daily deadline reminders (09:00 IST): review due within a day or overdue, scheduling due or overdue.
-- At most one reminder per post per day. Also clears out old notifications.
create or replace function public.notify_deadlines()
returns void language plpgsql security definer set search_path = public as $$
declare
  p record;
  v_due timestamptz;
begin
  for p in
    select id, assignee_id, reviewer_id, status, publish_at from public.content
    where publish_at is not null and status not in ('ready_for_schedule', 'done')
      and publish_at > now() - interval '7 days'
  loop
    if p.status = 'ready_for_review' then
      v_due := p.publish_at - interval '12 hours';
      if v_due < now() + interval '24 hours' then
        perform public.notify(coalesce(p.reviewer_id, p.assignee_id), null, p.id, 'deadline',
          case when v_due < now() then 'scheduling is overdue'
               else 'needs approving by ' || to_char(v_due at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') || ' IST' end,
          'deadline:' || p.id || ':' || current_date);
      end if;
    else
      v_due := p.publish_at - interval '48 hours';
      if v_due < now() + interval '24 hours' then
        perform public.notify(p.assignee_id, null, p.id, 'deadline',
          case when v_due < now() then 'review is overdue'
               else 'should be in Ready for review by ' || to_char(v_due at time zone 'Asia/Kolkata', 'DD Mon, HH24:MI') || ' IST' end,
          'deadline:' || p.id || ':' || current_date);
      end if;
    end if;
  end loop;

  delete from public.notifications
  where (read_at is not null and created_at < now() - interval '60 days')
     or created_at < now() - interval '120 days';
end; $$;

select cron.schedule('notify-deadlines', '30 3 * * *', 'select public.notify_deadlines()');

-- Browser push: each new notification is posted to the app's /api/push route, which sends it to the
-- person's browsers. Needs the shared secret in Vault (name 'push_webhook_secret') and the same
-- value as PUSH_WEBHOOK_SECRET in Vercel. Without it, nothing is sent and the bell still works.
create or replace function public.notification_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
  v_subs jsonb;
  v_actor text;
  v_kind text;
  v_path text;
begin
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys',
           jsonb_build_object('p256dh', p256dh, 'auth', auth))), '[]'::jsonb)
  into v_subs from public.push_subscriptions where user_id = new.user_id;
  if jsonb_array_length(v_subs) = 0 then return null; end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret' limit 1;
  if v_secret is null then return null; end if;

  select full_name into v_actor from public.profiles where id = new.actor_id;
  select kind into v_kind from public.content where id = new.content_id;
  v_path := case when v_kind = 'blog' then '/blogs/' else '/content/' end || new.content_id
            || case when new.kind in ('comment', 'changes_suggested') then '#activity' else '' end;

  perform net.http_post(
    url := 'https://marketing-cms-beryl.vercel.app/api/push',
    body := jsonb_build_object(
      'title', 'DrupalAsia Marketing CMS',
      'body', public.notification_text(new.kind, split_part(v_actor, ' ', 1), new.title, new.body, new.count),
      'url', v_path,
      'tag', new.id,
      'subscriptions', v_subs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000);
  return null;
exception when others then
  return null; -- a push problem must never block the notification itself
end; $$;

drop trigger if exists notification_push on public.notifications;
create trigger notification_push after insert on public.notifications
  for each row execute function public.notification_push();

-- /api/push reports browsers that have unsubscribed (gone), so they're removed.
create or replace function public.prune_push_subscriptions(p_secret text, p_endpoints text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from
     (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret' limit 1) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end; $$;
revoke all on function public.prune_push_subscriptions(text, text[]) from public;
grant execute on function public.prune_push_subscriptions(text, text[]) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- UTM campaign name per campaign (e.g. dac27_speaker_promotion). Posts in the campaign
-- get utm_campaign set to it on their DrupalAsia links when saved.
-- ---------------------------------------------------------------------------
alter table public.campaigns add column if not exists utm_campaign text;
alter table public.campaigns drop constraint if exists campaigns_utm_campaign_check;
alter table public.campaigns add constraint campaigns_utm_campaign_check
  check (utm_campaign is null or utm_campaign ~ '^[a-z0-9][a-z0-9_-]{0,99}$');
