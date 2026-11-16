// Branded 404 for paths that no page and no asset owns. The sites worker
// serves this so no address on this domain can ever render as an empty
// white page again.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#FAF7F2">
<title>Page not found | Jamaal Treasures</title>
<meta name="description" content="That page is not here. Find event coverage, the Event Radar and the Journal at Jamaal Treasures.">
<link rel="icon" href="/assets/jamaal-key.svg">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<style>
*{box-sizing:border-box}
body{margin:0;background:#FAF7F2 url(/assets/marble.svg) center top/1100px repeat;color:#111114;font:17px/1.65 system-ui,sans-serif}
main{max-width:680px;margin:0 auto;padding:56px 24px 72px;text-align:center}
img.wordmark{width:min(250px,70vw);height:auto}
h1{font-size:clamp(30px,7vw,44px);line-height:1.12;margin:28px 0 12px}
p{margin:0 auto 16px;max-width:52ch}
.links{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:28px}
a.button{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:13px 24px;border-radius:999px;background:#A7192F;color:#fff;font-weight:700;text-decoration:none}
a.plain{display:inline-flex;align-items:center;min-height:52px;padding:13px 10px;color:#111114;font-weight:600}
a:focus-visible{outline:3px solid #A7192F;outline-offset:4px}
</style>
</head>
<body>
<main>
<img class="wordmark" src="/assets/jamaal-wordmark.svg" width="250" height="100" alt="Jamaal Treasures">
<h1>That page is not here.</h1>
<p>The link may be old, or the address may have a typo in it. Everything live is one tap away.</p>
<div class="links">
<a class="button" href="/">Go to the homepage</a>
<a class="plain" href="/events">Event Radar</a>
<a class="plain" href="/blog">Journal</a>
<a class="plain" href="/prices">Prices</a>
</div>
</main>
</body>
</html>
`;

export function notFoundPage(request) {
  return new Response(request.method === 'HEAD' ? null : html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
