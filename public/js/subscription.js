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
let selectedPlanId = null;

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
    <div class="product-card${p.id === selectedPlanId ? ' selected' : ''}">
      <div class="product-img"><img src="${p.img}" alt="${p.alt || p.name}"></div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-price">$${Number(p.price).toFixed(2)}</div>
        ${p.priceSub ? `<div class="product-price-sub">${p.priceSub}</div>` : ''}
        <button class="add-btn" data-plan-id="${p.id}">${p.id === selectedPlanId ? 'Selected &check;' : 'Choose This Plan'}</button>
      </div>
    </div>`).join('');
}

// Step 1: choosing a plan highlights it and opens the form below,
// so the customer fills in their details before heading to checkout.
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-plan-id]');
  if (btn) choosePlan(btn.dataset.planId);
});

function choosePlan(planId) {
  selectedPlanId = planId;
  const plan = PLANS.find(p => p.id === planId);
  renderPlans();

  document.getElementById('planSummary').textContent =
    `${plan.name} — $${Number(plan.price).toFixed(2)}${plan.priceSub ? ' ' + plan.priceSub : ''}`;
  document.getElementById('subscribeError').style.display = 'none';

  const box = document.getElementById('subscribeFormBox');
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('f-name').focus({ preventScroll: true });
}

// Step 2: the button at the bottom of the form checks the details
// and sends the customer to Square.
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('subscribeBtn').addEventListener('click', subscribe);
  // Clear a field's red outline as soon as the customer types in it.
  document.querySelectorAll('#subscribeFormBox .form-input').forEach(input => {
    input.addEventListener('input', () => input.classList.remove('invalid'));
  });
});

const REQUIRED_FIELDS = [
  { id: 'f-name', label: 'name' },
  { id: 'f-phone', label: 'phone number' },
  { id: 'f-email', label: 'email' }
];

async function subscribe() {
  const btn = document.getElementById('subscribeBtn');
  document.getElementById('subscribeError').style.display = 'none';

  const missing = REQUIRED_FIELDS.filter(f => !document.getElementById(f.id).value.trim());
  REQUIRED_FIELDS.forEach(f =>
    document.getElementById(f.id).classList.toggle('invalid', missing.includes(f)));
  if (missing.length) {
    const list = new Intl.ListFormat('en', { type: 'conjunction' }).format(missing.map(f => f.label));
    showSubscribeError(`Please enter your ${list}.`);
    document.getElementById(missing[0].id).focus();
    return;
  }

  const customer = {
    name: document.getElementById('f-name').value.trim(),
    phone: document.getElementById('f-phone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    notes: document.getElementById('f-notes').value.trim()
  };

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Starting checkout…';

  try {
    const res = await fetch(SUBSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: selectedPlanId, customer })
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
}
