-- Členská zóna: rozbor dotazníku a obsah Klubu jen pro aktivní členy
-- Obsah rozborů se vkládá zvlášť (není ve veřejném repozitáři).

create table if not exists public.quiz_content (
  typ  text primary key check (typ in ('A', 'P', 'Z', 'H', 'S')),
  data jsonb not null
);
alter table public.quiz_content enable row level security;
drop policy if exists "admins all" on public.quiz_content;
create policy "admins all" on public.quiz_content for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.quiz_content from anon;

-- Domovská stránka člena: stav členství + rozbor, pokud je aktivní
create or replace function public.member_home()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m members%rowtype; v_email text := lower(auth.jwt() ->> 'email'); v_rozbor jsonb;
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  select * into m from members where lower(email::text) = v_email;
  if not found then return jsonb_build_object('member', false, 'email', v_email); end if;
  if m.status = 'active' and m.quiz_type is not null then
    select data into v_rozbor from quiz_content where typ = m.quiz_type;
  end if;
  return jsonb_build_object('member', true, 'email', v_email, 'name', m.name, 'status', m.status, 'plan', m.plan,
    'paid_until', m.paid_until, 'phase', m.phase, 'due_date', m.due_date, 'birth_date', m.birth_date,
    'quiz_type', m.quiz_type, 'quiz_profile', m.quiz_profile, 'rozbor', v_rozbor);
end $$;

-- Člen si uloží nový výsledek dotazníku
create or replace function public.member_save_quiz(p_typ text, p_profil jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  if p_typ not in ('A', 'P', 'Z', 'H', 'S') then raise exception 'bad_input'; end if;
  update members set quiz_type = p_typ, quiz_profile = p_profil where lower(email::text) = v_email;
end $$;

revoke execute on function public.member_home() from public, anon;
revoke execute on function public.member_save_quiz(text, jsonb) from public, anon;
grant execute on function public.member_home() to authenticated;
grant execute on function public.member_save_quiz(text, jsonb) to authenticated;
