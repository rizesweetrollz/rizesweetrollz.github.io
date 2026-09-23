# Setup — what you need to do

About 30 minutes, once. Nothing here requires writing code.

A correction up front: earlier guidance in this file described
connecting a repo through Cloudflare **Pages**. When you actually did
it, Cloudflare put the project on its newer **Workers** product
instead (you can tell because the URL ends in `.workers.dev`, not
`.pages.dev`). That's not something you did wrong — it's just what
Cloudflare's dashboard defaults to now. The site has been restructured
to match: a `public/` folder holds everything a visitor sees, and
`worker.js` + `wrangler.jsonc` at the repo root tell Cloudflare to
serve `public/` directly for every request except `/create-checkout`,
which runs the checkout function. Steps below match this as it
actually works now.

Steps 1–5 use Square's **Sandbox** (fake money), so you can place
fake orders and confirm everything works before real cards are
involved. Step 6 flips it to real money.

---

## Step 1 — Get this code into your GitHub repo, on its own branch

Keeps your live GitHub Pages site untouched while you test this.

1. On github.com, open your repo → branch dropdown → type a new name
   like `cloudflare-site` → **Create branch**
2. Make sure the branch selector still shows that branch, then upload
   this folder's contents the same way you did before

**Every file matters this time** — including the ones you can't see
change (`wrangler.jsonc`, `worker.js`, the `public/` folder itself).
If your upload method only adds files and can't overwrite or move
existing ones, the safest path is: delete everything in the repo on
this branch first, then upload this folder fresh. Half-old-half-new
is exactly what caused the "wrong content" issue you ran into.

---

## Step 2 — Point Cloudflare at that branch

You already have a Workers project connected (`rizesweetrollz-github-io`).
Fix its branch rather than reconnecting from scratch:

1. **dash.cloudflare.com → Workers & Pages → your project**
2. **Settings → Build → Branch control**
3. Change the branch dropdown to `cloudflare-site`
4. Save, then trigger a new deployment (push a commit, or use the
   dashboard's redeploy option)

From now on, every push to that branch redeploys automatically —
including editing `public/data/pickup.json` or
`public/data/catering.json` to restock.

Don't test ordering yet — Square isn't connected.

---

## Step 3 — Create a Square developer application

1. **developer.squareup.com/apps**, sign in with your real Square account
2. **+** to create an application, name it `Rize Website`
3. On the Credentials page, set the toggle to **Sandbox**

Copy down two values:

| What | Where |
|---|---|
| **Sandbox Access Token** | Credentials page — click Show |
| **Sandbox Location ID** | Left sidebar → **Locations** |

The access token can move money. Don't email it, don't put it in a
document, don't put it in the website files. It only goes in Step 4.

---

## Step 4 — Give Cloudflare the credentials

**Your Workers project → Settings → Variables and Secrets → Add.**

Add these three, as **Secret** (not plain text) where offered:

| Variable name | Value |
|---|---|
| `SQUARE_ACCESS_TOKEN` | your Sandbox access token |
| `SQUARE_LOCATION_ID` | your Sandbox location ID |
| `SQUARE_ENV` | `sandbox` |

Then trigger a fresh deployment — environment variables only take
effect on the next deploy, not retroactively.

---

## Step 5 — Place a fake order

Go to your site's Pickup Shop and order something. At the Square
payment page, use the test card:

- Card number `4111 1111 1111 1111`
- Any future expiry, any CVV, any ZIP

Check all four of these:

1. The Square page shows the **correct total** and your items listed
2. After paying you land on the **thank-you page** with a reference code
3. In **Square Sandbox Dashboard**, the order shows up with the
   customer's name, phone, and pickup time
4. The pickup time in Square matches what you picked — **not several
   hours off**

If #4 is wrong, tell me — that's a timezone setting and it's a
one-line fix.

---

## Step 6 — Switch to real money

Only once Step 5 works completely.

1. On developer.squareup.com, flip the toggle to **Production**
2. Copy the **Production Access Token** and **Production Location ID**
3. Update the same three Cloudflare variables to the production values
   and set `SQUARE_ENV` to `production`
4. Redeploy
5. **Place one real order with your own card**, then refund it from
   the Square dashboard. Worth the few cents in fees to know it works.

---

## Step 7 — Two details to fix

**Your phone number.** Open `public/js/config.js` and replace the
placeholder in `BUSINESS_PHONE`. It's shown to customers if checkout
ever fails, so it needs to be real.

**Your tax rate.** Both `public/data/pickup.json` and
`public/data/catering.json` have `"taxRate": 0.03` — Utah's reduced
grocery-food rate. Prepared food is often taxed at the full combined
rate instead. **Check with your accountant** — I'm not one, and
getting this wrong compounds quietly over hundreds of orders.

---

## Optional — a custom domain

Your Workers project → **Settings → Domains & Routes → Add.** If you
own `rizesweetrollz.com`, point it here; Cloudflare issues the HTTPS
certificate automatically, free.

---

## Testing changes locally before you push (optional)

```
npx wrangler dev
```

runs the whole site — static pages and the checkout function —
on your own computer. Create a file named `.dev.vars` in this folder
(same level as `wrangler.jsonc`) with:

```
SQUARE_ACCESS_TOKEN=your-sandbox-token
SQUARE_LOCATION_ID=your-sandbox-location-id
SQUARE_ENV=sandbox
```

Already in `.gitignore`, so it never gets pushed to GitHub.

---

## If something breaks

Your Workers project → **Logs → Real-time Logs** shows every error
from the checkout function as it happens. The message there will say
what Square rejected. Send it to me and I can tell you what it means.
