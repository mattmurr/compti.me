const html = String.raw;

exports.data = {
  layout: "base",
};

exports.render = ({ site, title, page, content }) => {
  return html`<article>
    <h2>${title}</h2>
    ${content}
  </article>`;
};
