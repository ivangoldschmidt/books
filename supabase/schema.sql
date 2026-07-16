create extension if not exists pgcrypto;
create table if not exists public.library_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,book_key text not null,status text not null check(status in('read','reading','want')),read_count integer not null default 0 check(read_count>=0),rating integer check(rating between 1 and 5),is_favorite boolean not null default false,book jsonb not null,finished_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,book_key));
alter table public.library_items add column if not exists rating integer check(rating between 1 and 5);alter table public.library_items add column if not exists finished_at timestamptz;alter table public.library_items add column if not exists is_favorite boolean not null default false;
create table if not exists public.reading_history(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,library_item_id uuid references public.library_items(id) on delete set null,event_type text not null check(event_type in('finished','reread')),occurred_at timestamptz not null default now());
do $$ begin
 create policy "own library select" on public.library_items for select using(auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own library insert" on public.library_items for insert with check(auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own library update" on public.library_items for update using(auth.uid()=user_id) with check(auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own library delete" on public.library_items for delete using(auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own history all" on public.reading_history for all using(auth.uid()=user_id) with check(auth.uid()=user_id); exception when duplicate_object then null; end $$;


-- Migração para instalações existentes: novos livros começam com zero leituras.
alter table public.library_items alter column read_count set default 0;
alter table public.library_items drop constraint if exists library_items_read_count_check;
alter table public.library_items add constraint library_items_read_count_check check (read_count >= 0);
