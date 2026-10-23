-- Zakladatelé a členství zdarma: plný přístup bez platby, nezapočítává se do tržeb
alter table public.members add column if not exists comp boolean not null default false;

create or replace function public.member_home()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m members%rowtype; v_email text := lower(auth.jwt() ->> 'email'); v_rozbor jsonb; v_status text; v_admin boolean := public.is_admin();
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  select * into m from members where lower(email::text) = v_email;
  if not found and not v_admin then return jsonb_build_object('member', false, 'email', v_email); end if;
  v_status := case when v_admin or m.comp then 'active' else m.status end;
  if v_status = 'active' and m.quiz_type is not null then
    select data into v_rozbor from quiz_content where typ = m.quiz_type;
  end if;
  return jsonb_build_object('member', true, 'email', v_email, 'name', m.name, 'status', v_status, 'plan', m.plan,
    'paid_until', m.paid_until, 'phase', m.phase, 'due_date', m.due_date, 'birth_date', m.birth_date,
    'quiz_type', m.quiz_type, 'quiz_profile', m.quiz_profile, 'rozbor', v_rozbor,
    'comp', coalesce(m.comp, false) or v_admin, 'admin', v_admin);
end $$;
revoke execute on function public.member_home() from public, anon;
grant execute on function public.member_home() to authenticated;
