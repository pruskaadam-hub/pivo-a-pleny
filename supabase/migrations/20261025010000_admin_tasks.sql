-- Administrace: úkoly týmu (jen pro adminy)
create table if not exists public.admin_tasks (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  done_at     timestamptz,
  cat         text not null default 'tech' check (cat in ('start', 'tech', 'legal', 'obsah', 'ux', 'strat')),
  priority    text not null default 'm' check (priority in ('h', 'm', 'l')),
  status      text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  title       text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  owner       text not null default '' check (char_length(owner) <= 80),
  sort        integer not null default 0
);
alter table public.admin_tasks enable row level security;
drop policy if exists "admins all" on public.admin_tasks;
create policy "admins all" on public.admin_tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.admin_tasks from anon;
