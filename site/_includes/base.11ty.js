const html = String.raw;

exports.render = function ({ site, content, page, title, description }) {
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <meta
          name="description"
          content="${description || site.desc}"
        />
        <link rel="canonical" href=${site.url + page.url} />
        <link href="/assets/main.css" rel="stylesheet"/>
      </head>
      <body>
        <div class="container">
          <header>
            <h1><a href="/">thickrocks</a></h1>
            <div>
              <a href="mailto:${site.social.email}">Email</a>
              <a href="${site.social.mastodon}">Mastodon</a>
              <a href="${site.social.sourcehut}">sourcehut</a>
            </div>
          </header>
          <main>
            ${content}
          </main>
        </div>
        <footer>
          <a href="${site.social.keyoxide}">Keyoxide</a> |
          <a href='${site.social.kofi}'>Buy me some coffee<img height='32' src='/assets/Ko-fi_Icon_RGB_stroke.png' border='0' alt='Buy Me a Coffee at ko-fi.com'/></a>
        </footer>
      </body>
    </html>`;
};
