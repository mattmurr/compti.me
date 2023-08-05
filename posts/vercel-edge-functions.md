---
title: "Vercel Edge Functions"
description:
  "Adding GitHub OAuth to my static site without client-side JS, using Vercel
  Edge Functions"
date: "2023-01-17"
---

So recently I've been interested in the idea of one of my static websites, without adding introducing any much client-side JS. I will be using Vercel's edge functions to add GitHub auth to a barebones `11ty/eleventy` site.
## Useful links

* [https://vercel.com/docs/concepts/functions/edge-functions](https://vercel.com/docs/concepts/functions/edge-functions)
* [https://docs.github.com/en/developers/apps/building-oauth-apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
* [https://www.11ty.dev/#quick-start](https://www.11ty.dev/#quick-start)
* [Cloudflare - What is edge computing?](https://www.cloudflare.com/en-gb/learning/serverless/glossary/what-is-edge-computing/)
## A little about serverless and/or edge computing

Serverless computing allows us to build things by quickly leveraging "the cloud" benefits, without having to handle any of the menial tasks such as configuring a VPS. Edge computing has a focus on bringing computation closer to data sources, speeding things up by reducing latency. By bringing serverless and edge together, we can leverage the cloud for more performance at a lower cost.
## Init

This is my first time using the [`vercel` CLI tool](https://vercel.com/docs/cli) to start a project, previously I linked my GitHub repo to a project within the Vercel dashboard.

```bash
matt@Matthews-MacBook-Air Repositories % vercel init eleventy vercel-edge-function-github-oauth-app
Vercel CLI 28.15.0
> Success! Initialized "eleventy" example in ~/Repositories/vercel-edge-function-github-oauth-app.
- To deploy, `cd vercel-edge-function-github-oauth-app` and run `vercel`.
matt@Matthews-MacBook-Air Repositories % cd vercel-edge-function-github-oauth-app
matt@Matthews-MacBook-Air vercel-edge-function-github-oauth-app % yarn install
yarn install v1.22.19
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
warning " > markdown-it-anchor@8.4.1" has unmet peer dependency "@types/markdown-it@*".
[4/4] 🔨  Building fresh packages...
✨  Done in 10.12s.
matt@Matthews-MacBook-Air vercel-edge-function-github-oauth-app % npx @11ty/eleventy --serve
[11ty] Writing _site/LICENSE/index.html from ./LICENSE.md (njk)
[11ty] Writing _site/sitemap.xml from ./sitemap.xml.njk
[11ty] Writing _site/feed/.htaccess from ./feed/htaccess.njk
[11ty] Writing _site/feed/feed.xml from ./feed/feed.njk
[11ty] Writing _site/feed/feed.json from ./feed/json.njk
[11ty] Writing _site/posts/fourthpost/index.html from ./posts/fourthpost.md (njk)
[11ty] Writing _site/404.html from ./404.md (njk)
[11ty] Writing _site/posts/secondpost/index.html from ./posts/secondpost.md (njk)
[11ty] Writing _site/posts/thirdpost/index.html from ./posts/thirdpost.md (njk)
[11ty] Writing _site/posts/firstpost/index.html from ./posts/firstpost.md (njk)
[11ty] Writing _site/about/index.html from ./about/index.md (njk)
[11ty] Writing _site/tags/index.html from ./tags-list.njk
[11ty] Writing _site/tags/second-tag/index.html from ./tags.njk
[11ty] Writing _site/tags/number-2/index.html from ./tags.njk
[11ty] Writing _site/tags/posts-with-two-tags/index.html from ./tags.njk
[11ty] Writing _site/tags/another-tag/index.html from ./tags.njk
[11ty] Writing _site/page-list/index.html from ./page-list.njk
[11ty] Writing _site/posts/index.html from ./archive.njk
[11ty] Writing _site/index.html from ./index.njk
[11ty] Copied 3 files / Wrote 19 files in 0.25 seconds (13.2ms each, v1.0.0)
[11ty] Watching…
[Browsersync] Access URLs:
 ------------------------------------
    Local: http://localhost:8081
 External: http://192.168.88.153:8081
 ------------------------------------
[Browsersync] Serving files from: _site
```

{% image "./assets/img/Screenshot 2023-02-11 at 20.57.16.png", "Serving the barebones 11ty project locally" %}

This can be deployed to the cloud straight away, run the `vercel` cmd from the project dir, this will start a dialog to configure the project for use in Vercel:

```bash
matt@Matthews-MacBook-Air vercel-edge-function-github-oauth-app % vercel
Vercel CLI 28.15.0
? Set up and deploy “~/Repositories/vercel-edge-function-github-oauth-app”? [Y/n] y
? Which scope do you want to deploy to? Matthew Murray
? Link to existing project? [y/N] n
? What’s your project’s name? vercel-edge-function-github-oauth-app
? In which directory is your code located? ./
Local settings detected in vercel.json:
Auto-detected Project Settings (Eleventy):
- Build Command: npx @11ty/eleventy
- Development Command: npx @11ty/eleventy --serve --watch --port $PORT
- Install Command: `yarn install`, `pnpm install`, or `npm install`
- Output Directory: _site
? Want to modify these settings? [y/N] n
🔗  Linked to mattmurr/vercel-edge-function-github-oauth-app (created .vercel)
🔍  Inspect: https://vercel.com/mattmurr/vercel-edge-function-github-oauth-app/3RrK3NTruee6UJ97GnsJHc5zCaH2 [2s]
✅  Production: https://vercel-edge-function-github-oauth-app.vercel.app [16s]
📝  Deployed to production. Run `vercel --prod` to overwrite later (https://vercel.link/2F).
💡  To change the domain or build command, go to https://vercel.com/mattmurr/vercel-edge-function-github-oauth-app/settings
```

The project shows up in my Vercel dashboard and has already been built and deployed 🔥🚀.

## Vercel Edge Function

The [Edge Functions Overview](https://vercel.com/docs/concepts/functions/edge-functions) contains a sample edge function which I added to `/api/test.ts`, only changing the region to something more local to me:

```ts
export const config = {
  runtime: "edge",
  regions: ["lhr1"],
};

export default (req: Request) => {
  return new Response(`Hello, from ${req.url} I'm now an Edge Function!`);
};
```

Run the `vercel` cmd once again to deploy the project. Vercel finds the edge function in our project and includes it in the deployment, using the relative path to the file, as the path for the API route:

{% image "./assets/img/1a086d91-32fd-426e-a365-5b5f9b5a75e2.png", "Testing the sample edge function" %}

Successfully created and deployed the edge function. Now to apply these learnings to implement an OAuth login flow.

## OAuth application

Let's create a New OAuth App in GitHub:

{% image "./assets/img/176b8c56-0fa0-4c5b-ae1f-3aa5bafebf2f.png", "GitHub Register a new OAuth app" %}

After clicking **Register application**, You'll be presented with the dashboard for the new OAuth application. We need the client ID, and to generate a client secret. They will be accessed from the edge function as [environment variables](https://vercel.com/docs/concepts/functions/edge-functions/edge-functions-api#environment-variables), which can be updated using the `vercel` CLI tool:

```bash
matt@Matthews-MacBook-Air vercel-edge-function-github-oauth-app % vercel env add GITHUB_CLIENT_ID production
Vercel CLI 28.15.0
? What’s the value of GITHUB_CLIENT_ID? 7d08dc9eed8257580669
✅  Added Environment Variable GITHUB_CLIENT_ID to Project vercel-edge-function-github-oauth-app [594ms]
matt@Matthews-MacBook-Air vercel-edge-function-github-oauth-app % vercel env add GITHUB_CLIENT_SECRET production
Vercel CLI 28.15.0
? What’s the value of GITHUB_CLIENT_SECRET? <That juicy secret that you generated>
✅  Added Environment Variable GITHUB_CLIENT_SECRET to Project vercel-edge-function-github-oauth-app [581ms]
```

Those env vars should now be available in the edge function via `process.env`.

According to the GitHub documentation for [Authorizing OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps), we need to:

1. Request the GitHub identity with a GET to `https://github.com/login/oauth/authorize`, with the `client_id` sent in a query parameter.
    
2. The user will be sent back to the callback page with `code` request parameter, parse this and make a request to `https://github.com/login/oauth/access_token` with `client_id`, `client_secret` and `code` params, from which the response should contain our GitHub access token.
    

### #1 Authorizing the OAuth app

The `/auth/login` endpoint redirects any requests destined for [`https://vercel-edge-function-github-oauth-app-mattmurr.vercel.app/api/auth/login`](https://vercel-edge-function-github-oauth-app-mattmurr.vercel.app/) towards the GitHub OAuth portal, where the user can sign in and authorize the OAuth app.

Just like the sample edge function, this is placed in `/api/auth/login.ts`:

```ts
export const config = {
  runtime: "edge",
  regions: ["lhr1"],
};

// Redirect to GitHub auth
export default (req: Request) => {
  const AUTH_URL = "https://github.com/login/oauth/authorize";

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${AUTH_URL}?client_id=${process.env.GITHUB_CLIENT_ID}`,
    },
  });
};
```

### #2 Retrieving a token

After signing in, the user will be sent back to the callback page that is configured in the GitHub OAuth App dashboard, in my case: [`https://vercel-edge-function-github-oauth-app-mattmurr.vercel.app/api/auth/callback`](https://vercel-edge-function-github-oauth-app-mattmurr.vercel.app/api/auth/callback). This snippet will parse the `code` request parameter and make a POST to `https://github.com/login/oauth/access_token` with the `client_id`, `client_secret` and `code` (that was just received).

```ts
export const config = {
  runtime: "edge",
  regions: ["lhr1"],
};

function cookie(key: string, value: string, exp: number) {
  return `${key}=${value}; HttpOnly; Secure; Max-Age=${exp}; SameSite=Lax`;
}

export default async (req: Request) => {
  const AUTH_URL = "https://github.com/login/oauth/access_token";

  // 1. Parse the request URL to retrieve the `code` request parameter
  const params = new URL(req.url).searchParams;
  const code = params.get("code")!;

  // 2. Sent a POST request to obtain an access_token
  let url = new URL(AUTH_URL);
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  url.searchParams.set("client_secret", process.env.GITHUB_CLIENT_SECRET);
  url.searchParams.set("code", code);

  const resp = await fetch(url);
  const body = await resp.text();
  const access_token = new URLSearchParams(body).get("access_token")!;

  // 3. Store the auth token as a cookie
  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "no-cache",
      "Set-Cookie": cookie("gh_auth_token", btoa(access_token), 60 * 60 * 8), // 8 Hours
    },
  });
};
```

Encoding `access_token` in base64 and storing it in a cookie `gh_auth_token`. When I redeploy, and navigate to [/api/auth/login](https://vercel-edge-function-github-oauth-app-mattmurr.vercel.app/api/auth/login), I should be presented with the GitHub authorize OAuth application screen, and shortly after, an access token should be stored in a cookie, ready to be used in subsequent requests to GitHub APIs.

{% image "./assets/img/Screenshot 2023-02-19 at 17.39.27.png", "gh_auth_token cookie in Google Chrome devtools" %}

## Using the token

I'll add another edge function `/api/user` which will retrieve information about the user, **myself,** since I'm logging in with my own GitHub account. Here's my first naive attempt:

```ts
export default async (req: Request) => {
  const USER_URL = "https://api.github.com/user";

  const cookies = req.headers.get("cookie")!;
  const access_token = atob(
    cookies
      .split("; ")
      .filter((value: string) => value.startsWith("gh_auth_token"))[0]
      .split("=")[1]
  );

  const resp = await fetch(USER_URL, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const { login, avatar_url } = await resp.json();

  const render = `<!DOCTYPE html><html><head></head><body><h1>${login}</h1><img src="${avatar_url}" width="250" height="250"></body></html>`;
  return new Response(render, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
};
```

I found that the `gh_auth_token` cookie isn't set when I use the new [/api/user](https://vercel-edge-function-github-oauth-app-mattmurr.vercel.app/api/auth/login) endpoint. This is because of the `Path` attribute. By default, the cookie is only visible at the `/auth/callback` path. The following change makes sure that this is instead set as the root of our site, `/api/auth/callback.ts`:

```ts
function cookie(key: string, value: string, exp: number) {
  // return `${key}=${value}; HttpOnly; Secure; Max-Age=${exp}; SameSite=Lax;`;
  return `${key}=${value}; HttpOnly; Secure; Max-Age=${exp}; SameSite=Lax; Path=/`;
}
```

Now when I go through the entire login flow, and navigate to the `/api/user` path, I am presented with my username and profile pic.

{% image "./assets/img/7f9a5a35-8895-4caa-b689-aa66c686028a.png", "SSR from Vercel Edge Function" %}

If you have been following along, you can make this what you want. For example, a reimplementation of the GitHub search bar to find GitHub users and/or repositories.

I'm happy with the result, it's blazing quick and extremely simple to implement. I will be using edge functions in future projects whenever possible, to grasp the pros and discover limitations in edge computing.
