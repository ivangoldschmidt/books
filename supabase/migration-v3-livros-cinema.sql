-- MINHA BIBLIOTECA V3: migração aditiva. Executar UMA VEZ no Supabase existente.
-- Não apaga ou altera livros nem filmes salvos. Recomenda-se exportar backup antes de executar.
-- Adiciona somente comentários privados e partilha de livros.
create extension if not exists pgcrypto;

alter table public.library_items add column if not exists private_comment text not null default '';
-- Garante privacidade real no banco, e não apenas no frontend.
alter table public.library_items enable row level security;
-- As políticas abaixo só são adicionadas se o projeto original ainda não as tiver.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='library_items' and policyname='v3 book select own') then
    create policy "v3 book select own" on public.library_items for select to authenticated using (auth.uid()=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='library_items' and policyname='v3 book insert own') then
    create policy "v3 book insert own" on public.library_items for insert to authenticated with check (auth.uid()=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='library_items' and policyname='v3 book update own') then
    create policy "v3 book update own" on public.library_items for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='library_items' and policyname='v3 book delete own') then
    create policy "v3 book delete own" on public.library_items for delete to authenticated using(auth.uid()=user_id);
  end if;
end $$;
grant select,insert,update,delete on public.library_items to authenticated;

-- O histórico dos livros também deve continuar privado.
alter table if exists public.reading_history enable row level security;
do $$ begin
  if to_regclass('public.reading_history') is not null and not exists (select 1 from pg_policies where schemaname='public' and tablename='reading_history' and policyname='v3 history own') then
    create policy "v3 history own" on public.reading_history for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
  end if;
end $$;
do $$ begin
 if to_regclass('public.reading_history') is not null then grant select,insert,update,delete on public.reading_history to authenticated; end if;
end $$;

create table if not exists public.book_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  book jsonb not null,
  message text not null default '',
  status text not null default 'pending' check(status in ('pending','added','dismissed')),
  created_at timestamptz not null default now(),
  constraint book_shares_different_users check (sender_id <> recipient_id)
);
create index if not exists book_shares_recipient_idx on public.book_shares(recipient_id,created_at desc);
alter table public.book_shares enable row level security;
drop policy if exists "v3 book shares own select" on public.book_shares;
create policy "v3 book shares own select" on public.book_shares for select to authenticated using (auth.uid()=sender_id or auth.uid()=recipient_id);
drop policy if exists "v3 book shares recipient update" on public.book_shares;
create policy "v3 book shares recipient update" on public.book_shares for update to authenticated using (auth.uid()=recipient_id) with check(auth.uid()=recipient_id);
revoke all on public.book_shares from anon,authenticated;
grant select on public.book_shares to authenticated;
grant update(status) on public.book_shares to authenticated;

create or replace function public.send_book_share(recipient_email text, book_snapshot jsonb, share_message text default '')
returns uuid language plpgsql security definer set search_path = public,auth
as $$
declare current_user_id uuid:=auth.uid();target_user_id uuid;share_id uuid;
begin
  if current_user_id is null then raise exception 'Faça login para compartilhar.';end if;
  if recipient_email is null or length(trim(recipient_email))=0 then raise exception 'Informe um e-mail válido.';end if;
  if book_snapshot is null or coalesce(book_snapshot->>'title','')='' or coalesce(book_snapshot->>'source','')='' or coalesce(book_snapshot->>'sourceId','')='' then
    raise exception 'Os dados do livro são inválidos.';
  end if;
  select u.id into target_user_id from auth.users u where lower(u.email)=lower(trim(recipient_email)) limit 1;
  if target_user_id is null then raise exception 'Conta de destino não encontrada.';end if;
  if target_user_id=current_user_id then raise exception 'Não é possível compartilhar consigo mesmo.';end if;
  insert into public.book_shares(sender_id,recipient_id,book,message)
  values (current_user_id,target_user_id,book_snapshot,left(coalesce(share_message,''),500)) returning id into share_id;
  return share_id;
end;
$$;
revoke all on function public.send_book_share(text,jsonb,text) from public,anon;
grant execute on function public.send_book_share(text,jsonb,text) to authenticated;
-- Nova condição “Assistindo” também para filmes e séries, equivalente a “Lendo agora”.
alter table public.media_library_items drop constraint if exists media_library_items_status_check;
alter table public.media_library_items add constraint media_library_items_status_check check (status in ('want','watching','watched'));
-- Os registros e classificações preexistentes são preservados.
