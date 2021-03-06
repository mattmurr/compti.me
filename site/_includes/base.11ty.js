const html = String.raw;

const defaultDescription =
  "Blog about Software Engineering, Cloud, Unix and various other tech";

const url = (page) => `"https://${page.url}"`;

exports.render = function ({ content, page, title, description }) {
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title || "compti.me"}</title>
        <meta
          name="description"
          content="${description || defaultDescription}"
        />
        <link rel="canonical" href=${url(page)} />
        <link rel="icon" href="/assets/favicon.ico" type="image/x-icon" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/assets/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/assets/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/assets/favicon-16x16.png"
        />
        <link rel="manifest" href="/assets/site.webmanifest" />

        <link rel="stylesheet" href="https://fonts.xz.style/serve/inter.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@exampledev/new.css@1.1.2/new.min.css"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/prismjs@1.24.1/themes/prism-tomorrow.css"
          rel="stylesheet"
        />
      </head>
      <style>
        img {
          display: block;
          margin-left: auto;
          margin-right: auto;
          height: auto;
        }
        pre[class*="language-"] {
          padding: 0.4em 0.6em;
          margin: 1em 0;
        }
        pre[class*="language-"] mark {
          padding: 3px 0px;
        }
      </style>
      <body>
        <header>
          <a href="/"><h1>compti.me</h1></a>
        </header>
        ${content}
      </body>
    </html> `;
};
