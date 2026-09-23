// ─────────────────────────────────────────────────────────
// SHOP ENGINE — shared by the Pickup and Catering pages.
//
// There is NO product information in this file. It reads whichever
// catalog the page points at via <body data-catalog="..."> and
// builds itself from that. To restock, edit the JSON — see
// RESTOCKING.md. You should never need to open this file.
//
// Prices shown here are for display only. The real total is
// calculated again on the server at checkout, so a customer
// editing this page in their browser can't change what they pay.
// ─────────────────────────────────────────────────────────

let CATALOG = null;
const qtys = {};
const cart = [];

// ── Load the catalog, then draw the shop ──────────────────
async function initShop() {
  const grid = document.getElementById('productsGrid');
  const file = document.body.dataset.catalog;
  if (!grid || !file) return;

  grid.innerHTML = '<p class="shop-loading">Loading today\'s menu…</p>';

  try {
    const res = await fetch(file, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    CATALOG = await res.json();
  } catch (err) {
    console.error('Catalog load failed:', err);
    grid.innerHTML = `<p class="shop-loading">We couldn't load the menu just now.
      Please refresh, or call us at ${BUSINESS_PHONE} to order.</p>`;
    return;
  }

  renderProducts();
  applyLeadTimeMinimum();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  let html = '';

  CATALOG.products.forEach(p => {
    qtys[p.id] = 1;
    const soldOut = !!p.soldOut;

    html += `<div class="product-card${soldOut ? ' sold-out' : ''}${p.contactOnly ? ' contact-only' : ''}">`;
    html += `<div class="product-img">`;
    if (soldOut) html += `<div class="sold-out-badge">Sold Out</div>`;
    html += `<img src="${p.img}" alt="${p.alt || p.name}"></div>`;
    html += `<div class="product-body">`;
    html += `<div class="product-name">${p.name}</div>`;
    html += `<div class="product-desc">${p.desc}</div>`;
    if (p.metaNote) html += `<div class="product-meta-note">${p.metaNote}</div>`;

    // contactOnly products (e.g. "Custom Order — call for pricing") have no
    // fixed price, so there's nothing to charge and nothing to add to a
    // cart — they skip straight to a Contact Us button instead.
    if (p.contactOnly) {
      if (p.priceSub) html += `<div class="product-price-sub contact-note">${p.priceSub}</div>`;
      const subject = encodeURIComponent(`Custom order inquiry — ${p.name}`);
      html += `<a class="add-btn contact-btn" href="mailto:${BUSINESS_EMAIL}?subject=${subject}">Contact Us</a>`;
      html += `</div></div>`;
      return; // skip the normal price/qty/cart markup below entirely
    }

    html += `<div class="product-price">$${p.price.toFixed(2)}</div>`;
    if (p.priceSub) html += `<div class="product-price-sub">${p.priceSub}</div>`;

    if (!soldOut) {
      html += `<div class="qty-row">
        <button class="qty-btn" data-action="qty-minus" data-id="${p.id}" aria-label="Decrease quantity">−</button>
        <span class="qty-val" id="qty-${p.id}">1</span>
        <button class="qty-btn" data-action="qty-plus" data-id="${p.id}" aria-label="Increase quantity">+</button>
      </div>`;

      if (p.kit) {
        html += `<label class="kit-row">
          <input type="checkbox" id="kit-${p.id}">
          <div class="kit-label">
            <strong>Add Essentials Kit</strong>
            ${p.kit.label}
            <div class="kit-price">+$${p.kit.price.toFixed(2)} per pack</div>
          </div>
        </label>`;
      }

      html += `<button class="add-btn" data-action="add-to-cart" data-id="${p.id}">Add to Cart</button>`;
    } else {
      html += `<button class="add-btn" disabled>Sold Out</button>`;
    }

    html += `</div></div>`;
  });

  grid.innerHTML = html;
}

// Stops someone picking a pickup time sooner than we can bake.
// The server enforces this too — this is just so they find out
// before they get to the payment page.
function applyLeadTimeMinimum() {
  const field = document.getElementById('f-pickup');
  if (!field) return;
  const maxLead = Math.max(0, ...CATALOG.products.map(p => Number(p.leadHours) || 0));
  const earliest = new Date(Date.now() + maxLead * 3600 * 1000);
  // datetime-local wants local time in YYYY-MM-DDTHH:MM, not UTC.
  const pad = n => String(n).padStart(2, '0');
  field.min = `${earliest.getFullYear()}-${pad(earliest.getMonth() + 1)}-${pad(earliest.getDate())}`
            + `T${pad(earliest.getHours())}:${pad(earliest.getMinutes())}`;
  const hint = document.getElementById('leadTimeHint');
  if (hint && maxLead > 0) hint.textContent = `We need at least ${maxLead} hours' notice.`;
}

// ── Cart ──────────────────────────────────────────────────
function changeQty(id, delta) {
  qtys[id] = Math.max(1, qtys[id] + delta);
  document.getElementById('qty-' + id).textContent = qtys[id];
}

function addToCart(id) {
  const product = CATALOG.products.find(p => p.id === id);
  if (!product || product.soldOut) return;

  const qty = qtys[id];
  const kitBox = document.getElementById('kit-' + id);
  const kitChecked = kitBox ? kitBox.checked : false;
  const kitPrice = product.kit ? product.kit.price : 0;

  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += qty;
    existing.itemTotal = +(existing.qty * existing.price).toFixed(2);
    if (kitChecked) {
      existing.kitQty += qty;
      existing.kitTotal = +(existing.kitQty * existing.kitPrice).toFixed(2);
    }
  } else {
    cart.push({
      id, name: product.name, price: product.price, qty,
      itemTotal: +(product.price * qty).toFixed(2),
      kitPrice,
      kitQty: kitChecked ? qty : 0,
      kitTotal: kitChecked ? +(kitPrice * qty).toFixed(2) : 0
    });
  }
  renderCart();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  renderCart();
}

function renderCart() {
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');

  if (!cart.length) {
    body.innerHTML = '<div class="cart-empty">Your cart is empty — add something above!</div>';
    footer.style.display = 'none';
    return;
  }

  let subtotal = 0, html = '';
  cart.forEach((i, idx) => {
    html += `<div class="cart-item-row"><span class="cart-item-name">${i.name} &times;${i.qty}</span><span class="cart-item-price">$${i.itemTotal.toFixed(2)}</span><button class="cart-remove" data-action="remove-from-cart" data-idx="${idx}" aria-label="Remove ${i.name}">&times;</button></div>`;
    subtotal += i.itemTotal;
    if (i.kitQty > 0) {
      html += `<div class="cart-item-row" style="font-size:15px;color:#888;"><span class="cart-item-name">&nbsp;&nbsp;+ Essentials Kit &times;${i.kitQty}</span><span class="cart-item-price">$${i.kitTotal.toFixed(2)}</span></div>`;
      subtotal += i.kitTotal;
    }
  });
  body.innerHTML = html;

  const rate = CATALOG.taxRate || 0;
  const tax = +(subtotal * rate).toFixed(2);
  document.getElementById('cartSubtotal').innerHTML = `<span>Subtotal</span><span>$${subtotal.toFixed(2)}</span>`;
  document.getElementById('cartTax').innerHTML = `<span>Estimated tax (${(rate * 100).toFixed(1)}%)</span><span>$${tax.toFixed(2)}</span>`;
  document.getElementById('cartTotal').innerHTML = `<span>Total</span><span>$${(subtotal + tax).toFixed(2)}</span>`;
  footer.style.display = 'block';
}

// ── Checkout ──────────────────────────────────────────────
async function goToCheckout() {
  const btn = document.querySelector('.checkout-btn');
  const errBox = document.getElementById('checkoutError');
  errBox.style.display = 'none';

  const customer = {
    name: document.getElementById('f-name').value.trim(),
    phone: document.getElementById('f-phone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    pickupAt: document.getElementById('f-pickup').value,
    notes: document.getElementById('f-notes').value.trim()
  };

  if (!customer.name || !customer.phone || !customer.email) {
    showCheckoutError('Please fill in your name, phone number, and email.');
    document.getElementById('pickupFormBox').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (!customer.pickupAt) {
    showCheckoutError('Please choose a pickup date and time.');
    document.getElementById('f-pickup').focus();
    return;
  }
  if (!cart.length) {
    showCheckoutError('Your cart is empty.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Preparing your order…';

  try {
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop: CATALOG.shop,
        // Only IDs and quantities — the server looks up the prices.
        items: cart.map(i => ({ id: i.id, qty: i.qty, kit: i.kitQty > 0 })),
        customer
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showCheckoutError(data.error || 'We couldn\'t start checkout. Please try again.');
      return;
    }

    // Hand off to Square's hosted, PCI-compliant payment page.
    window.location.href = data.url;
  } catch (err) {
    console.error('Checkout failed:', err);
    showCheckoutError(`We couldn't reach our payment system. Please try again, or call us at ${BUSINESS_PHONE}.`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continue to Payment →';
  }
}

function showCheckoutError(msg) {
  const box = document.getElementById('checkoutError');
  box.textContent = msg;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// One listener for every product/cart button. Using data-action
// instead of inline onclick means product names with apostrophes
// (a "Baker's Dozen") can't break the page.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id, idx } = el.dataset;
  if (action === 'qty-minus') changeQty(id, -1);
  else if (action === 'qty-plus') changeQty(id, 1);
  else if (action === 'add-to-cart') addToCart(id);
  else if (action === 'remove-from-cart') removeFromCart(parseInt(idx, 10));
});

document.addEventListener('DOMContentLoaded', initShop);
