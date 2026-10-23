// Zašifruje administraci (admin-src/app.html, app.css, app.js) do admin/app.enc.json.
// Klíč (32 bajtů, base64) je uložený v Supabase v tabulce admin_secrets (name = 'bundle_key')
// a přečíst ho smí jen přihlášený zakladatel. Použití:
//   ADMIN_BUNDLE_KEY='…base64…' node tools/encrypt-admin.mjs
// Složka admin-src/ se na GitHub nenahrává (.gitignore) – obsahuje čitelnou verzi.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const raw = Buffer.from(process.env.ADMIN_BUNDLE_KEY || "", "base64");
if (raw.length !== 32) { console.error("Nastav ADMIN_BUNDLE_KEY (32 bajtů v base64)."); process.exit(1); }
const read = f => readFileSync(new URL(`../admin-src/${f}`, import.meta.url), "utf8");
const payload = JSON.stringify({ html: read("app.html"), css: read("app.css"), js: read("app.js") });
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload)));
const b64 = u => Buffer.from(u).toString("base64");
writeFileSync(new URL("../admin/app.enc.json", import.meta.url), JSON.stringify({ v: 2, iv: b64(iv), ct: b64(ct) }));
console.log("Hotovo: admin/app.enc.json");
