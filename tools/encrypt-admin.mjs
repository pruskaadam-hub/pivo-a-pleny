// Zašifruje administraci (admin-src/app.html, app.css, app.js) do admin/app.enc.json.
// Použití:  ADMIN_PASSWORD='tajne-heslo' node tools/encrypt-admin.mjs
// Složka admin-src/ se na GitHub nenahrává (.gitignore) – obsahuje čitelnou verzi.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const pw = process.env.ADMIN_PASSWORD;
if (!pw || pw.length < 12) { console.error("Nastav ADMIN_PASSWORD (aspoň 12 znaků)."); process.exit(1); }
const read = f => readFileSync(new URL(`../admin-src/${f}`, import.meta.url), "utf8");
const payload = JSON.stringify({ html: read("app.html"), css: read("app.css"), js: read("app.js") });

const iter = 310000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload)));
const b64 = u => Buffer.from(u).toString("base64");
writeFileSync(new URL("../admin/app.enc.json", import.meta.url), JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
console.log("Hotovo: admin/app.enc.json");
