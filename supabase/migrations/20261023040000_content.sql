-- Obsah Klubu spravovaný v administraci: členské plány, newsletter podle týdne, audio a videa

-- ── Členské plány ───────────────────────────────────────────
create table if not exists public.plans (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,30}$'),
  name        text not null check (char_length(name) between 1 and 40),
  tagline     text check (char_length(tagline) <= 160),
  price_month integer check (price_month >= 0),   -- Kč, null = měsíčně nejde
  price_year  integer check (price_year >= 0),    -- Kč, null = ročně nejde
  features    text[] not null default '{}',
  active      boolean not null default true,      -- zobrazit na webu a nabízet v registraci
  highlight   boolean not null default false,
  sort        integer not null default 0,
  updated_at  timestamptz not null default now()
);
insert into public.plans (slug, name, tagline, price_month, price_year, features, active, highlight, sort) values
  ('partak', 'Parťák', 'Pro každého tátu, zdarma', 0, 0,
   array['Celý web, průvodce a Bořiči mýtů', 'Cage – čtení i psaní', 'Dotazník Jaký jsem táta? (typ)', 'Nedělní newsletter', '1 audio Táta za 5 minut měsíčně'], true, false, 0),
  ('klub', 'Klub', 'Tipy na míru, audia a parta tátů', 290, 2700,
   array['Měsíční tipy na míru podle týdne', 'Celá knihovna Táta za 5 minut', 'Celý rozbor dotazníku a plán na 12 týdnů', 'Taháky, checklisty, scénáře rozhovorů', 'Živé Q&A 1× měsíčně', 'Setkání tátů u piva', 'Sleva 20 % na workshopy a konzultace'], true, true, 1),
  ('klub-plus', 'Klub+', 'Navíc osobní kontakt s odborníkem', 590, 5490,
   array['Všechno z Klubu', '1 konzultace (50 min) každé 3 měsíce', 'Uzavřená skupina tátů s naší účastí', 'Přednostní místo na workshopech', 'Osobní plán na první rok'], false, false, 2)
on conflict (slug) do nothing;

alter table public.members drop constraint if exists members_tier_check;
alter table public.members drop constraint if exists members_tier_fkey;
alter table public.members add constraint members_tier_fkey foreign key (tier) references public.plans (slug) on update cascade;

-- ── Newsletter podle týdne ──────────────────────────────────
create table if not exists public.newsletter_issues (
  id         bigint generated always as identity primary key,
  phase      text not null check (phase in ('tehotenstvi', 'po-porodu')),
  week       integer not null check (week between 0 and 52),
  subject    text check (char_length(subject) <= 140),
  preheader  text check (char_length(preheader) <= 200),
  body       text check (char_length(body) <= 20000),        -- Markdown
  audience   text not null default 'klub' check (audience in ('vsichni', 'klub')),
  status     text not null default 'draft' check (status in ('draft', 'ready')),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users on delete set null,
  unique (phase, week)
);

-- ── Audio, videa, podcasty ──────────────────────────────────
create table if not exists public.media (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  title        text not null check (char_length(title) between 1 and 140),
  description  text check (char_length(description) <= 1000),
  kind         text not null check (kind in ('audio', 'youtube', 'spotify', 'apple', 'podcast', 'video', 'odkaz')),
  url          text check (url ~* '^https://'),
  storage_path text,
  duration_min numeric(5,1),
  series       text not null default 'tata-za-5-minut',
  access       text not null default 'klub' references public.plans (slug) on update cascade,
  phase        text not null default 'vse' check (phase in ('vse', 'tehotenstvi', 'po-porodu')),
  week_from    integer check (week_from between 0 and 52),
  week_to      integer check (week_to between 0 and 52),
  published    boolean not null default false,
  sort         integer not null default 0,
  check (url is not null or storage_path is not null)
);
create index if not exists media_pub_idx on public.media (published, series, sort);

do $$ declare t text; begin
  foreach t in array array['plans', 'newsletter_issues', 'media'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admins all" on public.%I', t);
    execute format('create policy "admins all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
drop trigger if exists plans_touch on public.plans;
create trigger plans_touch before update on public.plans for each row execute function public.touch();
drop trigger if exists newsletter_issues_touch on public.newsletter_issues;
create trigger newsletter_issues_touch before update on public.newsletter_issues for each row execute function public.touch();
drop trigger if exists media_touch on public.media;
create trigger media_touch before update on public.media for each row execute function public.touch();

-- ── Kdo má přístup ──────────────────────────────────────────
-- úroveň přihlášeného: 0 = nikdo/zdarma, 1 = Klub, 2 = Klub+ (podle pořadí plánu)
create or replace function public.member_level()
returns integer language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then 999
    else coalesce((select p.sort from members m join plans p on p.slug = m.tier
                   where lower(m.email::text) = lower(auth.jwt() ->> 'email') and (m.status = 'active' or m.comp)), 0)
  end;
$$;

-- ── Veřejné a členské funkce ────────────────────────────────
create or replace function public.public_plans()
returns setof public.plans language sql stable security definer set search_path = public as $$
  select * from plans where active order by sort;
$$;

create or replace function public.member_media()
returns table (id bigint, title text, description text, kind text, url text, storage_path text, duration_min numeric,
               series text, access text, phase text, week_from integer, week_to integer, locked boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.title, m.description, m.kind,
         case when p.sort <= public.member_level() then m.url end,
         case when p.sort <= public.member_level() then m.storage_path end,
         m.duration_min, m.series, m.access, m.phase, m.week_from, m.week_to,
         p.sort > public.member_level()
  from media m join plans p on p.slug = m.access
  where m.published
  order by m.series, m.sort, m.created_at desc;
$$;

-- Registrace: volitelně i vyšší plán
create or replace function public.register_member(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text; v_qt text; v_tier text := coalesce(nullif(p->>'tier', ''), 'klub');
begin
  if coalesce((p->>'souhlas_gdpr')::boolean, false) is not true then raise exception 'missing_consent'; end if;
  if not exists (select 1 from plans where slug = v_tier and active and coalesce(price_month, 0) + coalesce(price_year, 0) > 0) then
    v_tier := 'klub';
  end if;
  select id, status into v_id, v_status from members where email = trim(p->>'email');
  if v_status in ('active', 'past_due') then raise exception 'already_member'; end if;
  v_qt := nullif(p->'dotaznik'->>'typ', '');
  if v_qt is not null and v_qt not in ('A', 'P', 'Z', 'H', 'S') then v_qt := null; end if;
  insert into members (email, name, plan, tier, age_group, region, first_time, kids, phase, due_date, birth_date,
                       interests, story, story_mode, consent_marketing, consent_gdpr_at, quiz_type, quiz_profile)
  values (trim(p->>'email'), trim(p->>'jmeno'), p->>'plan', v_tier, p->>'vek', nullif(p->>'kraj', ''),
          (p->>'prvootec')::boolean, p->>'pocet_deti', p->>'faze',
          nullif(p->>'termin_porodu', '')::date, nullif(p->>'datum_narozeni', '')::date,
          coalesce(array(select jsonb_array_elements_text(p->'zajmy')), '{}'),
          nullif(p->'pribeh'->>'text', ''), p->'pribeh'->>'jak',
          coalesce((p->>'souhlas_marketing')::boolean, false), now(),
          v_qt, case when v_qt is not null then p->'dotaznik'->'profil' end)
  on conflict (email) do update set
    name = excluded.name, plan = excluded.plan, tier = excluded.tier, age_group = excluded.age_group, region = excluded.region,
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

revoke execute on function public.member_level() from public;
revoke execute on function public.member_media() from public;
revoke execute on function public.public_plans() from public;
revoke execute on function public.register_member(jsonb) from public;
grant execute on function public.member_level() to anon, authenticated;
grant execute on function public.member_media() to anon, authenticated;
grant execute on function public.public_plans() to anon, authenticated;
grant execute on function public.register_member(jsonb) to anon, authenticated;

-- ── Úložiště pro audio (soukromé, čtení podle úrovně členství) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "media admin write" on storage.objects;
create policy "media admin write" on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media read by level" on storage.objects;
create policy "media read by level" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media' and exists (
    select 1 from public.media m join public.plans p on p.slug = m.access
    where m.storage_path = storage.objects.name and m.published and p.sort <= public.member_level()));
