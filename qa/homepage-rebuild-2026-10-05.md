# Homepage rebuild verification

- All 36 supplied copy blocks match verbatim after HTML whitespace normalization. Section order matches the brief. Homepage display text contains no dashes.
- Ten service buttons jump to contact and preselect their project type. Safari confirmed Brand Film selection.
- Three testimonial spaces remain blank. The community is near the footer.
- Native THE REALM player starts on explicit interaction, shows the 4:18 duration, plays, and pauses in Safari. English captions rendered correctly at the sampled 3-second cue. The VTT is generated from V3's 56-cue manifest, whose final-mix ASR audit is retained alongside the original export. No timing changes were applied to the web export. Whole-film listening was not repeated.
- The complete web MP4 decoded without errors. Original V3 is untouched. New derivative is 23,441,847 bytes, below 25 MiB; H.264/AAC, 720p, 30fps, MP4 faststart. First load uses preload none.
- Six thumbnails are verified JPEG bytes downloaded directly from YouTube. All six videos have direction credits in the existing audited catalog. Invalid cloud prototype thumbnail files were never copied into the deployment.
- The first YouTube video played in the mobile dialog. The close button removed the player and returned keyboard focus to the originating card. Escape within a focused third-party YouTube player may be handled by YouTube; the labeled close button remains available.
- Desktop Safari hero inspected. Responsive mode at 390 x 844 inspected hero, pricing, form, and music video dialog; 320 x 844 hero inspected. No visible clipping or horizontal overflow. Native form labels, required fields, email type, keyboard focus styles, skip link, reduced-motion support, and 16px mobile inputs retained. This was Safari QA, not a claim of testing every browser or a physical iPhone.
- Static build verifies local asset references and maximum file sizes. JavaScript syntax passes. Initial HTML/CSS/JS totals 30,959 bytes and hero WebP 96,354 bytes, with no framework or external fonts. Video embeds wait for interaction.
- Approved local FormSubmit setup test sent at approximately 22:40 UTC. Parent verified activation email at 22:40:17 and actual quote payload at 22:40:29; the email landed in Spam. Production-domain test follows publication.
- Runtime output contains no localhost endpoint, invented reviews, unverified membership checkout, analytics script, or credentials.
