class TacticsFilter {
  constructor() {
    this.tactics = [];
    this.filters = {
      side: null,
      map: null,
      category: null,
      difficulty: null
    };
    this.init();
  }

  init() {
    this.loadTactics();
    this.attachEventListeners();
  }

  loadTactics() {
    // Carregar dados do JSON ou atributo data-*
    const tacticsData = document.querySelectorAll('[data-tactic]');
    this.tactics = Array.from(tacticsData).map(el => ({
      side: el.dataset.side,
      map: el.dataset.map,
      category: el.dataset.category,
      difficulty: el.dataset.difficulty,
      element: el
    }));
  }

  attachEventListeners() {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const [filterType, filterValue] = btn.dataset.filter.split(':');
        this.setFilter(filterType, filterValue);
      });
    });
  }

  setFilter(type, value) {
    this.filters[type] = this.filters[type] === value ? null : value;
    this.render();
  }

  render() {
    this.tactics.forEach(tactic => {
      const matches = this.matchesAllFilters(tactic);
      tactic.element.style.display = matches ? 'block' : 'none';
    });
  }

  matchesAllFilters(tactic) {
    return Object.entries(this.filters).every(([key, value]) => {
      return value === null || tactic[key] === value;
    });
  }
}

new TacticsFilter();