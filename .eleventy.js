const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss");

const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

async function imageShortcode(src, alt) {
  const sizes = "(min-width: 1024px), 100vw, 50vw";
  const metadata = await Image(src, {
    widths: [600, 900, 1500],
    formats: ["webp", "png", "jpeg"],
    urlPath: "/img/",
    outputDir: "_site/img/",
    sharpWebpOptions: {
      nearLossless: true,
    },
  });

  const imageAttributes = {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
  };

  return Image.generateHTML(metadata, imageAttributes, {
    whitespaceMode: "inline",
  });
}

const renderPermalink = (slug, opts, state, idx) => {
  const position = {
    false: "push",
    true: "unshift",
  };

  const space = () =>
    Object.assign(new state.Token("text", "", 0), {
      content: " ",
    });

  const linkTokens = [
    Object.assign(new state.Token("link_open", "a", 1), {
      attrs: [
        ["class", opts.permalinkClass],
        ["href", opts.permalinkHref(slug, state)],
      ],
    }),
    Object.assign(new state.Token("html_block", "", 0), {
      content: "<span>🔗</span>",
    }),
    new state.Token("link_close", "a", -1),
  ];

  if (opts.permalinkSpace) {
    linkTokens[position[!opts.permalinkBefore]](space());
  }
  state.tokens[idx + 1].children[position[opts.permalinkBefore]](...linkTokens);
};

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);

  ["dateToRfc3339", "absoluteUrl", "convertHtmlToAbsoluteUrls"].forEach(
    (method) => eleventyConfig.addFilter(method, pluginRss[method])
  );

  eleventyConfig.addFilter("postDate", (date) =>
    DateTime.fromISO(date)
      .setLocale("en-gb")
      .toLocaleString({ month: "long", day: "2-digit", year: "numeric" })
  );

  eleventyConfig.addLiquidShortcode("image", imageShortcode);

  eleventyConfig.addPassthroughCopy("assets");

  const markdownItOptions = {
    html: true,
  };

  const markdownItAnchorOptions = {
    permalink: true,
    renderPermalink,
  };

  const markdownLib = markdownIt(markdownItOptions).use(
    markdownItAnchor,
    markdownItAnchorOptions
  );

  eleventyConfig.setLibrary("md", markdownLib);
};
