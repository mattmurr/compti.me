const html = String.raw;

exports.data = {
  layout: "base",
};

exports.render = ({ post }) => {
  return html`<article>
    <h2>${post.title}</h2>
    <h3>${post.subtitle}</h3>
    ${post.content.html}
  </article>`;
};
