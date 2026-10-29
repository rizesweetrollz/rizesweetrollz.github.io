// ─────────────────────────────────────────────────────────────
// create-subscription-checkout
//
// Serves POST /create-subscription-checkout. Same idea as
// create-checkout.js, but for recurring plans: the browser sends only
// a plan id and the customer's details, and this looks up the real
// price and Square plan variation in data/subscription.json.
//
// Square's checkout page saves the customer's card and starts the
// subscription. After that Square charges the card on the plan's
// cadence by itself. Nothing here runs again for renewals.
// ─────────────────────────────────────────────────────────────

import { SQUARE_VERSION, squareBase, toCents, toE164, jsonResponse, makeOrderRef } from './create-checkout.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }
  return handleSubscription(context);
}

async function handleSubscription(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  const token = env.SQUARE_ACCESS_TOKEN;
  const locationId = env.SQUARE_LOCATION_ID;
  if (!token || !locationId) {
    console.error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID');
    return jsonResponse(500, { error: 'Subscriptions are not set up yet. Please call us.' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Malformed request.' });
  }

  const { planId, customer } = payload;

  if (!customer || !customer.name || !customer.phone || !customer.email) {
    return jsonResponse(400, { error: 'Name, phone, and email are required.' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) {
    return jsonResponse(400, { error: 'That email address doesn\'t look right.' });
  }
  const phone = toE164(customer.phone);
  if (!phone) {
    return jsonResponse(400, { error: 'Please enter a 10-digit phone number.' });
  }

  // ── Look up the plan in the published catalog ────────────
  let catalog;
  try {
    const res = await env.ASSETS.fetch('https://internal/data/subscription.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    catalog = await res.json();
  } catch (err) {
    console.error('Subscription catalog load failed:', err);
    return jsonResponse(500, { error: 'Could not load the plans. Please try again in a moment.' });
  }

  const plan = (catalog.products || []).find(p => p.id === planId);
  if (!plan) {
    return jsonResponse(400, { error: 'That plan is no longer available.' });
  }
  // The sandbox is a separate Square account with its own plan IDs, so
  // preview builds (SQUARE_ENV=sandbox) use the plan's sandbox copy.
  // Also guards against a placeholder ID going live before it's been
  // linked to a real Square plan.
  const variationId = env.SQUARE_ENV === 'production'
    ? plan.squarePlanVariationId
    : plan.squarePlanVariationIdSandbox;
  if (!variationId || variationId.startsWith('REPLACE_') || !(Number(plan.price) > 0)) {
    console.error(`Plan "${plan.id}" is missing a Square plan variation ID or price`);
    return jsonResponse(500, { error: 'This plan isn\'t open for sign-ups yet. Please call us.' });
  }

  const ref = makeOrderRef();

  const body = {
    idempotency_key: `${ref}-sub`,
    description: `${plan.name} subscription ${ref}`,
    // price_money must match the plan variation's price in Square.
    // A different amount here acts as a price override.
    quick_pay: {
      name: plan.name,
      price_money: { amount: toCents(plan.price), currency: 'USD' },
      location_id: locationId
    },
    checkout_options: {
      subscription_plan_id: variationId,
      allow_tipping: false,
      // Subscriptions are delivered (free), so Square collects the address.
      ask_for_shipping_address: true,
      redirect_url: `${origin}/order-confirmed.html?ref=${encodeURIComponent(ref)}`
    },
    pre_populated_data: {
      buyer_email: customer.email,
      buyer_phone_number: phone
    },
    payment_note: [
      ref,
      `${plan.name} subscription — delivery`,
      `${customer.name} / ${customer.phone}`,
      customer.notes ? `Notes: ${customer.notes}` : ''
    ].filter(Boolean).join(' | ').slice(0, 500)
  };

  try {
    const res = await fetch(`${squareBase(env)}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch { /* not JSON */ }

    if (!res.ok) {
      console.error('Square HTTP', res.status, text.slice(0, 1000));
      return jsonResponse(502, {
        error: 'We couldn\'t reach our payment provider. Please try again, or call us.'
      });
    }

    const link = data.payment_link;
    return jsonResponse(200, { url: link.long_url || link.url, ref });
  } catch (err) {
    console.error('Unexpected subscription checkout failure:', err);
    return jsonResponse(500, { error: 'Something went wrong starting your subscription. Please try again.' });
  }
}
