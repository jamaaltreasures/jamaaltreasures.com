# Cloudflare migration status

The initial `main` commit is an exact snapshot of production Sites version 30.
Its Git tree is `e636f70443f438ba16cb6c49bcefa34e3e2f61b9`, identical to Sites
source commit `8b1d9984d2defbb90067dc514190e38e55894f3a`. It contains all 549
tracked source files, including the original assets and manifests. Runtime
database rows and R2 objects are separate from source control.

This branch adds a direct Cloudflare Workers build. It does not change page
design or event content. The normal Sites build remains available.

## Deployment setup still required

1. Authorize the owner's Cloudflare account and identify the domain's DNS owner.
2. Provision a D1 database and an R2 bucket. Apply the existing SQL migrations
   under `drizzle/`. Copy the live listen counts immediately before cutover.
3. Copy all 663 media objects from the verified originals, preserving object
   names, bytes, SHA256 metadata and content types. Their total size is
   2,611,875,660 bytes. Current public blog articles all exist in the source seed;
   recheck for new R2 articles before cutover.
4. Set `CLOUDFLARE_D1_DATABASE_ID` and `CLOUDFLARE_R2_BUCKET` as build variables.
   `CLOUDFLARE_WORKER_NAME` is optional and defaults to `jamaaltreasures`.
5. Connect this repository's `main` branch using Cloudflare Workers Builds.
   Use Node 24, `npm ci` for installation, `npm run build:cloudflare` for the
   build and `npx wrangler deploy --config dist/server/wrangler.json` for deploy.
   Keep custom domain routing off until the new deployment is verified.
6. If the existing Journal publishing MCP is needed on the new host, configure
   a random `JOURNAL_PUBLISH_TOKEN` of at least 32 characters as a Worker secret.
   Supply it as an Authorization Bearer token to `/mcp`. Without it, writes are
   denied. Visitor supplied Sites identity headers are always discarded.
7. Verify all routes, media playback and range requests, listen counts, form
   destinations and publishing access on the Workers URL. Then switch the
   custom domain while leaving the Sites deployment available for rollback.
8. Push a trivial comment change to `main`. Confirm the Cloudflare build
   succeeds and `/__deployment` on the live domain returns that commit SHA.

No Cloudflare account, deployment trigger or custom domain has been connected
by this branch. A successful local build is not proof of automatic deployment.

## Validation

`npm run test:cloudflare` verifies the owner access boundary. Local smoke checks
verified `/`, `/events`, `/blog`, `/music`, `/prices` and `/__deployment`, plus
rejection of a forged owner identity. `node scripts/build-cloudflare.mjs
--preview` builds for local testing with placeholder storage bindings. Do not
deploy that preview output; deployment builds require the real resource IDs.

## Event ownership

Oracle owns event discovery, flyer selection and event content. Infrastructure
and deployment maintenance remain with Codex. The current content file is
`server/upcoming-events.json`; rendering is `server/events-render.mjs`. No new
discovery automation or competing events pipeline was added.

The supplied `events-page-new 2.html` and the other local copy both end at
2,097,152 bytes inside an embedded image. The approved later sections, promo
band and press band cannot yet be recovered from those files. The flyer ZIP
contains 59 original files. A complete HTML reference is needed before the
requested exact redesign can be completed.
