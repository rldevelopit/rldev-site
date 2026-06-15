document.addEventListener('DOMContentLoaded', function() {
  loadProjects();
  initCardModal();
});

async function loadProjects() {
  try {
    const response = await fetch('data/projects.json');
    const projects = await response.json();
    renderProjects(projects.slice(0, 6));
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

function renderProjects(projects) {
  const grid = document.querySelector('.project-grid');
  if (!grid) return;

  grid.innerHTML = projects.map(project => {
    const desc = project.description;
    const needsTruncate = desc.length > 400;
    const truncated = needsTruncate ? desc.slice(0, 400).replace(/\s+\S*$/, '') + '&hellip;' : desc;

    return `
      <div class="project-card">
        <div class="project-image">
          ${project.images[0] ? `<img src="${project.images[0]}" alt="${project.name}" />` : ''}
        </div>
        <div class="project-details">
          <h3>${project.url ? `<a href="${project.url}" target="_blank" rel="noopener">${project.name}</a>` : project.name}</h3>
          <div class="project-description${needsTruncate ? ' is-truncated' : ''}">
            <p>${needsTruncate ? truncated : desc}</p>
            ${needsTruncate ? `<button class="read-more-btn" aria-expanded="false">Read more</button>` : ''}
          </div>
          <div class="tech-tags">
            ${project.tech.map(t => `<span>${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.read-more-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const wrapper = this.closest('.project-description');
      const isExpanded = wrapper.classList.contains('is-expanded');

      if (isExpanded) {
        wrapper.classList.remove('is-expanded');
        wrapper.classList.add('is-truncated');
        this.textContent = 'Read more';
        this.setAttribute('aria-expanded', 'false');
        wrapper.closest('.project-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        wrapper.classList.remove('is-truncated');
        wrapper.classList.add('is-expanded');
        this.textContent = 'Read less';
        this.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function initCardModal() {
  const overlay = document.getElementById('cardModal');
  const closeBtn = document.getElementById('cardModalClose');
  const form = document.getElementById('contactForm');
  if (!overlay) return;

  document.querySelectorAll('.open-card-modal').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      overlay.classList.add('is-open');
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      overlay.classList.remove('is-open');
    });
  }

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      overlay.classList.remove('is-open');
    }
  });

  if (form) {
    const submitBtn = form.querySelector('.contact-submit')
      || document.querySelector('button[form="contactForm"]');
    const status = document.getElementById('contactStatus');
    const endpoint = form.getAttribute('action') || 'contact.php';

    function setStatus(text, state) {
      if (!status) return;
      status.textContent = text;
      status.classList.remove('is-error', 'is-success', 'is-loading');
      if (state) status.classList.add('is-' + state);
    }

    form.addEventListener('submit', async function(e) {
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
          setStatus("Thanks — your message is on its way. I'll be in touch soon.", 'success');
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
}
