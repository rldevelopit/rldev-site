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
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const phone = (data.get('phone') || '').toString().trim();
      const topic = (data.get('topic') || '').toString().trim();
      const details = (data.get('details') || '').toString().trim();

      const subject = topic ? `Reach out: ${topic}` : 'Reach out via rldev.co';
      const bodyLines = [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        topic ? `Topic: ${topic}` : null,
        '',
        details ? 'Details:' : null,
        details || null,
      ].filter(function(l) { return l !== null; });

      const href = 'mailto:rumeal@rldevelopit.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(bodyLines.join('\n'));

      window.location.href = href;
    });
  }
}
