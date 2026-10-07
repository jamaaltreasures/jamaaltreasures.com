# Jamaal Treasures EPK

Mobile first, static electronic press kit for https://jamaaltreasures.com. The accepted black, purple and magenta direction uses local fonts, original nebula artwork, rounded glass surfaces and a 25-upload directed-video portfolio immediately after the hero.

## Latest focused revision

Added the owner-supplied portrait to the biography in a responsive layout, using full image proportions and 28 KB / 71 KB WebP variants. Applied the exact supplied four-paragraph introduction and linked its community invitation to the existing public Whop membership page. That page returns HTTP 200, identifies The Treasure Chest Membership at $49/month and presents Join now; its existing paid enrollment and Discord fulfillment settings were not changed or newly certified.

Music Videos is first at the approved flat $650, including the inquiry selector. Other prices are unchanged. The services heading is “What can I help you create?” and every Watch Full Video control is at least 52px tall.

## Build and verification

Run `node --check app.js`, `node --check glass-optics.js`, `node prepare-static.mjs`, and `python3 qa/verify-homepage.py`. The production allowlist is `dist/`. Use a local HTTP server for preview. Browser QA source scripts and reports live in the task workspace `homepage-rebuild/visual-qa/`; only selected evidence is retained in `qa/` in this source repository.

## Content and provenance

The portfolio contains the 25 distinct uploads audited in `verified-video-reach.json`, totaling 5,650,040 directed-video views at audit time. The user approved the conservative headline 5M+. Uploads on separate channels are identified; figures are aggregate video views, not unique viewers. Rayy Dubb is the artist of Leave Me Alone.

`social-reach.json` records the five Instagram accounts and combined 7,154 followers. Four counts were observed publicly; @cjdonmiss111's 1,345 was supplied by the user. The Apple Music approximately 1.6 million streams is explicitly an artist estimate, not independently verified analytics. Sources are accessible in the Stats disclosure.

The five client screenshots are preserved unchanged, linked to full images and the verified Instagram source post. Text excerpts preserve the supplied wording. The Zora handle is abbreviated in text because its exact underscore count is unresolved; the original screenshot shows attribution.

The owner explicitly selected `/Users/cjmitchell/Documents/THE REALM FINAL.mov` as the headline film. It is now featured in the hero, before the unchanged music-video carousel. Source provenance is in `qa/realm-final-source.json`. HLS variants preserve the complete 293.45-second cut, 60fps timing and copied original AAC audio at 1080p and 720p. No movie bytes load before the visitor presses play. Safari uses native HLS; other MSE browsers load the local Apache-2.0 HLS.js 1.7.3 player on demand. Native controls provide sound, seeking and fullscreen, with an explicit quality selector. Hidden tabs and scrolling the film out of view pause playback. Square checkout is not configured.

## Artwork and glass

The original landscape master is 1536 × 1024 and the portrait companion is 1024 × 1536. Responsive WebP derivatives range from 161 KB to 346 KB. These are not native 4K or 8K. A native 4K generation attempt was blocked by the connected Higgsfield workspace being out of credits; no paid upgrade or purchase was made. `qa/nebula-assets.json` records actual dimensions and assets.

`glass-optics.js` uses aligned owned-image pixels, rounded lens displacement and separate RGB sample rays. The hero, page surfaces and cinema shell share their actual backgrounds. Large panels use a feathered optical rim and GPU backdrop blur in the center, keeping text and media clear. The hero backdrop drifts behind stable controls and stops for reduced motion, hidden pages, the modal and offscreen hero. Refraction of arbitrary live DOM text or cross-origin YouTube pixels is not available; those overlapping surfaces retain a live frosted fallback. This is a web implementation, not native Apple Liquid Glass parity.

## Video behavior

The carousel now uses native horizontal overflow with a visible platform scrollbar, trackpad horizontal wheel input and touch swipes. An 18px per second automatic drift moves cards rightward through that same viewport, recycling only fully offscreen cards without duplicating the catalog. Hover and carousel focus suspend drift; manual wheel, swipe and arrow navigation receive a six second quiet period. The existing pause control stops both drift and muted previews. Reduced motion, a hidden tab, an offscreen carousel and an open player suspend motion. Scroll snapping is disabled to avoid fighting native gestures; visible previews autoplay muted. Centered 60px previous/next buttons directly below the carousel disable at its boundaries. Focused-carousel ArrowLeft/ArrowRight, Home and End navigation is supported. The older vendored Embla files are retained in source but are no longer loaded. Only visible card media intersecting both the carousel and browser viewport may play muted. Offscreen and hidden-tab media pause, and inactive ready players are evicted above a five-player pool. Clicking a preview opens a native YouTube player with sound, controls and a seekable timeline; all previews pause. Escape, close and outside click close the modal, destroy its player and return focus. A hidden tab pauses the full player without automatically resuming audio. Reduced motion and blocked autoplay retain manual playback.

YouTube chooses adaptive streaming quality. Its native controls expose available quality choices; the website does not promise or force 4K or maximum quality. Streams are not downloaded or rehosted. Chrome and native Mac WebKit were tested at desktop and iPhone-sized viewports; no physical iPhone was available.

## Contact and rollback

The four-field form retains native validation and its existing FormSubmit POST to jamaaltreasures@gmail.com with CAPTCHA. This phase did not submit a new test email or claim a fresh delivery confirmation.

Before this publication, the deployed source was commit `371da0446b6936f1825837dfa9ae95cd9e5f6d94`, Sites version 4. Recoverable backups are `/Users/cjmitchell/Documents/Codex/2026-10-05/task/rollback/before-epk-publication.bundle` and `before-epk-source.tar.gz`. Source publication uses the existing Sites project and preserves its public audience.
