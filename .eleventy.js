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
  eleventyConfig.addPassthroughCopy("src/admin/"); // painel do Decap CMS (copiado sem processar)

  // Watch targets
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // Filtros úteis
  eleventyConfig.addFilter("readableDate", dateObj => {
    return new Date(dateObj).toLocaleDateString('pt-BR');
  });

  // Data no formato RFC-822 para o RSS
  eleventyConfig.addFilter("rssDate", (value) => {
    const d = value ? new Date(value) : new Date();
    return (isNaN(d) ? new Date() : d).toUTCString();
  });

  // Normaliza um link de vídeo para a forma que funciona dentro de <iframe>.
  // Aceita youtube.com/watch?v=, youtu.be/, /shorts/, ou já em /embed/.
  // Preserva o instante inicial (t / start). Outros hosts passam sem alteração.
  eleventyConfig.addFilter("embedUrl", (url) => {
    if (!url || typeof url !== "string") return "";
    const startParam = (u) => {
      const m = u.match(/[?&](?:t|start)=(\d+)/);
      return m ? "?start=" + m[1] : "";
    };
    let id = null;
    let m;
    if ((m = url.match(/[?&]v=([\w-]{11})/))) id = m[1];
    else if ((m = url.match(/youtu\.be\/([\w-]{11})/))) id = m[1];
    else if ((m = url.match(/\/shorts\/([\w-]{11})/))) id = m[1];
    else if ((m = url.match(/\/embed\/([\w-]{11})/))) id = m[1];
    if (id) return "https://www.youtube.com/embed/" + id + startParam(url);
    return url; // não reconhecido — devolve como veio
  });

  eleventyConfig.addFilter("limit", (array, limit) => {
    return array.slice(0, limit);
  });

  // Serializa valores como JSON (usado para gerar JSON-LD com escaping correto)
  eleventyConfig.addFilter("json", (value) => {
    return JSON.stringify(value);
  });

  // Codifica um estado da prancheta no formato do link (#b=...)
  const boardEncode = (obj) =>
    Buffer.from(JSON.stringify(obj), "utf8")
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Link da prancheta para um único lineup: jogador na saída, utilitária no
  // alvo e uma seta ligando os dois.
  eleventyConfig.addFilter("lineupBoardCode", (lineup, geo) => {
    if (!lineup || !geo || !geo.callouts) return "";
    const o = geo.callouts[lineup.from];
    const i = geo.callouts[lineup.to];
    if (!o || !i) return "";
    const els = [
      { id: "e1", type: "player", side: lineup.side || "t", x: o.x, y: o.y, label: "1" },
      { id: "e2", type: "util", kind: lineup.utility || "smoke", x: i.x, y: i.y },
      { id: "e3", type: "arrow", x1: o.x, y1: o.y, x2: i.x, y2: i.y }
    ];
    return boardEncode({ m: lineup.map, c: 0, s: [els] });
  });

  // Link da prancheta para uma execução: uma etapa por arremesso (cumulativo),
  // pronta para Reproduzir — cada utilitária surge na sua vez.
  eleventyConfig.addFilter("execBoardCode", (throwsResolved, geo, map) => {
    if (!Array.isArray(throwsResolved) || !geo || !geo.callouts) return "";
    const steps = [];
    const acc = [];
    throwsResolved.forEach((t, idx) => {
      const o = geo.callouts[t.from];
      const i = geo.callouts[t.to];
      if (!o || !i) return;
      acc.push({ id: "u" + idx, type: "util", kind: t.utility || "smoke", x: i.x, y: i.y });
      acc.push({ id: "a" + idx, type: "arrow", x1: o.x, y1: o.y, x2: i.x, y2: i.y });
      steps.push(acc.map((e) => Object.assign({}, e)));
    });
    return boardEncode({ m: map, c: 0, s: steps.length ? steps : [[]] });
  });

  // Resolve os arremessos de uma execucao a partir dos lineups referenciados
  eleventyConfig.addFilter("resolveThrows", (throws, lineups) => {
    if (!Array.isArray(throws) || !Array.isArray(lineups)) return [];
    return throws
      .map((t) => {
        const l = lineups.find((x) => x.slug === t.lineup);
        if (!l || !l.from || !l.to) return null;
        return {
          from: l.from,
          to: l.to,
          utility: l.utility,
          label: t.label || l.title,
          slug: l.slug,
          title: l.title
        };
      })
      .filter(Boolean);
  });

  // Busca um item de uma lista pelo slug
  eleventyConfig.addFilter("findBySlug", (items, slug) => {
    if (!Array.isArray(items)) return null;
    return items.find((i) => i.slug === slug) || null;
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