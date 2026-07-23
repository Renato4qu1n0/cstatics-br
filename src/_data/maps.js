const fs = require('fs');
const path = require('path');

const mapsDir = path.join(__dirname, 'maps');
const files = fs.readdirSync(mapsDir)
  .filter((file) => file.endsWith('.json'))
  .sort();

const maps = files.map((file) => {
  const mapData = JSON.parse(fs.readFileSync(path.join(mapsDir, file), 'utf8'));

  return {
    ...mapData,
    strategies: (mapData.strategies || []).map((strategy, index) => ({
      ...strategy,
      id: strategy.id || `${mapData.slug}-${index + 1}`,
      slug: strategy.slug || `${mapData.slug}-${strategy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
      mapSlug: mapData.slug,
      mapName: mapData.name
    }))
  };
});

module.exports = maps;
