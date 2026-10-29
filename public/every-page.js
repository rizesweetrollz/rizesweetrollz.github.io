// ─────────────────────────────────────────────────────────
// SHARED SITE HEADER
//
// Builds the title bar and navigation menu on every page.
// Each page only needs an empty placeholder where the bar should go:
//
//     <nav id="title-bar"></nav>
//
// The markup and classes match the original index page header, so
// css/style.css styles it on every page. To add or rename a menu
// item, edit NAV_LINKS below. Nothing else needs to change.
//
// This script also points every "Order on DoorDash" link, including
// the ones in page content marked with data-doordash-link, at the
// DOORDASH_LINK set in js/config.js (or the fallback below).
// ─────────────────────────────────────────────────────────

const DOORDASH_FALLBACK = 'https://order.online/business/rize-sweet-rollz-20599577';

const NAV_LINKS = [
    { file: 'index.html',        label: 'Home' },
    { file: 'shop-pickup.html',  label: 'Pickup Shop' },
    { file: 'shop-catering.html', label: 'Catering' },
//    { file: 'subscription.html', label: 'Subscriptions' },
    { file: 'about.html',        label: 'About Us' },
    { file: 'nutrition.html',    label: 'Nutrition' },
    // Calendar: uncomment this line when the calendar is ready to go live.
    // { file: 'calendar.html',   label: 'Calendar' },
];

function getDoorDashLink() {
    return (typeof DOORDASH_LINK !== 'undefined') ? DOORDASH_LINK : DOORDASH_FALLBACK;
}

// Opens or closes the hamburger menu on small screens.
// Called from the hamburger button's onclick attribute.
function toggleMobile() {
    document.getElementById('mobileMenu')?.classList.toggle('open');
}

function loadTitleBar() {
    const bar = document.getElementById('title-bar');
    if (!bar) return;

    const doordash = getDoorDashLink();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const desktopLinks = NAV_LINKS.map(link => {
        const activeAttr = link.file === currentPage ? ' class="active"' : '';
        return `\t\t<li><a href="${link.file}"${activeAttr}>${link.label}</a></li>`;
    }).join('\n');

    const mobileLinks = NAV_LINKS.map(link =>
        `\t\t<a href="${link.file}">${link.label}</a>`
    ).join('\n');

    bar.innerHTML = `
\t    <a class="nav-logo" href="index.html">
\t\t<img src="images/rize-logo-small.png" alt="Rize Sweet Rollz logo">
\t\t<span class="nav-logo-text">Rize Sweet Rollz</span>
\t    </a>
\t    <ul class="nav-links">
${desktopLinks}
\t    </ul>
\t    <a class="nav-order-btn" href="${doordash}" target="_blank" rel="noopener">Order on DoorDash</a>
\t    <button class="hamburger" onclick="toggleMobile()" aria-label="Menu">
\t\t<span></span><span></span><span></span>
\t    </button>
\t    <div class="mobile-menu" id="mobileMenu">
${mobileLinks}
\t\t<a href="${doordash}" target="_blank" rel="noopener">Order on DoorDash</a>
\t    </div>
\t`;
}

function wireDoorDashLinks() {
    const doordash = getDoorDashLink();
    document.querySelectorAll('[data-doordash-link]').forEach(el => {
        el.href = doordash;
    });
}

// Shows the running version in the footer on every page, and on test
// previews (anything that isn't the live site) a banner across the top
// naming the branch, so a test copy is never mistaken for the real one.
// Quietly does nothing where /version doesn't exist (e.g. a plain local
// file server).
async function showVersionInfo() {
    let info;
    try {
        const res = await fetch('/version', { cache: 'no-store' });
        if (!res.ok) return;
        info = await res.json();
    } catch {
        return;
    }

    const shortId = info.id ? info.id.slice(0, 8) : 'unknown';
    const footer = document.querySelector('footer');
    if (footer) {
        const ver = document.createElement('div');
        ver.className = 'footer-version';
        ver.textContent = `Version ${shortId}`;
        footer.appendChild(ver);
    }

    if (info.live) return;

    // Preview addresses look like <branch>-rizesweetrollz-github-io.<account>.workers.dev
    const host = window.location.hostname;
    const match = host.match(/^(.+?)-rizesweetrollz-github-io\./);
    const branch = match ? match[1] : host;
    const deployed = info.timestamp
        ? new Date(info.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        : '';

    const banner = document.createElement('div');
    banner.className = 'test-banner';
    banner.textContent = ['TEST SITE', `branch ${branch}`, `version ${shortId}`, deployed && `deployed ${deployed}`]
        .filter(Boolean).join(' · ');
    document.body.prepend(banner);
}

function initSitePage() {
    loadTitleBar();
    wireDoorDashLinks();
    showVersionInfo();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSitePage);
} else {
    initSitePage();
}
