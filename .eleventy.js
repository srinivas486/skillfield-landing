module.exports = function (eleventyConfig) {
  // Pass assets through to dist unchanged
  eleventyConfig.addPassthroughCopy("src/assets");

  // Blog posts collection — newest first
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/blog/posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  // Date formatting filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  });

  eleventyConfig.addFilter("htmlDate", (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toISOString().split("T")[0];
  });

  // URL prefix helper for nav active states
  eleventyConfig.addFilter("urlStartsWith", (url, prefix) =>
    typeof url === "string" && typeof prefix === "string" && url.startsWith(prefix)
  );

  return {
    pathPrefix: "/skillfield-landing/",
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
