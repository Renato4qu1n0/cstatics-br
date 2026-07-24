const path = require("path");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Image = require("@11ty/eleventy-img");

module.exports = function(eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(syntaxHighlight);

  // Copiar assets
  eleventyConfig.addPassthroughCopy("src/assets/");
  eleventyConfig.addPassthroughCopy("src/images/");
  eleventyConfig.addPassthroughCopy("src/img/");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");

  // Watch targets
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // Filtros úteis
  eleventyConfig.addFilter("readableDate", dateObj => {
    return new Date(dateObj).toLocaleDateString('pt-BR');
  });

  eleventyConfig.addFilter("limit", (array, limit) => {
    return array.slice(0, limit);
  });

  // Serializa valores como JSON (usado para gerar JSON-LD com escaping correto)
  eleventyConfig.addFilter("json", (value) => {
    return JSON.stringify(value);
  });

  // Trajetória da utilitária: curva quadrática entre dois callouts.
  // O ponto de controle sai perpendicular ao segmento, o que dá um arco
  // legível em vez de uma reta (a altura real do arremesso não aparece no topo).
  eleventyConfig.addFilter("arcPath", (from, to, curvature) => {
    if (!from || !to) return "";
    const k = typeof curvature === "number" ? curvature : 0.2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    // normal unitária (-dy, dx)
    const cx = mx + (-dy / dist) * dist * k;
    const cy = my + (dx / dist) * dist * k;
    const r = (n) => Math.round(n * 10) / 10;
    return `M ${r(from.x)} ${r(from.y)} Q ${r(cx)} ${r(cy)} ${r(to.x)} ${r(to.y)}`;
  });

  // Filtra uma lista por chave/valor — ex.: maps.maps | filterBy("active", true)
  eleventyConfig.addFilter("filterBy", (items, key, value) => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => item[key] === value);
  });

  // Filtra uma lista de lineups/táticas por mapa (slug)
  eleventyConfig.addFilter("byMap", (items, mapSlug) => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => {
      const slug = item.mapSlug || item.map;
      return slug && slug.toLowerCase() === String(mapSlug).toLowerCase();
    });
  });

  // Shortcode para imagens otimizadas
  eleventyConfig.addNunjucksAsyncShortcode("image", async function(src, alt) {
    let normalizedSrc = src.replace(/^\/+/, "");
    let sourcePath = path.join(process.cwd(), "src", normalizedSrc);

    try {
      let metadata = await Image(sourcePath, {
        widths: [300, 600, 1200],
        formats: ["webp", "jpeg"]
      });

      let imageAttributes = {
        alt,
        sizes: "(min-width: 1024px) 1024px, 100vw",
        loading: "lazy",
        decoding: "async",
      };

      return Image.generateHTML(metadata, imageAttributes);
    } catch (error) {
      return `<img src="/${normalizedSrc}" alt="${alt}" loading="lazy" decoding="async">`;
    }
  });

  return {
    dir: {
    input: "src",
    output: "dist",
    includes: "_includes",
    data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    passthroughFileCopy: true
  };
}