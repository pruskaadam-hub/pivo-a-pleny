// Pivo & Pleny – přijímá události ze Stripe a aktualizuje objednávky a členství.
// Tajné hodnoty: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…).
// Ve Stripe nastav endpoint na https://<projekt>.supabase.co/functions/v1/stripe-webhook s událostmi:
// checkout.session.completed, checkout.session.expired, invoice.paid, invoice.payment_failed, customer.subscription.deleted
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { httpClient: Stripe.createFetchHttpClient() });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const crypto = Stripe.createSubtleCryptoProvider();
const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, crypto);
  } catch (e) {
    console.error("Bad signature", e);
    return new Response("bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = s.metadata?.order_id || s.client_reference_id;
        if (orderId) await db.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), amount: s.amount_total ?? undefined }).eq("id", orderId);
        const memberId = s.metadata?.member_id;
        if (memberId) {
          let paidUntil: string | null = null;
          if (typeof s.subscription === "string") {
            const sub = await stripe.subscriptions.retrieve(s.subscription);
            paidUntil = iso(sub.current_period_end);
          }
          await db.from("members").update({
            status: "active",
            stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
            stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : null,
            paid_until: paidUntil,
          }).eq("id", memberId);
        }
        break;
      }
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.metadata?.order_id) await db.from("orders").update({ status: "expired" }).eq("id", s.metadata.order_id).eq("status", "created");
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        if (typeof inv.subscription === "string") {
          const end = inv.lines?.data?.[0]?.period?.end;
          await db.from("members").update({ status: "active", paid_until: iso(end) }).eq("stripe_subscription_id", inv.subscription);
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (typeof inv.subscription === "string") await db.from("members").update({ status: "past_due" }).eq("stripe_subscription_id", inv.subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.from("members").update({ status: "cancelled" }).eq("stripe_subscription_id", sub.id);
        break;
      }
    }
  } catch (e) {
    console.error(e);
    return new Response("handler error", { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
