-- Execute uma vez no SQL Editor do Supabase.
alter table public.library_items alter column read_count set default 0;
alter table public.library_items drop constraint if exists library_items_read_count_check;
alter table public.library_items add constraint library_items_read_count_check check (read_count >= 0);
