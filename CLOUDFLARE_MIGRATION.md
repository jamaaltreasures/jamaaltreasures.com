# Cloudflare deployment

The initial `main` commit is an exact snapshot of production Sites version 30.
Its Git tree is `e636f70443f438ba16cb6c49bcefa34e3e2f61b9`, identical to Sites
source commit `8b1d9984d2defbb90067dc514190e38e55894f3a`, with all 549 tracked
source files.

Cloudflare Workers Builds is connected to this repository's `main` branch. It
uses Node 24, `npm run build:cloudflare`, and
`npx wrangler deploy --config dist/server/wrangler.json`. Cloudflare's build
token includes the R2 permissions required to sync Oracle's event flyer files
before the worker deploys.

D1 database `jamaaltreasures` has the site listening tables. R2 bucket
`jamaaltreasures-media` holds all 663 migrated site media objects, verified by
byte count and SHA256, plus the supplied original event flyers. The event route
serves each original flyer from R2 without resizing or cropping it.

Oracle owns event discovery, flyer selection and event content. The curated
content lives in `server/oracle-events.json`; the original flyer files live in
`assets/events/originals/`. The worker only renders this content and serves the
flyers. It does not discover or curate events.

The custom domain still serves ChatGPT Sites until the account owner changes the
GoDaddy nameservers. Keep the Sites deployment available for rollback during
that DNS handoff. Before cutover, verify the Cloudflare DNS zone preserves all
current email and service records, then confirm the Workers URL, media, forms,
and listen counts. After cutover, push a comment-only commit to `main` and
verify `/__deployment` returns that commit SHA to prove automatic deployment.

`npm run test:cloudflare` verifies the owner access boundary. The Cloudflare
build compiles `/`, `/events`, `/events/flyer/:filename`, `/blog`, and the other
site routes.
