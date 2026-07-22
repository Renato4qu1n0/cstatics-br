document.addEventListener('DOMContentLoaded', () => {
  const filters = document.querySelectorAll('[data-filter]');
  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      const target = filter.getAttribute('data-filter');
      if (target) {
        const cards = document.querySelectorAll('.tactic-card');
        cards.forEach((card) => {
          if (target === 'all' || card.dataset.map === target || card.dataset.side === target) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
      }
    });
  });
});
