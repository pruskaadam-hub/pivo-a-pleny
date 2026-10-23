-- Výsledek dotazníku Jaký jsem táta? u registrace (celý rozbor je za paywallem Klubu)
alter table public.members add column if not exists quiz_type text check (quiz_type in ('A', 'P', 'Z', 'H', 'S'));
alter table public.members add column if not exists quiz_profile jsonb;

create or replace function public.register_member(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text; v_qt text;
begin
  if coalesce((p->>'souhlas_gdpr')::boolean, false) is not true then
    raise exception 'missing_consent';
  end if;
  select id, status into v_id, v_status from members where email = trim(p->>'email');
  if v_status in ('active', 'past_due') then
    raise exception 'already_member';
  end if;
  v_qt := nullif(p->'dotaznik'->>'typ', '');
  if v_qt is not null and v_qt not in ('A', 'P', 'Z', 'H', 'S') then v_qt := null; end if;
  insert into members (email, name, plan, age_group, region, first_time, kids, phase, due_date, birth_date,
                       interests, story, story_mode, consent_marketing, consent_gdpr_at, quiz_type, quiz_profile)
  values (trim(p->>'email'), trim(p->>'jmeno'), p->>'plan', p->>'vek', nullif(p->>'kraj', ''),
          (p->>'prvootec')::boolean, p->>'pocet_deti', p->>'faze',
          nullif(p->>'termin_porodu', '')::date, nullif(p->>'datum_narozeni', '')::date,
          coalesce(array(select jsonb_array_elements_text(p->'zajmy')), '{}'),
          nullif(p->'pribeh'->>'text', ''), p->'pribeh'->>'jak',
          coalesce((p->>'souhlas_marketing')::boolean, false), now(),
          v_qt, case when v_qt is not null then p->'dotaznik'->'profil' end)
  on conflict (email) do update set
    name = excluded.name, plan = excluded.plan, age_group = excluded.age_group, region = excluded.region,
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
revoke execute on function public.register_member(jsonb) from public;
grant execute on function public.register_member(jsonb) to anon, authenticated;
