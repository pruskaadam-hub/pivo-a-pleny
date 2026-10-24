-- Průvodce: každá kategorie má sekci jen pro členy Klubu (text spravovaný v administraci)
create table if not exists public.guide_extras (
  slug       text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  sort       integer not null default 0,
  title      text not null check (char_length(title) <= 140),
  teaser     text[] not null default '{}',      -- co v sekci je (vidí i nečlen)
  body       text check (char_length(body) <= 40000),   -- Markdown, jen pro členy
  access     text not null default 'klub' references public.plans (slug) on update cascade,
  updated_at timestamptz not null default now()
);
alter table public.guide_extras enable row level security;
drop policy if exists "admins all" on public.guide_extras;
create policy "admins all" on public.guide_extras for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.guide_extras from anon;
drop trigger if exists guide_extras_touch on public.guide_extras;
create trigger guide_extras_touch before update on public.guide_extras for each row execute function public.touch();

create or replace function public.guide_extras_list()
returns table (slug text, title text, teaser text[], body text, locked boolean, access text)
language sql stable security definer set search_path = public as $$
  select g.slug, g.title, g.teaser,
         case when p.sort <= public.member_level() then g.body end,
         p.sort > public.member_level(), g.access
  from guide_extras g join plans p on p.slug = g.access
  order by g.sort;
$$;
revoke execute on function public.guide_extras_list() from public;
grant execute on function public.guide_extras_list() to anon, authenticated;
