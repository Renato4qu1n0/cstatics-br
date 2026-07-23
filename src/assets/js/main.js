document.addEventListener('DOMContentLoaded', () => {
  const catalog = document.querySelector('[data-strategy-catalog]');

  if (!catalog) {
    return;
  }

  const rows = Array.from(document.querySelectorAll('[data-strategy-row]'));
  const searchInput = document.querySelector('[data-filter-search]');
  const sideButtons = Array.from(document.querySelectorAll('[data-filter-type="side"]'));
  const selects = Array.from(document.querySelectorAll('select[data-filter-type]'));
  const countNode = document.querySelector('[data-results-count]');

  const state = {
    search: '',
    side: 'all',
    site: 'all',
    type: 'all',
    round: 'all'
  };

  const updateButtons = () => {
    sideButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.filterValue === state.side);
    });
  };

  const applyFilters = () => {
    let visibleCount = 0;

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const matchesSearch = text.includes(state.search);
      const matchesSide = state.side === 'all' || row.dataset.side === state.side;
      const matchesSite = state.site === 'all' || row.dataset.site === state.site;
      const matchesType = state.type === 'all' || row.dataset.type === state.type;
      const matchesRound = state.round === 'all' || row.dataset.round === state.round;
      const shouldShow = matchesSearch && matchesSide && matchesSite && matchesType && matchesRound;

      row.style.display = shouldShow ? '' : 'none';

      if (shouldShow) {
        visibleCount += 1;
      }
    });

    if (countNode) {
      countNode.textContent = String(visibleCount);
    }
  };

  searchInput?.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  sideButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.side = button.dataset.filterValue;
      updateButtons();
      applyFilters();
    });
  });

  selects.forEach((select) => {
    select.addEventListener('change', (event) => {
      const type = event.target.dataset.filterType;
      state[type] = event.target.value;
      applyFilters();
    });
  });

  updateButtons();
  applyFilters();
});
