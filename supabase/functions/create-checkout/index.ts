// Pivo & Pleny – vytvoří Stripe Checkout pro Klub (předplatné) nebo konzultace (jednorázově).
// Tajné hodnoty (Edge Functions → Secrets): STRIPE_SECRET_KEY, volitelně SITE_URL.
// SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY dodává Supabase automaticky.
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Product = { mode: "subscription" | "payment"; amount: number; name: string; interval?: "month" | "year" };
const PRODUCTS: Record<string, Product> = {
  "klub-mesicne": { mode: "subscription", amount: 29000, name: "Klub Pivo & Pleny – měsíčně", interval: "month" },
  "klub-rocne": { mode: "subscription", amount: 270000, name: "Klub Pivo & Pleny – ročně", interval: "year" },
  "konzultace-1": { mode: "payment", amount: 149000, name: "Konzultace 1:1 (50 min)" },
  "konzultace-3": { mode: "payment", amount: 359000, name: "Balíček 3 konzultací 1:1 (50 min)" },
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { httpClient: Stripe.createFetchHttpClient() });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SITE = (Deno.env.get("SITE_URL") ?? "https://pruskaadam-hub.github.io/pivo-a-pleny").replace(/\/$/, "");
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!Deno.env.get("STRIPE_SECRET_KEY")) return json({ error: "payments_not_configured" }, 503);
  try {
    const body = await req.json();
    const { member_id, email } = body;
    let product: string = body.product;
    let p: Product | undefined;
    if (body.plan) {
      // členský plán z administrace (tabulka plans)
      const interval = body.interval === "mesicne" ? "month" : "year";
      const { data: pl } = await db.from("plans").select("slug,name,price_month,price_year,active").eq("slug", body.plan).single();
      const price = pl && (interval === "month" ? pl.price_month : pl.price_year);
      if (!pl || !pl.active || !price) return json({ error: "unknown_plan" }, 400);
      product = `${pl.slug}-${interval === "month" ? "mesicne" : "rocne"}`;
      p = { mode: "subscription", amount: price * 100, name: `${pl.name} Pivo & Pleny – ${interval === "month" ? "měsíčně" : "ročně"}`, interval };
    } else p = PRODUCTS[product];
    if (!p) return json({ error: "unknown_product" }, 400);

    let mail: string | undefined = typeof email === "string" ? email.trim() : undefined;
    let memberId: string | null = null;
    if (p.mode === "subscription") {
      if (!member_id) return json({ error: "missing_member" }, 400);
      const { data: m, error } = await db.from("members").select("id,email,status").eq("id", member_id).single();
      if (error || !m) return json({ error: "member_not_found" }, 404);
      if (m.status === "active") return json({ error: "already_member" }, 409);
      mail = m.email; memberId = m.id;
    }
    if (!mail || !EMAIL.test(mail)) return json({ error: "missing_email" }, 400);

    const { data: order, error: oErr } = await db.from("orders")
      .insert({ member_id: memberId, email: mail, product, amount: p.amount }).select("id").single();
    if (oErr) throw oErr;

    const meta = { order_id: order.id, member_id: memberId ?? "", product };
    const session = await stripe.checkout.sessions.create({
      mode: p.mode,
      locale: "cs",
      customer_email: mail,
      client_reference_id: order.id,
      metadata: meta,
      allow_promotion_codes: true,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "czk",
          unit_amount: p.amount,
          product_data: { name: p.name },
          ...(p.interval ? { recurring: { interval: p.interval } } : {}),
        },
      }],
      ...(p.mode === "subscription" ? { subscription_data: { metadata: meta } } : { invoice_creation: { enabled: true } }),
      success_url: `${SITE}/klub.html?platba=ok&produkt=${product}#hotovo`,
      cancel_url: `${SITE}/klub.html?platba=zruseno#${p.mode === "subscription" ? "registrace" : "konzultace"}`,
    });
    await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: "server_error" }, 500);
  }
});
