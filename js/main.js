document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('clickMe');
  if (btn) {
    btn.addEventListener('click', () => {
      alert('Button clicked!');
    });
  }
});