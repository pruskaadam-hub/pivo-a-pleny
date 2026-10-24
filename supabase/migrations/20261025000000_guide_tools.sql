-- Průvodce: nástroje pro členy Klubu (uložená data) a „týden po týdnu“
-- Obsah týdnů a textů pro členy se nahrává zvlášť (není ve veřejném repozitáři).

-- 1) Uložená data nástrojů (kalkulačka, checklisty, otázky, směny, check-in…)
create table if not exists public.member_tool_data (
  email      citext not null,
  key        text not null check (key ~ '^[a-z0-9-]{1,40}$'),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (email, key)
);
alter table public.member_tool_data enable row level security;
drop policy if exists "admins all" on public.member_tool_data;
create policy "admins all" on public.member_tool_data for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.member_tool_data from anon;

create or replace function public.member_tool_get(p_keys text[])
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null or public.member_level() < 1 then return '{}'::jsonb; end if;
  return coalesce((select jsonb_object_agg(key, data) from member_tool_data where email = v_email and key = any(p_keys)), '{}'::jsonb);
end $$;

create or replace function public.member_tool_save(p_key text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  if public.member_level() < 1 then raise exception 'klub_only'; end if;
  if p_key !~ '^[a-z0-9-]{1,40}$' or length(p_data::text) > 30000 then raise exception 'bad_input'; end if;
  insert into member_tool_data (email, key, data, updated_at) values (v_email, p_key, p_data, now())
  on conflict (email, key) do update set data = excluded.data, updated_at = now();
end $$;

-- 2) Týden po týdnu (obsah jen pro členy)
create table if not exists public.guide_weeks (
  week    integer primary key check (week between 1 and 45),
  baby    text not null default '',
  dad     text not null default '',
  for_you text not null default ''
);
alter table public.guide_weeks enable row level security;
drop policy if exists "admins all" on public.guide_weeks;
create policy "admins all" on public.guide_weeks for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.guide_weeks from anon;

create or replace function public.guide_weeks_list()
returns setof public.guide_weeks language plpgsql stable security definer set search_path = public as $$
begin
  if public.member_level() < 1 then return; end if;
  return query select * from guide_weeks order by week;
end $$;

revoke execute on function public.member_tool_get(text[]) from public, anon;
revoke execute on function public.member_tool_save(text, jsonb) from public, anon;
revoke execute on function public.guide_weeks_list() from public, anon;
grant execute on function public.member_tool_get(text[]) to authenticated;
grant execute on function public.member_tool_save(text, jsonb) to authenticated;
grant execute on function public.guide_weeks_list() to authenticated;
