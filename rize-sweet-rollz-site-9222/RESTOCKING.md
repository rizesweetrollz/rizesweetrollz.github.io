# Restocking the shops

Two files control everything customers can buy:

- `public/data/pickup.json` → the **Pickup Shop**
- `public/data/catering.json` → the **Catering** page

That's it. You never need to touch the HTML, the CSS, or any
JavaScript to change what's for sale. Edit the file, re-upload,
and both the website **and** the Square checkout update together —
they read the same file, so they can't drift apart.

---

## What one product looks like

```json
{
  "id": "six",
  "name": "6-Pack",
  "desc": "Great for families, gatherings, and holiday mornings.",
  "price": 18.00,
  "priceSub": "6 rolls · $3.00 each",
  "img": "images/fresh-cinnamon-rolls-in-blue-baking-dish.jpg",
  "alt": "6-pack of cinnamon rolls",
  "leadHours": 24,
  "soldOut": false,
  "kit": {
    "price": 2.00,
    "label": "Foil pan, plastic lid & tinfoil included"
  }
}
```

| Field | What it does |
|---|---|
| `id` | Internal code. Unique, no spaces. Customers never see it. **Don't change an existing one** — it links to past orders. |
| `name` | Product title on the card and on the Square receipt. |
| `desc` | The description paragraph. |
| `price` | Dollars, as a number. `18.00` — never `"$18"`. |
| `priceSub` | Small grey line under the price. Optional. |
| `img` | Path to a photo in `public/images/`. |
| `alt` | Description for screen readers and if the photo fails to load. |
| `leadHours` | Minimum notice, in hours. Customers can't pick a pickup time sooner than this, and the server rejects it too. |
| `soldOut` | `true` shows a Sold Out badge and disables ordering. `false` for normal. |
| `kit` | The optional Essentials Kit checkbox. Delete the whole block if a product shouldn't offer one. |
| `metaNote` | Optional small maroon line — used on catering for "Serves 20–24 · 48 hr notice". |
| `contactOnly` | For items with no fixed price ("Custom Order — call us"). Set `"contactOnly": true` and **delete `price`** entirely. The card shows a Contact Us button instead of Add to Cart, and can never be checked out through Square — by design, since there's nothing to charge. `priceSub` still works here for a line like "Variable pricing." |

---

## Common changes

**Change a price** — edit `price`. Done. Square charges the new amount
on the next order automatically.

**Sell something out** — change `"soldOut": false` to `"soldOut": true`.
Set it back when you restock. Better than deleting, because the product
and its wording stay put.

**Add a product** — copy an entire `{ ... }` block, paste it as another
entry in the list, give it a new unique `id`, fill in the rest.
**Put a comma between blocks, but not after the last one.**

**Remove a product** — delete its whole `{ ... }` block and tidy up the
commas. If you might bring it back, use `soldOut` instead.

**New photo** — drop the image file into `public/images/` and point `img` at it.

**Change tax** — `taxRate` at the top of the file. `0.03` is 3%,
`0.0775` is 7.75%. Check the rate with your accountant.

---

## The one thing that will bite you

JSON is strict about commas and quotes. A single stray comma makes the
file unreadable and the shop will show *"We couldn't load the menu."*

Before you upload, paste the file into **jsonlint.com** and hit
Validate. It takes five seconds and tells you the exact line if
something's off.

Two rules cover almost every mistake:

- Comma **between** items in a list, never after the last one
- Every name and text value in `"double quotes"` — numbers and
  `true`/`false` go bare

---

## Publishing a change

Commit the changed file and push to GitHub, same as any other edit —
Cloudflare Pages redeploys automatically within a minute or two of
the push. You can watch it happen under **Deployments** in the
Cloudflare dashboard.

You don't need to touch `public/js/config.js`, `functions/`, `worker.js`,
or anything else to restock — just the one JSON file for the shop
you're changing.
