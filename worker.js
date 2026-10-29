// ─────────────────────────────────────────────────────────────
// worker.js — the ONE Worker entry point for this whole site.
//
// wrangler.jsonc's `assets.run_worker_first` is scoped to exactly
// ["/create-checkout", "/create-subscription-checkout", "/version"], so every other request — every HTML page,
// the CSS, every js/*.js file, every images/*.jpg, every
// data/*.json catalog file — is served directly as a static asset
// by Cloudflare and NEVER reaches this file at all. This only runs
// for POST /create-checkout, POST /create-subscription-checkout and GET /version.
//
// The actual checkout logic lives in functions/create-checkout.js,
// unchanged — this file is just the thin routing wrapper Workers
// needs instead of the old Pages Functions file-based routing.
// ─────────────────────────────────────────────────────────────

import { onRequest as handleCheckout } from './functions/create-checkout.js';
import { onRequest as handleSubscription } from './functions/create-subscription-checkout.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/create-checkout') {
      return handleCheckout({ request, env, ctx });
    }
    if (url.pathname === '/create-subscription-checkout') {
      return handleSubscription({ request, env, ctx });
    }
    // Which deployed version is running, and whether it's the live site
    // (SQUARE_ENV=production) or a test preview. every-page.js reads this
    // for the footer version number and the test-site banner.
    if (url.pathname === '/version') {
      const v = env.CF_VERSION_METADATA || {};
      return new Response(JSON.stringify({
        live: env.SQUARE_ENV === 'production',
        id: v.id || null,
        tag: v.tag || null,
        timestamp: v.timestamp || null
      }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    // Shouldn't be reachable given run_worker_first above — but if
    // config ever changes, fall back to serving the static site
    // instead of a confusing error.
    return env.ASSETS.fetch(request);
  }
};
