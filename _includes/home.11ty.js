const html = String.raw;

const posts = (posts) => {
  if (posts.len < 1) return [];
  return posts
    .sort((a, b) => b.data.post.publishedAt - a.data.post.publishedAt)
    .map(
      ({ data, url }) => html`<li>
        ${this.postDate(data.post.publishedAt)}
        <a href="${this.url(url)}">${data.post.title}</a>
      </li>`
    )
    .join("\n");
};

exports.data = {
  layout: "base",
};

exports.render = function ({ content, collections }) {
  console.log(collections)
  return html`${content}
    <section class="posts">
      <h2>Posts</h2>
      <ul>
        ${posts(collections.post)}
      </ul>
    </section>`;
};
