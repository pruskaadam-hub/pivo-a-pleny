# PLENNY

**O těhotenství v pánském stylu.** Web pro muže o těhotenství, porodu a prvních týdnech s miminkem – praktické rady, Cage (anonymní zpovědi), dotazník „Zjisti svůj tátovský styl“ a Klub.

## Struktura

Statický web bez build kroku, běží na GitHub Pages.

| Soubor | Obsah |
|---|---|
| `index.html` | Celý web PLENNY (jednostránková aplikace – HTML, CSS i JS v jednom souboru) |
| `assets/img/` | Favicon a ikona pro iOS |
| `favicon.ico` | Favicon pro starší prohlížeče |
| `admin/` | Administrace (používá `assets/css/style.css`) |
| `supabase/` | Backend – databáze a funkce |

Předchozí vícestránkový web (Kuvalo / Pivo & Pleny) je v historii gitu, poslední verze je commit `fd80db0`.

## Co je potřeba napojit (TODO)

- Newsletter a registrace – napojit na Supabase / e-mailový nástroj.
- Cage – odesílání příspěvků do moderace.
- Platby Klubu (Stripe) – až po založení firmy.
- Doména a e-maily `@plenny.cz`.

## Lokální náhled

```bash
python3 -m http.server 8000
# otevři http://localhost:8000
```

## Administrace

`/admin/` – přihlašovací stránka a zašifrovaná administrace (finanční model, tarify, náklady).
Čitelný zdroj je v `admin-src/` (na GitHub se nenahrává). Po úpravě zašifruj znovu:

```bash
ADMIN_BUNDLE_KEY='…base64…' node tools/encrypt-admin.mjs
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
