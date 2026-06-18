document.addEventListener('DOMContentLoaded', function () {
  loadProjects();
  initModal();
  initMatrix();
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

// ---- Projects + drawer -------------------------------------
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

  // Fill drawer content.
  document.getElementById('drawerCat').textContent = p.cat;
  document.getElementById('drawerName').textContent = p.name;
  // desc may contain trusted anchor markup (collaboration links) from our own JSON.
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

  // Active row styling.
  document.querySelectorAll('.project-row').forEach(function (row) {
    const isActive = Number(row.dataset.index) === index;
    row.classList.toggle('is-active', isActive);
    const btn = row.querySelector('.project-btn');
    if (btn) btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });

  document.getElementById('drawer').classList.add('is-open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('drawerBackdrop').classList.add('is-open');
}

function closeDrawer() {
  if (activeProject === -1) return;
  activeProject = -1;
  document.getElementById('drawer').classList.remove('is-open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'true');
  document.getElementById('drawerBackdrop').classList.remove('is-open');
  document.querySelectorAll('.project-row.is-active').forEach(function (row) {
    row.classList.remove('is-active');
    const btn = row.querySelector('.project-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
  activeSlider = null;
  // Drawer content remains for the duration of the slide-out (no re-render).
}

// ---- Drawer image slider -----------------------------------
function renderShot(shot, p) {
  // `image` is an array of srcs; tolerate a bare string or missing value too.
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

  // Touch / pointer swipe.
  let startX = null;
  track.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  track.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(Number(slider.dataset.index) + (dx < 0 ? 1 : -1));
  });

  // Expose for keyboard nav while the drawer is open.
  activeSlider = { go, getIndex: () => Number(slider.dataset.index), count };
}

let activeSlider = null;

// ---- Matrix block rain (modal left panel) ------------------
let rafId = null;
let resizeHandler = null;

function startMatrix() {
  if (prefersReducedMotion) return;
  const canvas = document.getElementById('rainCanvas');
  if (!canvas) return;
  stopMatrix();

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cell = 22;
  const palette = ['#2c2c24', '#2c2c24', '#DC5A3C', '#829664'];
  const pick = () => palette[Math.floor(Math.random() * palette.length)];

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

function initMatrix() { /* canvas lifecycle is driven by modal open/close */ }

// ---- Contact modal -----------------------------------------
function initModal() {
  const overlay = document.getElementById('cardModal');
  const closeBtn = document.getElementById('cardModalClose');
  const card = document.getElementById('modalCard');
  const form = document.getElementById('contactForm');
  if (!overlay) return;

  function openModal() {
    overlay.classList.add('is-open');
    startMatrix();
  }
  function closeModal() {
    overlay.classList.remove('is-open');
    stopMatrix();
  }

  document.querySelectorAll('.open-card-modal').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (card) card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (overlay.classList.contains('is-open')) {
        closeModal();
      } else if (activeProject !== -1) {
        closeDrawer();
      }
      return;
    }
    // Arrow keys page the drawer slider (only when the drawer, not the modal, is open).
    if (activeProject !== -1 && activeSlider && !overlay.classList.contains('is-open')) {
      if (e.key === 'ArrowLeft') activeSlider.go(activeSlider.getIndex() - 1);
      if (e.key === 'ArrowRight') activeSlider.go(activeSlider.getIndex() + 1);
    }
  });

  if (form) initContactForm(form);
}

function initContactForm(form) {
  const submitBtn = form.querySelector('.submit-btn');
  const status = document.getElementById('contactStatus');
  const endpoint = form.getAttribute('action') || 'contact.php';

  function setStatus(text, state) {
    if (!status) return;
    status.textContent = text;
    status.classList.remove('is-error', 'is-success', 'is-loading');
    if (state) status.classList.add('is-' + state);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalLabel = submitBtn.dataset.originalLabel || submitBtn.innerHTML;
      submitBtn.innerHTML = 'Sending…';
    }
    setStatus('', 'loading');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
      });
      let payload = {};
      try { payload = await res.json(); } catch (_) { /* non-JSON response */ }

      if (res.ok && payload.ok) {
        form.reset();
        setStatus("Thanks! Your message is on its way. I'll be in touch soon.", 'success');
        if (window.turnstile) window.turnstile.reset();
      } else {
        setStatus(payload.error || 'Something went wrong. Please try again or email rumeal@rldevelopit.com.', 'error');
        if (window.turnstile) window.turnstile.reset();
      }
    } catch (err) {
      setStatus('Network error. Please try again or email rumeal@rldevelopit.com.', 'error');
      if (window.turnstile) window.turnstile.reset();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.dataset.originalLabel) submitBtn.innerHTML = submitBtn.dataset.originalLabel;
      }
    }
  });
}
