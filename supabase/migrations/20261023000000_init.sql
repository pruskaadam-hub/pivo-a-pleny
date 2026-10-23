-- Pivo & Pleny – databáze, pravidla (RLS) a veřejné funkce
-- Spusť celý soubor jednou v Supabase → SQL Editor. Je bezpečné spustit ho znovu.
-- Veřejnost (anon) nesmí číst ani zapisovat do tabulek přímo – jen přes funkce níže.
-- Zakladatelé (tabulka admins) vidí a upravují všechno.

create extension if not exists citext;

-- ── Zakladatelé ─────────────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Klíč k zašifrované aplikaci administrace (čtou jen zakladatelé)
create table if not exists public.admin_secrets (
  name  text primary key,
  value text not null
);

-- ── Newsletter ──────────────────────────────────────────────
create table if not exists public.newsletter (
  id              bigint generated always as identity primary key,
  email           citext not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source          text,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- ── Členové Klubu ───────────────────────────────────────────
create table if not exists public.members (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  email                  citext not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name                   text not null check (char_length(name) between 1 and 80),
  plan                   text not null check (plan in ('mesicne', 'rocne')),
  tier                   text not null default 'klub' check (tier in ('klub', 'klub-plus')),
  age_group              text,
  region                 text,
  first_time             boolean,
  kids                   text,
  phase                  text check (phase in ('planujeme', 'tehotenstvi', 'po-porodu')),
  due_date               date,
  birth_date             date,
  interests              text[] not null default '{}',
  story                  text check (char_length(story) <= 1500),
  story_mode             text check (story_mode in ('anonymne', 'podepsane')),
  consent_marketing      boolean not null default false,
  consent_gdpr_at        timestamptz not null,
  status                 text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  paid_until             timestamptz,
  note                   text
);

-- ── Objednávky (Stripe) ─────────────────────────────────────
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  member_id         uuid references public.members on delete set null,
  email             citext,
  product           text not null,
  amount            integer not null,           -- v haléřích
  currency          text not null default 'czk',
  status            text not null default 'created' check (status in ('created', 'paid', 'expired', 'refunded')),
  stripe_session_id text unique,
  paid_at           timestamptz
);

-- ── Cage ────────────────────────────────────────────────────
create table if not exists public.confessions (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  category     text not null check (category in ('porod', 'psychika', 'vztah', 'otcovstvi')),
  phase        text check (char_length(phase) <= 40),
  body         text not null check (char_length(body) between 20 and 1500),
  public_body  text check (char_length(public_body) <= 1500),  -- upravená verze po moderaci
  status       text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  published_at timestamptz,
  moderated_by uuid references auth.users on delete set null,
  reacts       integer[] not null default '{0,0,0}'
);
create index if not exists confessions_status_idx on public.confessions (status, published_at desc);

-- ── Scénáře finančního modelu (administrace) ────────────────
create table if not exists public.scenarios (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users on delete set null
);

-- updated_at
create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members for each row execute function public.touch();
drop trigger if exists scenarios_touch on public.scenarios;
create trigger scenarios_touch before update on public.scenarios for each row execute function public.touch();

-- ── RLS: všechno zavřené, zakladatelé mají plný přístup ─────
do $$
declare t text;
begin
  foreach t in array array['admins', 'admin_secrets', 'newsletter', 'members', 'orders', 'confessions', 'scenarios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admins all" on public.%I', t);
    execute format('create policy "admins all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ── Veřejné funkce (volá je web) ────────────────────────────
create or replace function public.subscribe_newsletter(p_email text, p_source text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into newsletter (email, source) values (trim(p_email), left(p_source, 40))
  on conflict (email) do update set unsubscribed_at = null;
end $$;

create or replace function public.register_member(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text;
begin
  if coalesce((p->>'souhlas_gdpr')::boolean, false) is not true then
    raise exception 'missing_consent';
  end if;
  select id, status into v_id, v_status from members where email = trim(p->>'email');
  if v_status in ('active', 'past_due') then
    raise exception 'already_member';
  end if;
  insert into members (email, name, plan, age_group, region, first_time, kids, phase, due_date, birth_date,
                       interests, story, story_mode, consent_marketing, consent_gdpr_at)
  values (trim(p->>'email'), trim(p->>'jmeno'), p->>'plan', p->>'vek', nullif(p->>'kraj', ''),
          (p->>'prvootec')::boolean, p->>'pocet_deti', p->>'faze',
          nullif(p->>'termin_porodu', '')::date, nullif(p->>'datum_narozeni', '')::date,
          coalesce(array(select jsonb_array_elements_text(p->'zajmy')), '{}'),
          nullif(p->'pribeh'->>'text', ''), p->'pribeh'->>'jak',
          coalesce((p->>'souhlas_marketing')::boolean, false), now())
  on conflict (email) do update set
    name = excluded.name, plan = excluded.plan, age_group = excluded.age_group, region = excluded.region,
    first_time = excluded.first_time, kids = excluded.kids, phase = excluded.phase,
    due_date = excluded.due_date, birth_date = excluded.birth_date, interests = excluded.interests,
    story = excluded.story, story_mode = excluded.story_mode,
    consent_marketing = excluded.consent_marketing, consent_gdpr_at = excluded.consent_gdpr_at
  returning id into v_id;
  if 'tipy-email' = any(coalesce(array(select jsonb_array_elements_text(p->'zajmy')), '{}')) then
    perform subscribe_newsletter(p->>'email', 'klub');
  end if;
  return v_id;
end $$;

create or replace function public.submit_confession(p_category text, p_phase text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into confessions (category, phase, body) values (p_category, left(p_phase, 40), trim(p_body));
end $$;

create or replace function public.cage_wall(p_limit integer default 60)
returns table (id bigint, category text, phase text, body text, published_at timestamptz, reacts integer[])
language sql stable security definer set search_path = public as $$
  select c.id, c.category, c.phase, coalesce(c.public_body, c.body), c.published_at, c.reacts
  from confessions c where c.status = 'published'
  order by c.published_at desc limit least(greatest(p_limit, 1), 200);
$$;

create or replace function public.cage_react(p_id bigint, p_kind integer, p_delta integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not between 0 and 2 or p_delta not in (-1, 1) then raise exception 'bad_input'; end if;
  update confessions set reacts[p_kind + 1] = greatest(reacts[p_kind + 1] + p_delta, 0)
  where id = p_id and status = 'published';
end $$;

-- Práva: veřejnost smí volat jen tyto funkce
revoke execute on all functions in schema public from public, anon;
grant execute on function public.subscribe_newsletter(text, text)        to anon, authenticated;
grant execute on function public.register_member(jsonb)                  to anon, authenticated;
grant execute on function public.submit_confession(text, text, text)     to anon, authenticated;
grant execute on function public.cage_wall(integer)                      to anon, authenticated;
grant execute on function public.cage_react(bigint, integer, integer)    to anon, authenticated;
grant execute on function public.is_admin()                              to authenticated;
