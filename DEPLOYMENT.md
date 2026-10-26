# Deployment rules for this repo

Cloudflare Workers Builds publishes this site. Every push to main triggers one full build, and build minutes are a limited budget on the account plan.

Rules for every person or agent working here:

1. One work run makes ONE commit. Batch every change in the run (all flyers, all event edits, all posts) into a single push at the end. Never push one commit per file or per step.
2. If a run changes nothing, push nothing.
3. After pushing, verify the live deployment at https://jamaaltreasures.com/__deployment reports the new commit and the served pages show the change. A push is not done until the live site proves it.
4. If builds start failing within seconds of a push, stop pushing and check the Cloudflare account build minutes and plan first. Do not keep stacking commits behind a dead deploy.

Why this file exists: between October 7 and October 21, 2026, over 1,100 small commits burned through the free plan build minutes. Every build after October 21 was rejected, and the live site froze on the October 21 version for five days while new work stacked up unseen. The account was upgraded to the paid plan on October 26, 2026. Batching is what keeps it from happening again.
