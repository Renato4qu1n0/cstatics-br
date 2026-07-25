// Lista unificada e ordenada (mais novo primeiro) para o RSS.
const lineups = require('./lineups.json').lineups;
const executions = require('./executions.json').executions;
const tactics = require('./tactics.json').tactics;

module.exports = () => {
  const d = (o) => (o.meta && (o.meta.updated || o.meta.created)) || '2026-07-24';
  const items = [
    ...lineups.map((l) => ({ title: l.title, url: '/lineups/' + l.slug + '/', date: d(l), description: l.shortDescription, kind: 'Lineup' })),
    ...executions.map((e) => ({ title: e.title, url: '/execucoes/' + e.slug + '/', date: d(e), description: e.shortDescription, kind: 'Execução' })),
    ...tactics.map((t) => ({ title: t.title, url: '/tactics/' + t.slug + '/', date: d(t), description: t.shortDescription, kind: 'Tática' }))
  ];
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return items.slice(0, 60);
};
