document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('clickMe');
  if (btn) {
    btn.addEventListener('click', () => {
      alert('Button clicked!');
    });
  }

  loadProjects();
});

async function loadProjects() {
  try {
    const response = await fetch('data/projects.json');
    const projects = await response.json();
    renderProjects(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

function renderProjects(projects) {
  const workSection = document.querySelector('.work .container');
  const existingWorkItems = workSection.querySelector('.work-item');
  
  if (existingWorkItems) {
    existingWorkItems.remove();
  }

  projects.forEach(project => {
    const workItem = document.createElement('div');
    workItem.className = 'work-item';
    
    workItem.innerHTML = `
      <div style="background-image:url('${project.images[0]}')" class="work-item-image">
      </div>
      <div class="work-item-details">
        <h3>${project.name}</h3>
        <div class="tech">
          ${project.tech.map(tech => `<span>${tech}</span>`).join('')}
        </div>
        <p>${project.description}</p>
        
      </div>
    `;
    
    workSection.appendChild(workItem);
  });
}