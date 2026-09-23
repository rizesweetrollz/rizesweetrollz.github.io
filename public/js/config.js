// ─────────────────────────────────────────────────────────
// SITE-WIDE CONFIG
//
// Prices, products and tax now live in data/pickup.json and
// data/catering.json — see RESTOCKING.md. This file is only for
// links and contact details.
//
// Nothing secret goes in here. Anything in this file is
// downloaded by every visitor and readable by anyone. The Square
// access token lives in Cloudflare's environment variables instead.
// ─────────────────────────────────────────────────────────

// DoorDash ordering — a plain link, completely separate from the cart.
const DOORDASH_LINK = 'https://order.online/business/rize-sweet-rollz-20599577';

// Shown to customers if checkout ever fails.
const BUSINESS_PHONE = '(385) 508-8088';
const BUSINESS_EMAIL = 'info@rizesweetrollz.com';

// The serverless function that builds the real Square checkout.
// Cloudflare Pages Functions route by file path: functions/create-checkout.js
// serves this exact path automatically, no config needed.
const CHECKOUT_ENDPOINT = '/create-checkout';
