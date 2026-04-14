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
  const card = document.getElementById('businessCard');
  const closeBtn = document.getElementById('cardModalClose');
  if (!overlay || !card) return;

  // Open modal from "Reach Out" button and nav Contact link
  document.querySelectorAll('a[href="mailto:hello@rumeallovell.com"], .open-card-modal').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      card.classList.remove('is-flipped');
      overlay.classList.add('is-open');
    });
  });

  // Flip card on click
  card.addEventListener('click', function() {
    card.classList.toggle('is-flipped');
  });

  // Close on X button
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    overlay.classList.remove('is-open');
  });

  // Close on overlay click (outside card)
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.classList.remove('is-open');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      overlay.classList.remove('is-open');
    }
  });
}
