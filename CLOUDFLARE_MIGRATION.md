# Cloudflare deployment

The initial `main` commit is an exact snapshot of production Sites version 30.
Its Git tree is `e636f70443f438ba16cb6c49bcefa34e3e2f61b9`, identical to Sites
source commit `8b1d9984d2defbb90067dc514190e38e55894f3a`, with all 549 tracked
source files.

Cloudflare Workers Builds is connected to this repository's `main` branch. It
uses Node 24, `npm run build:cloudflare`, and
`npx wrangler deploy --config dist/server/wrangler.json`. Cloudflare's build
token includes the R2 permissions required to sync new or changed Oracle event
flyers before the worker deploys. Flyer sync failures are reported but do not
block page deployment; see the maintenance procedure below.

D1 database `jamaaltreasures` has the site listening tables. R2 bucket
`jamaaltreasures-media` holds all 663 migrated site media objects, verified by
byte count and SHA256, plus the supplied original event flyers. The event route
serves each original flyer from R2 without resizing or cropping it.

Oracle owns event discovery, flyer selection and event content. The curated
content lives in `server/oracle-events.json`; the original flyer files live in
`assets/events/originals/`. The worker only renders this content and serves the
flyers. It does not discover or curate events.

The custom domain now serves this Cloudflare Worker. The former ChatGPT Sites
deployment is separate and does not publish changes to jamaaltreasures.com.
No DNS changes are needed for routine releases.

`npm run test:cloudflare` verifies the owner access boundary. The Cloudflare
build compiles `/`, `/events`, `/events/flyer/:filename`, `/blog`, and the other
site routes.

## Deployment maintenance (October 19, 2026)

`scripts/sync-event-flyers.mjs` deduplicates event image keys and compares each
local original's MD5 with the strong R2 ETag returned by the live flyer route.
Only missing or changed originals are uploaded. Weak or multipart ETags never
count as unchanged. A failed probe is deferred, not treated as a missing file;
an outage therefore cannot cause a mass reupload. This reads actual storage on
each run and does not depend on an ephemeral build cache or a Git diff.

Probes/uploads have bounded concurrency (8), individual timeouts (8/30 seconds),
and an overall 90-second deadline. Uploads preserve the original bytes, keys,
content types and caching policy. A failed upload is not recorded as successful,
so the next events build retries it. The standalone command returns nonzero on
failures; the page build logs a warning and continues. A newly referenced flyer
can remain unavailable until that retry succeeds. Existing uploaded flyers are
not deleted or rewritten when their bytes match.

```sh
# Read-only audit; no Cloudflare credentials required.
npm run sync:event-flyers -- --check

# Retry deferred files with the existing R2 credentials and bucket environment.
npm run sync:event-flyers
```

The two-hour events job can keep publishing `server/oracle-events.json` and new
original flyers. It needs no new secrets or workflow changes. The daily blog
seed job, its remote-head/slug-diff safeguards, and R2 Journal storage are unchanged.
Use a new filename for a replacement flyer: existing URLs retain their immutable
cache policy, so clients can retain older bytes at a reused URL.

Snapshot packaging uses gzip level 6, down from 9; decompressed HTML is lossless.
Every preparation checks all registered pages against their HTML shells and
compares unchanged shells to the previous snapshot at HEAD. An unrelated page
cannot silently change during regeneration. Build logs report each stage's
duration separately. Source assets are still copied and verified; large media
must not be removed merely to reduce clone time.

### Safe content rounds and snapshots

1. Pull/fetch current `main` and read `https://jamaaltreasures.com/__deployment`
   before editing. Do not regenerate from an old checkout.
2. Make the intended shell edit. Register any new runtime asset in both
   `prepare-public.mjs` and `prepare-static.mjs`. New shell pages belong in the
   shared `server/site-page-files.mjs` list.
3. Run `npm run build:cloudflare -- --preview`, then
   `npm run verify:snapshots -- --base=origin/main` and `npm run test:cloudflare`.
   Check every generated snapshot entry, not only the page being edited. Preview
   the affected route and its trailing-slash form. Protected content, including
   `/updatefromyourphone`, must remain byte-identical when unrelated to the job.
4. Fetch again before committing/publishing. If the remote moved, integrate its
   changes first and regenerate/recheck against that exact head. Never reuse a
   stale generated snapshot or force-push a prepared batch over newer work.
5. Publish one atomic commit for the round. Verify the exact commit's Cloudflare
   check, then require `/__deployment` to identify that commit or a verified
   descendant. Check the served content too: a successful push is not publication.

The Worker normalizes trailing slashes and `.html` before resolving the packed
snapshot. `/dessert-wars-orlando` and `/dessert-wars-orlando/` return the same
article. A registered page missing from a broken snapshot fails closed with 503;
it cannot fall through to a homepage. Unknown paths return 404. Asset fallback
is explicitly `not_found_handling: "none"`, and no fallback framework homepage
is used for unknown paths. See the
[Cloudflare asset configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/#assets).

### Can a small page edit bypass a rebuild?

No safe bypass exists in this architecture for the packed shell pages, including
Dessert Wars, or for `server/journal-seed.json` content. Their text and links are
compiled into the Worker. Editing only a static HTML upload would leave the
packed snapshot unchanged. Reusing a previously built Worker could overwrite
newer events, blog content or routing. Keep batching and use the faster normal
build. A new mutable R2/KV overlay would need a separately designed, versioned
publishing/rollback mechanism; this change does not introduce one.

The existing authenticated Journal publisher can create new R2-backed articles
without a build, but it refuses an existing slug and gives bundled seed entries
precedence. It is not an edit path for a shell page or an existing seed article.
