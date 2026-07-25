/* ============================================
   CSTATICS BRASIL - Filtros e busca de lineups
   Filtragem multi-dimensão (mapa/utilitária/lado/dificuldade) + busca textual.
   ============================================ */
(function () {
  const grid = document.getElementById('lineupsGrid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('[data-lineup]'));
  const searchInput = document.getElementById('lineupsSearch');
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');

  const filters = { map: 'all', utility: 'all', side: 'all', difficulty: 'all' };
  let query = '';

  function apply() {
    let visible = 0;

    cards.forEach((card) => {
      const matchesFilters =
        (filters.map === 'all' || card.dataset.map === filters.map) &&
        (filters.utility === 'all' || card.dataset.utility === filters.utility) &&
        (filters.side === 'all' || card.dataset.side === filters.side) &&
        (filters.difficulty === 'all' || card.dataset.difficulty === filters.difficulty);

      const matchesSearch = query === '' || (card.dataset.search || '').includes(query);
      const show = matchesFilters && matchesSearch;

      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    if (resultsCount) resultsCount.textContent = visible;
    if (emptyState) emptyState.classList.toggle('hidden', visible !== 0);
  }

  // Chips de filtro
  document.querySelectorAll('[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const [dimension, value] = chip.dataset.filter.split(':');
      if (!(dimension in filters)) return;

      filters[dimension] = value;

      // Atualiza o estado ativo apenas dentro da mesma linha (dimensão)
      const row = chip.closest('.filter-row');
      if (row) {
        row.querySelectorAll('[data-filter]').forEach((c) => c.classList.remove('active'));
      }
      chip.classList.add('active');

      apply();
    });
  });

  // Busca textual (com debounce leve)
  if (searchInput) {
    let timer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      const value = e.target.value.toLowerCase().trim();
      timer = setTimeout(() => {
        query = value;
        apply();
      }, 120);
    });
  }
})();
