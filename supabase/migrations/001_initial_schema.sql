-- Chat Real Time: esquema inicial seguro para Supabase
-- Ejecuta este archivo completo en SQL Editor de Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._]{3,30}$'),
  full_name text not null check (char_length(full_name) between 1 and 80),
  avatar_url text,
  status text check (status is null or char_length(status) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct', 'group')),
  title text,
  avatar_url text,
  direct_key text unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((type = 'direct' and direct_key is not null) or type = 'group')
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  message_type text not null default 'text' check (message_type in ('text', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists conversation_members_user_idx on public.conversation_members(user_id, conversation_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index if not exists conversations_updated_idx on public.conversations(updated_at desc);
create index if not exists profiles_name_idx on public.profiles(lower(full_name));

-- Permisos base; las políticas RLS siguen decidiendo qué filas puede usar cada sesión.
grant select, update on public.profiles to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant usage, select on sequence public.messages_id_seq to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_name text;
begin
  requested_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9._]', '', 'g'));
  if char_length(requested_username) < 3 then
    requested_username := 'user_' || left(replace(new.id::text, '-', ''), 10);
  end if;

  requested_name := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if requested_name = '' then
    requested_name := split_part(coalesce(new.email, 'Usuario'), '@', 1);
  end if;

  insert into public.profiles (id, username, full_name)
  values (new.id, requested_username, left(requested_name, 80));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at before update on public.messages
for each row execute procedure public.set_updated_at();

create or replace function public.bump_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
after insert on public.messages
for each row execute procedure public.bump_conversation_on_message();

create or replace function public.is_conversation_member(conversation_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conversation_uuid and user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
on public.profiles for select to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Members can view conversations" on public.conversations;
create policy "Members can view conversations"
on public.conversations for select to authenticated
using (public.is_conversation_member(id));

drop policy if exists "Members can view memberships" on public.conversation_members;
create policy "Members can view memberships"
on public.conversation_members for select to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists "Members can view messages" on public.messages;
create policy "Members can view messages"
on public.messages for select to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "Senders can update their messages" on public.messages;
create policy "Senders can update their messages"
on public.messages for update to authenticated
using (sender_id = (select auth.uid()))
with check (sender_id = (select auth.uid()));

drop policy if exists "Senders can delete their messages" on public.messages;
create policy "Senders can delete their messages"
on public.messages for delete to authenticated
using (sender_id = (select auth.uid()));

create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  key_value text;
  conversation_uuid uuid;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if other_user_id is null or other_user_id = current_user_id then
    raise exception 'Selecciona a otro usuario.';
  end if;
  if not exists (select 1 from public.profiles where id = other_user_id) then
    raise exception 'El usuario no existe.';
  end if;

  key_value := least(current_user_id::text, other_user_id::text) || ':' || greatest(current_user_id::text, other_user_id::text);

  insert into public.conversations (type, direct_key, created_by)
  values ('direct', key_value, current_user_id)
  on conflict (direct_key) do update set direct_key = excluded.direct_key
  returning id into conversation_uuid;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (conversation_uuid, current_user_id, 'owner'),
    (conversation_uuid, other_user_id, 'member')
  on conflict (conversation_id, user_id) do nothing;

  return conversation_uuid;
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(conversation_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = conversation_uuid and user_id = auth.uid();
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.get_my_conversations()
returns table (
  id uuid,
  type text,
  title text,
  avatar_url text,
  updated_at timestamptz,
  other_user_id uuid,
  other_user_name text,
  other_user_username text,
  other_user_avatar text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.type,
    c.title,
    c.avatar_url,
    c.updated_at,
    other_member.user_id as other_user_id,
    other_profile.full_name as other_user_name,
    other_profile.username as other_user_username,
    other_profile.avatar_url as other_user_avatar,
    latest.body as last_message,
    latest.created_at as last_message_at,
    coalesce((
      select count(*)
      from public.messages unread
      where unread.conversation_id = c.id
        and unread.created_at > mine.last_read_at
        and unread.sender_id <> auth.uid()
        and unread.deleted_at is null
    ), 0)::bigint as unread_count
  from public.conversations c
  join public.conversation_members mine
    on mine.conversation_id = c.id and mine.user_id = auth.uid()
  left join public.conversation_members other_member
    on other_member.conversation_id = c.id and other_member.user_id <> auth.uid() and c.type = 'direct'
  left join public.profiles other_profile on other_profile.id = other_member.user_id
  left join lateral (
    select m.body, m.created_at
    from public.messages m
    where m.conversation_id = c.id and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) latest on true
  order by coalesce(latest.created_at, c.updated_at) desc;
$$;

revoke all on function public.get_my_conversations() from public;
grant execute on function public.get_my_conversations() to authenticated;

-- Bucket público para fotos de perfil; cada usuario solo modifica su carpeta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Activa mensajes para Supabase Realtime sin fallar si ya estaban agregados.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
