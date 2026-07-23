const maps = require('./maps');

module.exports = maps.flatMap((map) =>
  (map.strategies || []).map((strategy) => ({
    ...strategy,
    mapSlug: map.slug,
    mapName: map.name,
    radar: map.radar,
    description: map.description,
    quickStats: map.quickStats
  }))
);
