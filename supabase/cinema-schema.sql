-- Migração aditiva da seção Filmes & Séries.
-- Não altera nem apaga nenhuma tabela ou dado da Minha Estante.
create extension if not exists pgcrypto;

create table if not exists public.media_library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  status text not null default 'want' check (status in ('want', 'watched')),
  is_favorite boolean not null default false,
  rating integer check (rating between 1 and 10),
  private_comment text not null default '',
  media jsonb not null,
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);

create table if not exists public.media_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  media jsonb not null,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'added', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint media_shares_different_users check (sender_id <> recipient_id)
);

create index if not exists media_library_items_user_updated_idx on public.media_library_items(user_id, updated_at desc);
create index if not exists media_shares_recipient_created_idx on public.media_shares(recipient_id, created_at desc);

alter table public.media_library_items enable row level security;
alter table public.media_shares enable row level security;

-- Direitos de tabela: as políticas RLS continuam a restringir cada linha.
grant select, insert, update, delete on public.media_library_items to authenticated;
grant select on public.media_shares to authenticated;

-- As notas privadas pertencem à linha de cada utilizador e nunca são incluídas no snapshot partilhado.
drop policy if exists "media items select own" on public.media_library_items;
create policy "media items select own" on public.media_library_items for select to authenticated using (auth.uid() = user_id);
drop policy if exists "media items insert own" on public.media_library_items;
create policy "media items insert own" on public.media_library_items for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "media items update own" on public.media_library_items;
create policy "media items update own" on public.media_library_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "media items delete own" on public.media_library_items;
create policy "media items delete own" on public.media_library_items for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "media shares select sender or recipient" on public.media_shares;
create policy "media shares select sender or recipient" on public.media_shares for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "media shares recipient updates status" on public.media_shares;
create policy "media shares recipient updates status" on public.media_shares for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
-- Não há INSERT direto: partilhas são criadas pela função verificada abaixo.
revoke insert, update on public.media_shares from anon, authenticated;
grant update (status) on public.media_shares to authenticated;

create or replace function public.send_media_share(recipient_email text, media_snapshot jsonb, share_message text default '')
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  target_user_id uuid;
  share_id uuid;
begin
  if current_user_id is null then
    raise exception 'É necessário iniciar sessão para partilhar um título.';
  end if;
  if recipient_email is null or length(trim(recipient_email)) = 0 then
    raise exception 'Informe o e-mail da conta que vai receber o título.';
  end if;
  if media_snapshot is null or coalesce(media_snapshot->>'id', '') = '' or coalesce(media_snapshot->>'mediaType', '') not in ('movie', 'tv') then
    raise exception 'Os dados do filme ou série são inválidos.';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(trim(recipient_email))
  limit 1;

  if target_user_id is null then
    raise exception 'Não foi encontrada uma conta com esse e-mail.';
  end if;
  if target_user_id = current_user_id then
    raise exception 'Escolha a outra conta; não é possível partilhar consigo próprio.';
  end if;

  insert into public.media_shares(sender_id, recipient_id, media, message)
  values (current_user_id, target_user_id, media_snapshot, left(coalesce(share_message, ''), 500))
  returning id into share_id;
  return share_id;
end;
$$;

revoke all on function public.send_media_share(text, jsonb, text) from public, anon;
grant execute on function public.send_media_share(text, jsonb, text) to authenticated;
