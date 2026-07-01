document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  loadProjects();
  initModal();
  initMatrix();
  initToast();
  initStickyCta();
});

const prefersReducedMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// projects
let projects = [];
let activeProject = -1;

async function loadProjects() {
  try {
    const res = await fetch('data/projects.json');
    projects = (await res.json()).slice(0, 6);
  } catch (err) {
    console.error('Error loading projects:', err);
    return;
  }
  renderProjects();
  initDrawer();
}

function renderProjects() {
  const list = document.getElementById('projectList');
  if (!list) return;

  list.innerHTML = projects.map((p, i) => `
    <div class="project-row" data-index="${i}">
      <button type="button" class="project-btn" aria-expanded="false">
        <span class="row-left">
          <span class="row-cat">${escapeHtml(p.cat)}</span>
          <span class="row-name">${escapeHtml(p.name)}</span>
        </span>
        <span class="row-tags">${escapeHtml(p.tagline)}</span>
      </button>
    </div>
  `).join('');

  list.querySelectorAll('.project-btn').forEach(function (btn) {
    const row = btn.closest('.project-row');
    const index = Number(row.dataset.index);
    btn.addEventListener('click', function () {
      toggleProject(index);
    });
  });
}

function initDrawer() {
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('drawerClose');
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
}

function toggleProject(index) {
  if (activeProject === index) {
    closeDrawer();
  } else {
    openDrawer(index);
  }
}

function openDrawer(index) {
  const p = projects[index];
  if (!p) return;
  activeProject = index;

  document.getElementById('drawerCat').textContent = p.cat;
  document.getElementById('drawerName').textContent = p.name;
  document.getElementById('drawerDesc').innerHTML = p.desc;

  renderShot(document.getElementById('drawerShot'), p);

  const chips = (p.tech && p.tech.length) ? p.tech : p.tagline.split(' · ');
  const tags = document.getElementById('drawerTags');
  tags.innerHTML = chips.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join('');

  const visit = document.getElementById('drawerVisit');
  if (p.url) {
    visit.href = p.url;
    visit.hidden = false;
  } else {
    visit.hidden = true;
  }

  document.querySelectorAll('.project-row').forEach(function (row) {
    const isActive = Number(row.dataset.index) === index;
    row.classList.toggle('is-active', isActive);
    const btn = row.querySelector('.project-btn');
    if (btn) btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });

  document.getElementById('drawer').classList.add('is-open');
  document.getElementById('drawer').removeAttribute('inert');
  document.getElementById('drawerBackdrop').classList.add('is-open');
}

function closeDrawer() {
  if (activeProject === -1) return;
  activeProject = -1;
  document.getElementById('drawer').classList.remove('is-open');
  document.getElementById('drawer').setAttribute('inert', '');
  document.getElementById('drawerBackdrop').classList.remove('is-open');
  document.querySelectorAll('.project-row.is-active').forEach(function (row) {
    row.classList.remove('is-active');
    const btn = row.querySelector('.project-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
  activeSlider = null;
}

// slider
function renderShot(shot, p) {
  const imgs = Array.isArray(p.image) ? p.image : (p.image ? [p.image] : []);

  if (!imgs.length) {
    shot.innerHTML = `<span class="shot-placeholder">screenshot — ${escapeHtml(p.name)}</span>`;
    return;
  }

  const slides = imgs.map((src, i) =>
    `<img src="${escapeHtml(src)}" alt="Screenshot ${i + 1} of ${escapeHtml(p.name)}" draggable="false" />`
  ).join('');

  if (imgs.length === 1) {
    shot.innerHTML = `<div class="shot-slider"><div class="shot-track">${slides}</div></div>`;
    return;
  }

  const dots = imgs.map((_, i) =>
    `<button type="button" class="shot-dot${i === 0 ? ' is-active' : ''}" data-go="${i}" aria-label="Go to image ${i + 1}"></button>`
  ).join('');

  shot.innerHTML = `
    <div class="shot-slider" data-index="0">
      <div class="shot-track">${slides}</div>
      <button type="button" class="shot-nav shot-prev" aria-label="Previous image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button type="button" class="shot-nav shot-next" aria-label="Next image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="shot-dots">${dots}</div>
    </div>`;

  wireSlider(shot.querySelector('.shot-slider'), imgs.length);
}

function wireSlider(slider, count) {
  const track = slider.querySelector('.shot-track');
  const dots = Array.from(slider.querySelectorAll('.shot-dot'));

  function go(i) {
    const index = (i + count) % count;
    slider.dataset.index = String(index);
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle('is-active', di === index));
  }

  slider.querySelector('.shot-prev').addEventListener('click', () => go(Number(slider.dataset.index) - 1));
  slider.querySelector('.shot-next').addEventListener('click', () => go(Number(slider.dataset.index) + 1));
  dots.forEach(d => d.addEventListener('click', () => go(Number(d.dataset.go))));

  // swipe
  let startX = null;
  track.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  track.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(Number(slider.dataset.index) + (dx < 0 ? 1 : -1));
  });

  activeSlider = { go, getIndex: () => Number(slider.dataset.index), count };
}

let activeSlider = null;

// matrix rain
let rafId = null;
let resizeHandler = null;

function startMatrix() {
  if (prefersReducedMotion) return;
  // The rain panel is hidden on mobile (display:none) — skip the animation
  // so the rAF loop doesn't spin behind a zero-size canvas.
  if (window.matchMedia('(max-width: 720px)').matches) return;
  const canvas = document.getElementById('rainCanvas');
  if (!canvas) return;
  stopMatrix();

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cell = 22;
  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  const palette = () => ['#2c2c24', '#2c2c24', cssVar('--rain-accent', '#DC5A3C'), '#829664'];
  const pick = () => { const p = palette(); return p[Math.floor(Math.random() * p.length)]; };

  let w = 0, h = 0, drops = null;

  const ensure = () => {
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.max(1, Math.ceil(w / cell));
    if (!drops || drops.length !== cols) {
      drops = Array.from({ length: cols }, () => ({
        row: -Math.floor(Math.random() * (h / cell) + 2),
        color: pick(),
        stepMs: 80 + Math.random() * 120,
        acc: 0
      }));
    }
    ctx.fillStyle = '#14140f';
    ctx.fillRect(0, 0, w, h);
    return true;
  };

  resizeHandler = () => ensure();
  window.addEventListener('resize', resizeHandler);

  let prev = performance.now();
  const tick = (now) => {
    if (w < 2) {
      if (!ensure()) { rafId = requestAnimationFrame(tick); return; }
    }
    const dt = Math.min(now - prev, 60); prev = now;
    ctx.fillStyle = 'rgba(20,20,15,0.10)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.82;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.acc += dt;
      if (d.acc >= d.stepMs) {
        d.acc = 0;
        d.row++;
        if (d.row * cell > h + cell) {
          d.row = -Math.floor(Math.random() * 14 + 2);
          d.color = pick();
          d.stepMs = 80 + Math.random() * 120;
        }
      }
      ctx.fillStyle = d.color;
      ctx.fillRect(i * cell + 2, d.row * cell + 2, cell - 4, cell - 4);
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopMatrix() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
}

function initMatrix() {}

// sticky cta: fade the desktop floating button out once the footer button is
// in view, and back in when it scrolls away — never both at once
function initStickyCta() {
  const floatEl = document.getElementById('ctaFloat');
  const anchor = document.querySelector('.reach-out .cta-btn');
  if (!floatEl || !anchor || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(function (entries) {
    floatEl.classList.toggle('is-docked', entries[0].isIntersecting);
  }, { threshold: 0 });
  io.observe(anchor);
}

// Cloudflare Turnstile is loaded lazily — only when the contact
// modal first opens — so it costs nothing (script, main-thread work,
// third-party cookies) on the initial page load. The default api.js
// auto-renders the existing .cf-turnstile widget once it arrives.
let turnstileLoaded = false;
function loadTurnstile() {
  if (turnstileLoaded) return;
  turnstileLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

// modal
function openContactModal() {
  const overlay = document.getElementById('cardModal');
  if (!overlay) return;
  overlay.classList.add('is-open');
  overlay.removeAttribute('inert');
  loadTurnstile();
  startMatrix();
}

function closeContactModal() {
  const overlay = document.getElementById('cardModal');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('inert', '');
  stopMatrix();
}

function initModal() {
  const overlay = document.getElementById('cardModal');
  const closeBtn = document.getElementById('cardModalClose');
  const card = document.getElementById('modalCard');
  const form = document.getElementById('contactForm');
  if (!overlay) return;

  document.querySelectorAll('.open-card-modal').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openContactModal();
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeContactModal);
  if (card) card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeContactModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (overlay.classList.contains('is-open')) {
        closeContactModal();
      } else if (activeProject !== -1) {
        closeDrawer();
      }
      return;
    }
    if (activeProject !== -1 && activeSlider && !overlay.classList.contains('is-open')) {
      if (e.key === 'ArrowLeft') activeSlider.go(activeSlider.getIndex() - 1);
      if (e.key === 'ArrowRight') activeSlider.go(activeSlider.getIndex() + 1);
    }
  });

  if (form) initContactForm(form);
}

const SENT_MSG = "Thanks! Your message is on its way. I'll be in touch soon.";
const ERR_MSG = 'Something went wrong. Please try again or email rumeal@rldevelopit.com.';

function initContactForm(form) {
  const submitBtn = form.querySelector('.submit-btn');
  const endpoint = form.getAttribute('action') || 'contact.php';

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    if (on) {
      submitBtn.dataset.label = submitBtn.dataset.label || submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="btn-spinner"></span>Sending…';
    } else if (submitBtn.dataset.label) {
      submitBtn.innerHTML = submitBtn.dataset.label;
    }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
      });
      let payload = {};
      try { payload = await res.json(); } catch (_) {}

      if (res.ok && payload.ok) {
        markFormSuccess(form, SENT_MSG);
      } else {
        markFormError(form, payload.error || ERR_MSG);
        setLoading(false);
        if (window.turnstile) window.turnstile.reset();
      }
    } catch (err) {
      markFormError(form, 'Network error. Please try again or email rumeal@rldevelopit.com.');
      setLoading(false);
      if (window.turnstile) window.turnstile.reset();
    }
  });
}

function markFormSuccess(form, message) {
  form.classList.remove('is-error');
  form.classList.add('is-success');
  form.querySelectorAll('input, textarea, button').forEach(function (el) { el.disabled = true; });
  const submitBtn = form.querySelector('.submit-btn');
  if (submitBtn) submitBtn.innerHTML = 'Message sent';
  showToast('success', message);
}

function markFormError(form, message) {
  form.classList.remove('is-success');
  form.classList.add('is-error');
  showToast('error', message);
}

// toast
const ICON_OK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="m8 12 2.5 2.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_BAD = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
let toastTimer = null;

function showToast(type, message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const msgEl = document.getElementById('toastMsg');
  const iconEl = toast.querySelector('.toast-icon');
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.innerHTML = type === 'success' ? ICON_OK : ICON_BAD;
  toast.classList.remove('is-success', 'is-error');
  toast.classList.add('is-' + type, 'is-open');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  const toast = document.getElementById('toast');
  if (toast) toast.classList.remove('is-open');
}

function initToast() {
  const closeBtn = document.getElementById('toastClose');
  if (closeBtn) closeBtn.addEventListener('click', hideToast);
}

// theme
function initTheme() {
  const root = document.documentElement;
  const modeBtn = document.getElementById('themeMode');
  const trigger = document.getElementById('accentTrigger');
  const menu = document.getElementById('accentMenu');
  const label = document.getElementById('accentLabel');
  const swatch = document.getElementById('accentSwatch');

  const NAMES = { red: 'Red', green: 'Green', fun: 'Fun' };
  const blackOptLabel = document.getElementById('blackOptLabel');
  const isDark = () => root.getAttribute('data-mode') === 'dark';
  const accentName = (a) => a === 'black' ? (isDark() ? 'White' : 'Dark') : (NAMES[a] || 'Red');
  const refreshMonoLabel = () => { if (blackOptLabel) blackOptLabel.textContent = isDark() ? 'White' : 'Dark'; };

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  function setMode(mode) {
    root.setAttribute('data-mode', mode);
    if (modeBtn) modeBtn.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    store('rl-mode', mode);
    refreshMonoLabel();
    syncAccentUI(root.getAttribute('data-accent') || 'red');
  }
  if (modeBtn) {
    modeBtn.setAttribute('aria-pressed', root.getAttribute('data-mode') === 'dark' ? 'true' : 'false');
    modeBtn.addEventListener('click', function () {
      setMode(root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark');
    });
  }

  function syncAccentUI(accent) {
    if (label) label.textContent = accentName(accent);
    if (swatch) swatch.classList.toggle('swatch--fun', accent === 'fun');
    if (menu) menu.querySelectorAll('.theme-opt').forEach(function (opt) {
      opt.setAttribute('aria-selected', opt.dataset.accent === accent ? 'true' : 'false');
    });
  }

  function setAccent(accent) {
    root.setAttribute('data-accent', accent);
    store('rl-accent', accent);
    if (accent === 'fun') startFun(); else stopFun();
    syncAccentUI(accent);
  }

  if (trigger && menu) {
    const closeMenu = () => { menu.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); };
    const openMenu = () => { menu.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); };

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.contains('is-open') ? closeMenu() : openMenu();
    });
    menu.querySelectorAll('.theme-opt').forEach(function (opt) {
      opt.addEventListener('click', function () { setAccent(opt.dataset.accent); closeMenu(); });
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && e.target !== trigger) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
    });
  }

  refreshMonoLabel();
  const current = root.getAttribute('data-accent') || 'red';
  syncAccentUI(current);
  if (current === 'fun') startFun();
}

// fun accent
let funRaf = null;

function startFun() {
  stopFun();
  if (prefersReducedMotion) { applyHue(285); return; }
  const degPerMs = 360 / 38000;
  let prev = performance.now();
  let hue = (prev / 38000 * 360) % 360;
  const loop = (now) => {
    hue = (hue + (now - prev) * degPerMs) % 360;
    prev = now;
    applyHue(hue);
    funRaf = requestAnimationFrame(loop);
  };
  funRaf = requestAnimationFrame(loop);
}

function stopFun() {
  if (funRaf) { cancelAnimationFrame(funRaf); funRaf = null; }
  ['--accent', '--accent-strong', '--accent-rgb', '--rain-accent'].forEach(function (p) {
    document.documentElement.style.removeProperty(p);
  });
}

function applyHue(h) {
  const root = document.documentElement;
  const [r, g, b] = hslToRgb(h, 0.62, 0.52);
  const [dr, dg, db] = hslToRgb(h, 0.62, 0.44);
  root.style.setProperty('--accent', `rgb(${r}, ${g}, ${b})`);
  root.style.setProperty('--accent-strong', `rgb(${dr}, ${dg}, ${db})`);
  root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--rain-accent', `rgb(${r}, ${g}, ${b})`);
}

function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  ];
}
