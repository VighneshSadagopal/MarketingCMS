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

-- X copy is limited to 200 words.
create or replace function public.word_count(t text)
returns integer
language sql
immutable
as $$
  select case
    when t is null or btrim(t) = '' then 0
    else array_length(regexp_split_to_array(btrim(t), '\s+'), 1)
  end;
$$;

do $$ begin
  alter table public.content
    add constraint content_copy_x_words check (public.word_count(copy_x) <= 200);
exception when duplicate_object then null; end $$;

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
