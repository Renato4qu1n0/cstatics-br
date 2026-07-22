const path = require("path");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Image = require("@11ty/eleventy-img");

module.exports = function(eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(syntaxHighlight);

  // Copiar assets
  eleventyConfig.addPassthroughCopy("src/assets/");
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