# Pivo & Pleny

Web pro muže o těhotenství, porodu a otcovství – praktické návody, bořiči mýtů, anonymní zpovědnice **Cage**, dotazník „Jaký jsem táta?“ a podpora psychiky otců.

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
| `cage.html` | Cage – anonymní zpovědnice |
| `dotaznik.html` | Dotazník Jaký jsem táta? (5 typů + stav „Na rezervu“) |
| `zeny-o-muzich.html` | Ženy o mužích |
| `faq.html` | Časté otázky |
| `blog.html` + `clanek-*.html` | Blog |
| `klub.html` | Placený Klub (99 Kč/měs), konzultace, pánský předporodní kurz |
| `o-nas.html` | O nás |

Sdílená hlavička a patička se vkládají z `assets/js/main.js`, design je v `assets/css/style.css`.

## Co je potřeba napojit (TODO)

- **Newsletter** – formuláře `form[data-newsletter]` zatím jen zobrazí poděkování (napojit Ecomail / MailerLite).
- **Cage** a **Ona píše** – odesílání příspěvků do moderace (např. Supabase, Airtable, Netlify Forms).
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
