import handler from "vinext/server/fetch-handler";
import { canonicalRedirect } from "../server/canonical-domain.mjs";
import { sitePage } from "../server/site-pages.mjs";
import { notFoundPage } from "../server/not-found.mjs";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

// The journal lives at /blog now. Old /journal links from shares, bookmarks
// and older pages must land on the real blog instead of a blank 404. The one
// story slug that never became a blog post keeps its dedicated page.
const JOURNAL_STORY_PAGES: Record<string, string> = {
  "dessert-wars-orlando-a-sweet-victory-for-the-senses": "/dessert-wars-orlando",
};

function journalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname !== "/journal" && !url.pathname.startsWith("/journal/")) return null;
  const slug = url.pathname.slice("/journal".length).replace(/^\/+|\/+$/g, "");
  const destination = new URL(request.url);
  destination.pathname = slug ? (JOURNAL_STORY_PAGES[slug] ?? `/blog/${slug}`) : "/blog";
  return new Response(null, {
    status: 301,
    headers: { Location: destination.href, "Cache-Control": "public, max-age=300" },
  });
}

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const redirect = canonicalRedirect(request);
    if (redirect) return redirect;
    const legacy = journalRedirect(request);
    if (legacy) return legacy;
    const document = sitePage(request);
    if (document) return document;
    const url = new URL(request.url);
    const dynamic = /^\/(?:api\/|mcp(?:\/|$)|blog(?:\/|$)|events(?:\/|$)|robots\.txt$|sitemap\.xml$)/.test(url.pathname);
    const assets = (env as Cloudflare.Env & { ASSETS?: { fetch(request: Request): Promise<Response> } }).ASSETS;
    if (!dynamic) {
      if (!["GET", "HEAD"].includes(request.method)) return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD'}});
      if (assets) {
        const assetResponse = await assets.fetch(request);
        if (assetResponse.status !== 404) return assetResponse;
      }
      // No page and no asset owns this path. A person followed an old or
      // mistyped link, so they get a real branded page with a way home,
      // never the empty white response the asset store returns for a miss.
      return notFoundPage(request);
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};
