-- Účty: registrovat se může každý zdarma (návštěvník s účtem), členství v Klubu se pak dokupuje.
-- Osa: návštěvník webu → člen Klubu → účastník akcí a konzultací.

alter table public.members alter column plan drop not null;
alter table public.members drop constraint if exists members_plan_check;
alter table public.members add constraint members_plan_check check (plan is null or plan in ('mesicne', 'rocne'));

update public.plans set name = 'Účet zdarma', tagline = 'Registrace pro každého', active = false where slug = 'partak';

-- Registrace účtu zdarma (po přihlášení odkazem z e-mailu)
create or replace function public.account_register(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  if coalesce((p->>'souhlas_gdpr')::boolean, false) is not true then raise exception 'missing_consent'; end if;
  insert into members (email, name, tier, status, phase, due_date, birth_date, first_time, consent_marketing, consent_gdpr_at, quiz_type, quiz_profile)
  values (v_email, left(trim(coalesce(p->>'jmeno', '')), 80), 'partak', 'active', nullif(p->>'faze', ''),
          nullif(p->>'termin_porodu', '')::date, nullif(p->>'datum_narozeni', '')::date,
          case when p ? 'prvootec' then (p->>'prvootec')::boolean end,
          coalesce((p->>'souhlas_marketing')::boolean, false), now(),
          case when p->'dotaznik'->>'typ' in ('A', 'P', 'Z', 'H', 'S') then p->'dotaznik'->>'typ' end,
          case when p->'dotaznik'->>'typ' in ('A', 'P', 'Z', 'H', 'S') then p->'dotaznik'->'profil' end)
  on conflict (email) do update set
    name = coalesce(nullif(excluded.name, ''), members.name),
    phase = coalesce(excluded.phase, members.phase), due_date = coalesce(excluded.due_date, members.due_date),
    birth_date = coalesce(excluded.birth_date, members.birth_date),
    consent_marketing = excluded.consent_marketing,
    quiz_type = coalesce(excluded.quiz_type, members.quiz_type), quiz_profile = coalesce(excluded.quiz_profile, members.quiz_profile);
  if coalesce((p->>'souhlas_marketing')::boolean, false) then perform subscribe_newsletter(v_email, 'ucet'); end if;
end $$;

-- Koupě členství (i bez účtu – registrace proběhne automaticky)
create or replace function public.register_member(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text; v_comp boolean; v_cur integer; v_qt text; v_tier text := coalesce(nullif(p->>'tier', ''), 'klub');
begin
  if coalesce((p->>'souhlas_gdpr')::boolean, false) is not true then raise exception 'missing_consent'; end if;
  if not exists (select 1 from plans where slug = v_tier and active and coalesce(price_month, 0) + coalesce(price_year, 0) > 0) then
    v_tier := 'klub';
  end if;
  select m.id, m.status, m.comp, pl.sort into v_id, v_status, v_comp, v_cur
  from members m left join plans pl on pl.slug = m.tier where m.email = trim(p->>'email');
  if v_status in ('active', 'past_due') and coalesce(v_cur, 0) > 0 and not coalesce(v_comp, false) then
    raise exception 'already_member';
  end if;
  v_qt := nullif(p->'dotaznik'->>'typ', '');
  if v_qt is not null and v_qt not in ('A', 'P', 'Z', 'H', 'S') then v_qt := null; end if;
  insert into members (email, name, plan, tier, status, age_group, region, first_time, kids, phase, due_date, birth_date,
                       interests, story, story_mode, consent_marketing, consent_gdpr_at, quiz_type, quiz_profile)
  values (trim(p->>'email'), trim(p->>'jmeno'), p->>'plan', v_tier, 'pending', p->>'vek', nullif(p->>'kraj', ''),
          (p->>'prvootec')::boolean, p->>'pocet_deti', p->>'faze',
          nullif(p->>'termin_porodu', '')::date, nullif(p->>'datum_narozeni', '')::date,
          coalesce(array(select jsonb_array_elements_text(p->'zajmy')), '{}'),
          nullif(p->'pribeh'->>'text', ''), p->'pribeh'->>'jak',
          coalesce((p->>'souhlas_marketing')::boolean, false), now(),
          v_qt, case when v_qt is not null then p->'dotaznik'->'profil' end)
  on conflict (email) do update set
    name = excluded.name, plan = excluded.plan, tier = excluded.tier,
    status = case when members.comp then members.status else 'pending' end,
    age_group = excluded.age_group, region = excluded.region,
    first_time = excluded.first_time, kids = excluded.kids, phase = excluded.phase,
    due_date = excluded.due_date, birth_date = excluded.birth_date, interests = excluded.interests,
    story = excluded.story, story_mode = excluded.story_mode,
    consent_marketing = excluded.consent_marketing, consent_gdpr_at = excluded.consent_gdpr_at,
    quiz_type = coalesce(excluded.quiz_type, members.quiz_type),
    quiz_profile = coalesce(excluded.quiz_profile, members.quiz_profile)
  returning id into v_id;
  if 'tipy-email' = any(coalesce(array(select jsonb_array_elements_text(p->'zajmy')), '{}')) then
    perform subscribe_newsletter(p->>'email', 'klub');
  end if;
  return v_id;
end $$;

-- Domovská stránka účtu: rozbor jen pro placené členy (úroveň ≥ 1), admina a členství zdarma
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
    'quiz_type', m.quiz_type, 'quiz_profile', m.quiz_profile, 'rozbor', v_rozbor,
    'comp', coalesce(m.comp, false) or v_admin, 'admin', v_admin);
end $$;

revoke execute on function public.account_register(jsonb) from public, anon;
revoke execute on function public.register_member(jsonb) from public;
revoke execute on function public.member_home() from public, anon;
grant execute on function public.account_register(jsonb) to authenticated;
grant execute on function public.register_member(jsonb) to anon, authenticated;
grant execute on function public.member_home() to authenticated;
