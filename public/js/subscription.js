// ─────────────────────────────────────────────────────────
// SUBSCRIPTION PAGE
//
// Shows the plans in data/subscription.json and starts Square's
// subscription checkout. The browser sends only the plan's id and the
// customer's details. The server looks up the real Square plan, so a
// visitor can't change the plan or the price.
// ─────────────────────────────────────────────────────────

const SUBSCRIPTION_ENDPOINT = '/create-subscription-checkout';
let PLANS = [];

document.addEventListener('DOMContentLoaded', loadPlans);

async function loadPlans() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<p class="shop-loading">Loading plans…</p>';
  try {
    const res = await fetch(document.body.dataset.catalog, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    PLANS = (await res.json()).products;
  } catch (err) {
    console.error('Plan load failed:', err);
    grid.innerHTML = `<p class="shop-loading">We couldn't load the plans just now.
      Please refresh, or call us at ${BUSINESS_PHONE}.</p>`;
    return;
  }
  renderPlans();
}

function renderPlans() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = PLANS.map(p => `
    <div class="product-card">
      <div class="product-img"><img src="${p.img}" alt="${p.alt || p.name}"></div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-price">$${Number(p.price).toFixed(2)}</div>
        ${p.priceSub ? `<div class="product-price-sub">${p.priceSub}</div>` : ''}
        <button class="add-btn" data-plan-id="${p.id}">Subscribe</button>
      </div>
    </div>`).join('');
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-plan-id]');
  if (btn) subscribe(btn.dataset.planId, btn);
});

async function subscribe(planId, btn) {
  const errBox = document.getElementById('subscribeError');
  errBox.style.display = 'none';

  const customer = {
    name: document.getElementById('f-name').value.trim(),
    phone: document.getElementById('f-phone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    fulfillment: document.getElementById('f-fulfillment').value,
    notes: document.getElementById('f-notes').value.trim()
  };
  if (!customer.name || !customer.phone || !customer.email) {
    showSubscribeError('Please fill in your name, phone number, and email.');
    document.getElementById('subscribeFormBox').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Starting checkout…';

  try {
    const res = await fetch(SUBSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, customer })
    });
    const data = await res.json();
    if (!res.ok) {
      showSubscribeError(data.error || 'We couldn\'t start your subscription. Please try again.');
      return;
    }
    window.location.href = data.url;
  } catch (err) {
    console.error('Subscription checkout failed:', err);
    showSubscribeError(`We couldn't reach our payment system. Please try again, or call us at ${BUSINESS_PHONE}.`);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function showSubscribeError(msg) {
  const box = document.getElementById('subscribeError');
  box.textContent = msg;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
