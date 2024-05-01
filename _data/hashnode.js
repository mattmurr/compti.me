const EleventyFetch = require("@11ty/eleventy-fetch");

module.exports = async function () {
  var result = await fetchAPI(
    `
    query($host: String!) {
      publication(host: $host) {
        posts(first: 0) {
          edges {
            node {
              publishedAt
              slug
              title
              subtitle
              content {
                  html
              }
              seo {
                title
                description
              }
            }
          }
        }
      }
    }
    `,
    {
      host: "compti.me",
    }
  );
  return result.data.publication.posts.edges.map(({ node }) => node);
};

async function fetchAPI(query, variables = {}) {
  return await EleventyFetch("https://gql.hashnode.com", {
    type: "json",
    duration: "1m",
    fetchOptions: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.HASHNODE_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  });
}
