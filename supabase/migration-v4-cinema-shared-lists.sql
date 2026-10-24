-- V4: novas tabelas isoladas, sem alterar livros ou colecoes individuais.
create extension if not exists pgcrypto;
create table if not exists public.cinema_shared_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);
create table if not exists public.cinema_shared_members (
 list_id uuid not null references public.cinema_shared_lists(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(list_id,user_id)
);
create table if not exists public.cinema_shared_entries (
 id uuid primary key default gen_random_uuid(),
 list_id uuid not null references public.cinema_shared_lists(id) on delete cascade,
 tmdb_id integer not null,
 media_type text not null check(media_type in ('movie','tv')),
 media jsonb not null,
 status text not null default 'want' check(status in ('want','watching','watched')),
 added_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 unique(list_id,media_type,tmdb_id)
);
create index if not exists cinema_shared_members_user_idx on public.cinema_shared_members(user_id);
create index if not exists cinema_shared_entries_list_idx on public.cinema_shared_entries(list_id);
-- SECURITY DEFINER exists only to check membership without recursive RLS.
create or replace function public.is_cinema_list_member(p_list uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.cinema_shared_members m where m.list_id=p_list and m.user_id=(select auth.uid()));
$$;
revoke all on function public.is_cinema_list_member(uuid) from public;
grant execute on function public.is_cinema_list_member(uuid) to authenticated;
-- Add owner membership atomically on creating a list.
create or replace function public.cinema_list_auto_membership() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.cinema_shared_members(list_id,user_id) values(new.id,new.owner_id);return new;end;
$$;
drop trigger if exists cinema_list_membership on public.cinema_shared_lists;
create trigger cinema_list_membership after insert on public.cinema_shared_lists for each row execute function public.cinema_list_auto_membership();
-- Invite registered account using its email, without exposing auth.users.
create or replace function public.invite_cinema_list_member(p_list uuid,p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
 if not exists(select 1 from public.cinema_shared_lists where id=p_list and owner_id=(select auth.uid())) then
  raise exception 'Somente quem criou a lista pode convidar usuários';
 end if;
 select id into target_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if target_id is null then raise exception 'Conta não encontrada neste site'; end if;
 insert into public.cinema_shared_members(list_id,user_id) values(p_list,target_id) on conflict do nothing;
end;$$;
revoke all on function public.invite_cinema_list_member(uuid,text) from public;
grant execute on function public.invite_cinema_list_member(uuid,text) to authenticated;
alter table public.cinema_shared_lists enable row level security;
alter table public.cinema_shared_members enable row level security;
alter table public.cinema_shared_entries enable row level security;
drop policy if exists cinema_lists_select on public.cinema_shared_lists;
create policy cinema_lists_select on public.cinema_shared_lists for select to authenticated using(public.is_cinema_list_member(id));
drop policy if exists cinema_lists_insert on public.cinema_shared_lists;
create policy cinema_lists_insert on public.cinema_shared_lists for insert to authenticated with check(owner_id=(select auth.uid()));
drop policy if exists cinema_lists_delete on public.cinema_shared_lists;
create policy cinema_lists_delete on public.cinema_shared_lists for delete to authenticated using(owner_id=(select auth.uid()));
drop policy if exists cinema_members_select on public.cinema_shared_members;
create policy cinema_members_select on public.cinema_shared_members for select to authenticated using(public.is_cinema_list_member(list_id));
drop policy if exists cinema_entries_select on public.cinema_shared_entries;
create policy cinema_entries_select on public.cinema_shared_entries for select to authenticated using(public.is_cinema_list_member(list_id));
drop policy if exists cinema_entries_insert on public.cinema_shared_entries;
create policy cinema_entries_insert on public.cinema_shared_entries for insert to authenticated with check(public.is_cinema_list_member(list_id) and added_by=(select auth.uid()));
drop policy if exists cinema_entries_update on public.cinema_shared_entries;
create policy cinema_entries_update on public.cinema_shared_entries for update to authenticated using(public.is_cinema_list_member(list_id)) with check(public.is_cinema_list_member(list_id));
drop policy if exists cinema_entries_delete on public.cinema_shared_entries;
create policy cinema_entries_delete on public.cinema_shared_entries for delete to authenticated using(public.is_cinema_list_member(list_id));
grant select,insert,delete on public.cinema_shared_lists to authenticated;
grant select on public.cinema_shared_members to authenticated;
grant select,insert,update,delete on public.cinema_shared_entries to authenticated;
