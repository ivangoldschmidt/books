create extension if not exists pgcrypto;

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_key text not null,
  status text not null check (status in ('read','reading','want')),
  read_count integer not null default 1 check (read_count >= 1),
  book jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, book_key)
);

alter table public.library_items enable row level security;
create policy "Usuário vê a própria biblioteca" on public.library_items for select using (auth.uid() = user_id);
create policy "Usuário adiciona à própria biblioteca" on public.library_items for insert with check (auth.uid() = user_id);
create policy "Usuário atualiza a própria biblioteca" on public.library_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Usuário remove da própria biblioteca" on public.library_items for delete using (auth.uid() = user_id);
