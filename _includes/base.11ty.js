const html = String.raw;

exports.render = function({ site, content, page, title, description }) {
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <meta name="description" content="${description || site.desc}" />
        <link rel="canonical" href=${site.url + page.url} />
        <link
          href="https://unpkg.com/prismjs@1.29.0/themes/prism-okaidia.css"
          rel="stylesheet"
        />
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
        <link rel="mask-icon" href="/assets/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="stylesheet" href="/assets/main.css" />
      </head>
      <body>
        <header>
          <h1><a href="/">compti.me</a></h1>
          <div>
            <a href="mailto:${site.social.email}">Email</a>
            <a href="https://github.com/${site.social.github}">GitHub</a>
          </div>
        </header>
        <main>${content}</main>
        <footer>&copy; 2021-${new Date().getFullYear()} Matthew Murray</footer>
      </body>
      <script defer src="/_vercel/insights/script.js"></script>
    </html>`;
};
