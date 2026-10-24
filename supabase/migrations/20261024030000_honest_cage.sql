-- Honest Cage: nové kategorie, redakční záznamy, témata pro analýzu, ukládání myšlenek pro členy Klubu

-- 1) Kategorie: Porod, Moje myšlenky, Vztahy, Otcovství
alter table public.confessions drop constraint if exists confessions_category_check;
update public.confessions set category = case category
  when 'psychika' then 'myslenky' when 'vztah' then 'vztahy' else category end
where category in ('psychika', 'vztah');
alter table public.confessions add constraint confessions_category_check
  check (category in ('porod', 'myslenky', 'vztahy', 'otcovstvi'));

-- 2) Zdroj záznamu (redakce / uživatel), témata pro analýzu, poznámka moderátora
alter table public.confessions add column if not exists source text not null default 'user';
alter table public.confessions drop constraint if exists confessions_source_check;
alter table public.confessions add constraint confessions_source_check check (source in ('user', 'editorial'));
alter table public.confessions add column if not exists topics text[] not null default '{}';
alter table public.confessions add column if not exists note text check (char_length(note) <= 500);
alter table public.confessions add column if not exists updated_at timestamptz;
create index if not exists confessions_category_idx on public.confessions (category);

-- 3) Redakční záznamy na zeď (bez zdrojů), jen pokud tam ještě nejsou
insert into public.confessions (category, phase, body, status, published_at, source, topics)
select v.category, v.phase, v.body, 'published', now(), 'editorial', v.topics
from (values
  ('porod',     'Porod',     'Nad ránem jsem se reálně bál, že omdlím vyčerpáním. A překvapila mě ta její fyzická síla.', array['unava', 'strach', 'porod-zazitek']),
  ('myslenky',  'Po porodu', 'Mám tendenci dělat tu typickou mužskou věc – schovávám to, dokud to už nejde.', array['mlceni']),
  ('porod',     'Porod',     'Přišlo mi, že jsem součástí nějakého pravěkého rituálu a moje žena je jeho centrem. A byla krásná, fyzicky krásná.', array['porod-zazitek', 'radost']),
  ('myslenky',  'Po porodu', 'Nakonec jsem prostě nemohl fungovat. Nebyl jsem sám sebou.', array['deprese']),
  ('otcovstvi', 'Po porodu', 'Bral jsem si to osobně – jako že selhávám. Moje žena poporodní depresi nezažila, já ano.', array['selhani', 'deprese']),
  ('porod',     'Porod',     'Porodní asistentka se zajímala o partnerku… ale ne o mě.', array['prehlizeni']),
  ('porod',     'Porod',     'Byl jsem v euforii a usmíval se jako v transu.', array['radost', 'porod-zazitek']),
  ('myslenky',  'Čekáme',    'Vždycky si uvědomuju, že partnerka je na tom mnohem hůř, takže se s tím prostě nějak vyrovnávám.', array['mlceni']),
  ('vztahy',    'Porod',     'Viděl jsem, co musela zvládnout.', array['vztah', 'porod-zazitek']),
  ('myslenky',  'Obecně',    'Vždycky je tu strach, že když se otevřeš, ti chlapi se vysmějí.', array['mlceni', 'strach'])
) as v(category, phase, body, topics)
where not exists (select 1 from public.confessions where source = 'editorial');

-- 4) Zeď: všechno zveřejněné (pořadí míchá prohlížeč – jednou za návštěvu)
drop function if exists public.cage_wall(integer);
create or replace function public.cage_wall(p_limit integer default 200)
returns table (id bigint, category text, phase text, body text, published_at timestamptz, reacts integer[])
language sql stable security definer set search_path = public as $$
  select c.id, c.category, c.phase, coalesce(c.public_body, c.body), c.published_at, c.reacts
  from confessions c where c.status = 'published'
  order by c.published_at desc limit least(greatest(p_limit, 1), 500);
$$;

create or replace function public.submit_confession(p_category text, p_phase text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into confessions (category, phase, body, source)
  values (case p_category when 'psychika' then 'myslenky' when 'vztah' then 'vztahy' else p_category end, left(p_phase, 40), trim(p_body), 'user');
end $$;

-- 5) Uložené myšlenky – výhoda Klubu
create table if not exists public.confession_saves (
  email         citext not null,
  confession_id bigint not null references public.confessions on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (email, confession_id)
);
alter table public.confession_saves enable row level security;
drop policy if exists "admins all" on public.confession_saves;
create policy "admins all" on public.confession_saves for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.confession_saves from anon;

-- ID uložených karet přihlášeného (a jestli smí ukládat)
create or replace function public.cage_my_saves()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null then return jsonb_build_object('klub', false, 'ids', '[]'::jsonb); end if;
  return jsonb_build_object('klub', public.member_level() >= 1,
    'ids', coalesce((select jsonb_agg(confession_id) from confession_saves where email = v_email), '[]'::jsonb));
end $$;

create or replace function public.cage_save(p_id bigint, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null then raise exception 'not_signed_in'; end if;
  if public.member_level() < 1 then raise exception 'klub_only'; end if;
  if p_on then
    insert into confession_saves (email, confession_id)
    select v_email, id from confessions where id = p_id and status = 'published'
    on conflict do nothing;
  else
    delete from confession_saves where email = v_email and confession_id = p_id;
  end if;
end $$;

create or replace function public.cage_saved()
returns table (id bigint, category text, phase text, body text, saved_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null or public.member_level() < 1 then return; end if;
  return query
    select c.id, c.category, c.phase, coalesce(c.public_body, c.body), s.created_at
    from confession_saves s join confessions c on c.id = s.confession_id
    where s.email = v_email and c.status = 'published'
    order by s.created_at desc;
end $$;

revoke execute on function public.cage_my_saves() from public, anon;
revoke execute on function public.cage_save(bigint, boolean) from public, anon;
revoke execute on function public.cage_saved() from public, anon;
grant execute on function public.cage_my_saves() to authenticated;
grant execute on function public.cage_save(bigint, boolean) to authenticated;
grant execute on function public.cage_saved() to authenticated;
grant execute on function public.cage_wall(integer) to anon, authenticated;
grant execute on function public.submit_confession(text, text, text) to anon, authenticated;
