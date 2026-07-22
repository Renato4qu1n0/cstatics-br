class TacticsSearch {
  constructor() {
    this.searchInput = document.getElementById('tacticsSearch');
    this.cards = document.querySelectorAll('.tactic-card');
    this.init();
  }

  init() {
    this.searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      this.filterTactics(query);
    });
  }

  filterTactics(query) {
    this.cards.forEach(card => {
      const title = card.querySelector('.tactic-card__title').textContent.toLowerCase();
      const description = card.querySelector('.tactic-card__description').textContent.toLowerCase();

      const matches = title.includes(query) || description.includes(query);
      card.style.display = matches ? '' : 'none';
    });
  }
}

new TacticsSearch();