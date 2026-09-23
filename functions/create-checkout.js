// ─────────────────────────────────────────────────────────────
// create-checkout
//
// A Cloudflare Pages Function. File-based routing means this exact
// path — functions/create-checkout.js — is what serves POST requests
// to /create-checkout. Runs on Cloudflare's servers, NOT in the
// customer's browser. That matters for two reasons:
//
//   1. It holds the Square access token. That token can move money,
//      so it can never appear in anything the browser downloads.
//   2. It re-prices every order from the published catalog. The
//      browser only sends product IDs and quantities — never prices.
//      If it sent prices, someone could edit them in dev tools and
//      buy a $128 tray for a penny.
//
// It returns a Square checkout URL with the real total, itemized
// line items, tax, and the pickup details already attached to the
// order — so everything lands in your Square dashboard by itself.
// ─────────────────────────────────────────────────────────────

const SQUARE_VERSION = '2026-09-16';

// The bakery's timezone. The pickup time a customer picks is always
// wall-clock time AT THE SHOP — if someone orders from New York and
// chooses 9:00 AM, they mean 9:00 AM Utah time, not 9:00 AM Eastern.
const SHOP_TIMEZONE = 'America/Denver';

// How far a timezone is from UTC at a given instant, in milliseconds.
// Derived from Intl rather than hardcoded, so daylight saving is
// handled automatically — MDT in summer, MST in winter.
function tzOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUTC - date.getTime();
}

// Turns "2026-09-25T09:00" (what a datetime-local input gives us,
// with no timezone on it) into a correct UTC instant, reading it as
// shop time. Without this, the server's UTC clock would read 9:00 AM
// as 9:00 UTC — 3:00 AM in Utah.
function parsePickupTime(value) {
  if (typeof value !== 'string' || !value) return new Date(NaN);

  // Already carries a timezone (ends in Z or +HH:MM) — trust it.
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return new Date(value);

  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return new Date(NaN);
  const [, y, mo, d, hh, mm] = m.map(Number);

  const naive = Date.UTC(y, mo - 1, d, hh, mm);
  // Two passes: the offset depends on the instant, and the instant
  // depends on the offset. Converges immediately except within the
  // one ambiguous hour when clocks change.
  let utc = naive;
  for (let i = 0; i < 2; i++) utc = naive - tzOffsetMs(SHOP_TIMEZONE, new Date(utc));
  return new Date(utc);
}

// Square has two completely separate worlds: sandbox (fake money,
// for testing) and production (real money). SQUARE_ENV picks one.
function squareBase(env) {
  return env.SQUARE_ENV === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

// Money in the Square API is always an integer of the smallest
// currency unit. $12.50 is 1250, never 12.5 — floats would round wrong.
function toCents(dollars) {
  return Math.round(Number(dollars) * 100);
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

// A short human-friendly code. Square's own order ID is long and
// ugly; this is what you and the customer say out loud on the phone.
function makeOrderRef() {
  const d = new Date();
  const stamp = String(d.getFullYear()).slice(2)
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0');
  const chars = 'ACDEFHJKLMNPRTUVWXY34679'; // no 0/O or 1/I — misread on the phone
  let tail = '';
  for (let i = 0; i < 4; i++) tail += chars[Math.floor(Math.random() * chars.length)];
  return `RSR-${stamp}-${tail}`;
}

// Loads the SAME catalog file the website shows customers, straight
// from the live site. One file to edit when you restock; the server
// reads the published version rather than trusting the browser.
// `origin` is this same Pages deployment's own URL, so this works
// identically on the production domain and on every preview deploy.
async function loadCatalog(shop, env) {
  const file = shop === "Catering" ? "catering.json" : "pickup.json";
  const res = await env.ASSETS.fetch(`https://internal/data/${file}`);
  if (!res.ok) throw new Error(`Could not load catalog ${file} (HTTP ${res.status})`);
  return res.json();
}

// `onRequest` (not `onRequestPost`) matches every HTTP method, so a
// GET/PUT/DELETE to this URL is guaranteed to hit this guard instead
// of silently falling through to Cloudflare's static-asset server —
// confirmed by testing: with only onRequestPost exported, a stray GET
// here returned the homepage's HTML with a 200, rather than an error.
export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }
  return handleCheckout(context);
}

async function handleCheckout(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  const token = env.SQUARE_ACCESS_TOKEN;
  const locationId = env.SQUARE_LOCATION_ID;
  if (!token || !locationId) {
    console.error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID');
    return jsonResponse(500, { error: 'Checkout is not configured yet. Please call us to order.' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Malformed request.' });
  }

  const { shop, items, customer } = payload;

  // ── Validate the customer block ──────────────────────────
  if (!customer || !customer.name || !customer.phone || !customer.email) {
    return jsonResponse(400, { error: 'Name, phone, and email are required.' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) {
    return jsonResponse(400, { error: 'That email address doesn\'t look right.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return jsonResponse(400, { error: 'Your cart is empty.' });
  }
  if (!customer.pickupAt) {
    return jsonResponse(400, { error: 'Please choose a pickup date and time.' });
  }

  const pickupAt = parsePickupTime(customer.pickupAt);
  if (isNaN(pickupAt.getTime())) {
    return jsonResponse(400, { error: 'That pickup time isn\'t a valid date.' });
  }

  // ── Re-price everything from the published catalog ───────
  let catalog;
  try {
    catalog = await loadCatalog(shop, env);
  } catch (err) {
    console.error('Catalog load failed:', err);
    return jsonResponse(500, { error: 'Could not load the menu. Please try again in a moment.' });
  }

  const taxRate = Number(catalog.taxRate) || 0;
  const lineItems = [];
  let requiredLeadHours = 0;
  let subtotalCents = 0;

  for (const item of items) {
    const product = catalog.products.find(p => p.id === item.id);
    if (!product) {
      return jsonResponse(400, { error: `"${item.id}" is no longer available.` });
    }
    if (product.soldOut) {
      return jsonResponse(409, { error: `${product.name} just sold out. Please remove it and try again.` });
    }
    // contactOnly products (no fixed price) can't be charged through this
    // flow at all — reject even if someone crafts the request by hand,
    // bypassing the page (which never offers an Add to Cart button for one).
    if (product.contactOnly) {
      return jsonResponse(400, { error: `${product.name} isn't available for online checkout — please contact us directly.` });
    }

    const qty = parseInt(item.qty, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return jsonResponse(400, { error: `Invalid quantity for ${product.name}.` });
    }

    requiredLeadHours = Math.max(requiredLeadHours, Number(product.leadHours) || 0);

    // NOTE: price comes from `product`, never from `item`.
    lineItems.push({
      name: product.name,
      quantity: String(qty),
      base_price_money: { amount: toCents(product.price), currency: 'USD' }
    });
    subtotalCents += toCents(product.price) * qty;

    // The kit is only purchasable if the catalog says this product has one.
    if (item.kit && product.kit) {
      lineItems.push({
        name: `Essentials Kit (${product.name})`,
        quantity: String(qty),
        base_price_money: { amount: toCents(product.kit.price), currency: 'USD' }
      });
      subtotalCents += toCents(product.kit.price) * qty;
    }
  }

  // ── Enforce lead time on the server too ──────────────────
  // The browser checks this as well, but a browser check is a
  // courtesy, not a guarantee — anyone can bypass it.
  const earliest = new Date(Date.now() + requiredLeadHours * 3600 * 1000);
  if (pickupAt < earliest) {
    return jsonResponse(400, {
      error: `That order needs at least ${requiredLeadHours} hours' notice. Please pick a later time.`
    });
  }

  const orderRef = makeOrderRef();
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;

  // payment_note is capped at 500 characters by Square.
  const note = [
    `${orderRef}`,
    `${shop} — pickup ${pickupAt.toLocaleString('en-US', { timeZone: SHOP_TIMEZONE })} MT`,
    `${customer.name} / ${customer.phone}`,
    customer.notes ? `Notes: ${customer.notes}` : ''
  ].filter(Boolean).join(' | ').slice(0, 500);

  // The pickup fulfillment is what makes this show up in Square as a
  // real pickup order with a name and time attached, rather than an
  // anonymous card swipe.
  const fulfillment = {
    type: 'PICKUP',
    state: 'PROPOSED',
    pickup_details: {
      recipient: {
        display_name: customer.name,
        email_address: customer.email,
        phone_number: customer.phone
      },
      schedule_type: 'SCHEDULED',
      pickup_at: pickupAt.toISOString(),
      note: (customer.notes || '').slice(0, 500)
    }
  };

  const order = {
    location_id: locationId,
    reference_id: orderRef,
    line_items: lineItems,
    taxes: taxRate > 0 ? [{
      uid: 'sales-tax',
      name: 'Sales Tax',
      percentage: String(+(taxRate * 100).toFixed(4)),
      scope: 'ORDER'
    }] : undefined,
    fulfillments: [fulfillment],
    metadata: {
      order_ref: orderRef,
      shop: String(shop || ''),
      customer_phone: String(customer.phone).slice(0, 100),
      pickup_at: pickupAt.toISOString()
    }
  };

  function buildBody(includeFulfillment) {
    const o = { ...order };
    if (!includeFulfillment) delete o.fulfillments;
    return {
      // The idempotency key stops a double-click (or a retry) from
      // creating two separate orders for the same purchase.
      idempotency_key: `${orderRef}-${includeFulfillment ? 'f' : 'n'}`,
      description: `${shop} order ${orderRef}`,
      order: o,
      checkout_options: {
        allow_tipping: false,       // Square would otherwise auto-add a 15% tip prompt
        ask_for_shipping_address: false,
        redirect_url: `${origin}/order-confirmed.html?ref=${encodeURIComponent(orderRef)}`
      },
      pre_populated_data: {
        buyer_email: customer.email,
        buyer_phone_number: customer.phone
      },
      payment_note: note
    };
  }

  async function callSquare(body) {
    const res = await fetch(`${squareBase(env)}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  try {
    // Attempt 1: with the pickup fulfillment attached.
    let result = await callSquare(buildBody(true));

    // Some Square account configurations reject fulfillments on
    // checkout links. Rather than failing the sale, drop the
    // fulfillment and retry — the details still ride along in the
    // payment note and order metadata.
    if (!result.ok) {
      console.warn('Square rejected order with fulfillment:', JSON.stringify(result.data.errors));
      result = await callSquare(buildBody(false));
      if (result.ok) console.warn('Succeeded on retry without fulfillment block.');
    }

    if (!result.ok) {
      console.error('Square error:', JSON.stringify(result.data.errors));
      return jsonResponse(502, {
        error: 'We couldn\'t reach our payment provider. Please try again, or call us to order.'
      });
    }

    const link = result.data.payment_link;
    return jsonResponse(200, {
      url: link.long_url || link.url,
      ref: orderRef,
      total: (totalCents / 100).toFixed(2),
      subtotal: (subtotalCents / 100).toFixed(2),
      tax: (taxCents / 100).toFixed(2)
    });
  } catch (err) {
    console.error('Unexpected checkout failure:', err);
    return jsonResponse(500, { error: 'Something went wrong creating your order. Please try again.' });
  }
}
