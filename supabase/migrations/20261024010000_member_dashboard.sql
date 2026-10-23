-- Můj účet jako prostor pro tátu: vývoj v týdnech, přehled newsletterů, profil, návrhy mýtů

-- Týden, ve kterém táta je (a ve kterém se registroval)
create or replace function public.member_week(m public.members)
returns jsonb language sql stable as $$
  select case
    when m.phase = 'tehotenstvi' and m.due_date is not null then jsonb_build_object(
      'phase', 'tehotenstvi',
      'week', least(greatest(40 - ceil((m.due_date - current_date) / 7.0)::int, 1), 42),
      'start', least(greatest(40 - ceil((m.due_date - m.created_at::date) / 7.0)::int, 1), 42),
      'days_left', m.due_date - current_date)
    when m.phase = 'po-porodu' and m.birth_date is not null then jsonb_build_object(
      'phase', 'po-porodu',
      'week', least(greatest(floor((current_date - m.birth_date) / 7.0)::int, 0), 52),
      'start', least(greatest(floor((m.created_at::date - m.birth_date) / 7.0)::int, 0), 52))
    when m.phase = 'planujeme' then jsonb_build_object(
      'phase', 'planujeme',
      'week', least(floor((current_date - m.created_at::date) / 7.0)::int + 1, 12),
      'start', 1)
    else null end;
$$;

-- Newslettery, které táta dostal (od registrace po aktuální týden) – text jen tam, kam má přístup
create or replace function public.member_issues()
returns table (phase text, week integer, subject text, preheader text, body text, audience text, locked boolean, is_current boolean)
language plpgsql stable security definer set search_path = public as $$
declare m members%rowtype; w jsonb; v_level integer := public.member_level();
begin
  select * into m from members where lower(email::text) = lower(auth.jwt() ->> 'email');
  if not found then return; end if;
  w := public.member_week(m);
  if w is null then return; end if;
  return query
    select n.phase, n.week, n.subject, n.preheader,
           case when n.audience = 'klub' and v_level < 1 then null else n.body end,
           n.audience, (n.audience = 'klub' and v_level < 1), n.week = (w->>'week')::int
    from newsletter_issues n
    where n.status = 'ready' and n.phase = w->>'phase'
      and n.week between least((w->>'start')::int, (w->>'week')::int) and (w->>'week')::int
    order by n.week desc;
end $$;

-- Profil: táta si upraví fázi a data (aby týdny seděly)
create or replace function public.member_update_profile(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  if nullif(p->>'faze', '') is not null and p->>'faze' not in ('planujeme', 'tehotenstvi', 'po-porodu') then raise exception 'bad_input'; end if;
  update members set
    name = coalesce(nullif(left(trim(p->>'jmeno'), 80), ''), name),
    phase = nullif(p->>'faze', ''),
    due_date = nullif(p->>'termin_porodu', '')::date,
    birth_date = nullif(p->>'datum_narozeni', '')::date
  where lower(email::text) = v_email;
end $$;

-- Domovská stránka: přidá týden
create or replace function public.member_home()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m members%rowtype; v_email text := lower(auth.jwt() ->> 'email'); v_rozbor jsonb; v_admin boolean := public.is_admin();
        v_level integer := public.member_level(); v_tier_name text;
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  select * into m from members where lower(email::text) = v_email;
  if not found and not v_admin then return jsonb_build_object('member', false, 'email', v_email); end if;
  select name into v_tier_name from plans where slug = m.tier;
  if v_level >= 1 and m.quiz_type is not null then
    select data into v_rozbor from quiz_content where typ = m.quiz_type;
  end if;
  return jsonb_build_object('member', true, 'email', v_email, 'name', m.name,
    'status', case when v_admin or m.comp then 'active' else m.status end,
    'tier', m.tier, 'tier_name', v_tier_name, 'level', v_level, 'plan', m.plan,
    'paid_until', m.paid_until, 'phase', m.phase, 'due_date', m.due_date, 'birth_date', m.birth_date,
    'created_at', m.created_at, 'week', case when m.email is not null then public.member_week(m) end,
    'quiz_type', m.quiz_type, 'quiz_profile', m.quiz_profile, 'rozbor', v_rozbor,
    'comp', coalesce(m.comp, false) or v_admin, 'admin', v_admin);
end $$;

-- Návrhy mýtů od tátů
create table if not exists public.myth_suggestions (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email      citext,
  text       text not null check (char_length(text) between 5 and 500),
  status     text not null default 'new' check (status in ('new', 'used', 'rejected'))
);
alter table public.myth_suggestions enable row level security;
drop policy if exists "admins all" on public.myth_suggestions;
create policy "admins all" on public.myth_suggestions for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.myth_suggestions from anon;

create or replace function public.suggest_myth(p_text text)
returns void language sql security definer set search_path = public as $$
  insert into myth_suggestions (email, text) values (nullif(lower(auth.jwt() ->> 'email'), ''), trim(p_text));
$$;

revoke execute on function public.member_week(public.members) from public, anon, authenticated;
revoke execute on function public.member_issues() from public, anon;
revoke execute on function public.member_update_profile(jsonb) from public, anon;
revoke execute on function public.member_home() from public, anon;
revoke execute on function public.suggest_myth(text) from public;
grant execute on function public.member_issues() to authenticated;
grant execute on function public.member_update_profile(jsonb) to authenticated;
grant execute on function public.member_home() to authenticated;
grant execute on function public.suggest_myth(text) to anon, authenticated;
