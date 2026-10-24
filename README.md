# Pivo & Pleny

Web pro muže o těhotenství, porodu a otcovství – praktické návody, bořiči mýtů, **Honest Cage** (anonymní sdílení traumat, nejistot a strachů), dotazník „Jaký jsem táta?“ a podpora psychiky otců.

## Struktura

Statický web (HTML + CSS + vanilla JS), bez build kroku. Funguje na GitHub Pages, Netlify i jakémkoli hostingu.

| Soubor | Sekce |
|---|---|
| `index.html` | Úvod |
| `pruvodce.html` | Praktické návody – těhotenství, taška, porod, po porodu |
| `zvyky.html` | 10 zvyků, které pomůžou |
| `spanek.html` | Spánkový deficit |
| `stres.html` | Stres, vztek a agresivita |
| `pomoc.html` | Jak pomoct sobě a okolí + krizové kontakty |
| `myty.html` | Bořiči mýtů (20 mýtů se zdroji) |
| `cage.html` | Honest Cage – anonymní sdílení traumat, nejistot a strachů |
| `dotaznik.html` | Dotazník Jaký jsem táta? (5 typů + stav „Na rezervu“) |
| `faq.html` | Časté otázky |
| `blog.html` + `clanek-*.html` | Blog |
| `klub.html` | Placený Klub (99 Kč/měs), konzultace, pánský předporodní kurz |
| `o-nas.html` | O nás |

Sdílená hlavička a patička se vkládají z `assets/js/main.js`, design je v `assets/css/style.css`.

## Co je potřeba napojit (TODO)

- **Newsletter** – formuláře `form[data-newsletter]` zatím jen zobrazí poděkování (napojit Ecomail / MailerLite).
- **Honest Cage** a **Ona píše** – odesílání příspěvků do moderace (např. Supabase, Airtable, Netlify Forms).
- **Platby Klubu** – GoPay / Stripe / Patreon / Forendors; obsah Klubu (členská zóna).
- **Konzultace** – rezervační systém (Calendly / Reservio) a ceník.
- Doména a e-maily `@pivoapleny.cz` jsou zatím zástupné.
- Medailonky týmu a odborných garantů na `o-nas.html`.

## Rešerše

Podklady a zdroje: `docs/reserse.md`.

## Lokální náhled

```bash
python3 -m http.server 8000
# otevři http://localhost:8000
```

## Administrace

`/admin/` – přihlašovací stránka a zašifrovaná administrace (finanční model, tarify, náklady).
Čitelný zdroj je v `admin-src/` (na GitHub se nenahrává). Po úpravě zašifruj znovu:

```bash
ADMIN_PASSWORD='heslo' node tools/encrypt-admin.mjs
```

Pozor: jde o šifrování obsahu ve statickém webu, ne o serverové přihlášení. Pro skutečná data členů bude potřeba backend.

## Backend (Supabase)

Projekt `pivo-a-pleny` (EU). Web volá jen veřejné databázové funkce s klíčem `anon` z `assets/js/config.js`; tabulky jsou zavřené pravidly RLS a vidí je jen zakladatelé (tabulka `admins`).

| Co | Kde |
| --- | --- |
| Schéma, RLS, funkce | `supabase/migrations/` (spustit v SQL Editoru, je opakovatelné) |
| Newsletter | `subscribe_newsletter()` → tabulka `newsletter` |
| Registrace do Klubu | `register_member()` → `members` |
| Honest Cage | `submit_confession()`, `cage_wall()`, `cage_react()` → `confessions` |
| Platby | Edge Functions `create-checkout` a `stripe-webhook` → `orders`, stav v `members` |
| Administrace | `admin/` – přihlášení přes Supabase Auth, aplikace se odemkne klíčem z `admin_secrets` |

Platby se na webu zapnou přepínačem `payments: true` v `assets/js/config.js`, až budou v Supabase (Edge Functions → Secrets) nastavené `STRIPE_SECRET_KEY` a `STRIPE_WEBHOOK_SECRET`.
