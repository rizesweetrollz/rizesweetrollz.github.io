// ─────────────────────────────────────────────────────────────
// worker.js — the ONE Worker entry point for this whole site.
//
// wrangler.jsonc's `assets.run_worker_first` is scoped to exactly
// ["/create-checkout"], so every other request — every HTML page,
// the CSS, every js/*.js file, every images/*.jpg, every
// data/*.json catalog file — is served directly as a static asset
// by Cloudflare and NEVER reaches this file at all. This only runs
// for POST /create-checkout.
//
// The actual checkout logic lives in functions/create-checkout.js,
// unchanged — this file is just the thin routing wrapper Workers
// needs instead of the old Pages Functions file-based routing.
// ─────────────────────────────────────────────────────────────

import { onRequest as handleCheckout } from './functions/create-checkout.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/create-checkout') {
      return handleCheckout({ request, env, ctx });
    }

    // Shouldn't be reachable given run_worker_first above — but if
    // config ever changes, fall back to serving the static site
    // instead of a confusing error.
    return env.ASSETS.fetch(request);
  }
};
