const pluginWebc = require("@11ty/eleventy-plugin-webc");

module.exports = (eleventyConfig) => {
  // Set up webc plugin to process all webc files
  eleventyConfig.addPlugin(pluginWebc, {
    components: ["src/_components/**/*.webc"],
  });

  eleventyConfig.addPassthroughCopy({ "src/words": "words" });

  return {
    dir: {
      input: "src",
    },
  };
};
