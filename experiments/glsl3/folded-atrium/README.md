# Study C — The Folded Atrium

Standalone WebGL2 / GLSL ES 3.00 study. Seven chamfered ribs, one indexed phase, three depth ratios, and one bounded fold into a second chamber. Not part of the specimen shell.

Open `/experiments/glsl3/folded-atrium/` after `npm run build` (the Vite plugin copies `site/` into `dist/`). `vercel.json` excludes `/experiments` from the catch-all rewrite so the page is not replaced by the specimen `index.html`.

```bash
node --test experiments/glsl3/folded-atrium/test/fixtures.test.mjs
```

Browser checks live in `test/browser-qa.mjs` and expect the preview server. Captures and the machine-readable QA dump are in `captures/`. The decision record is `RECEIPT.md`.

Audio is not implemented. Reduced motion snaps tweens. If WebGL2 is missing, the page says so and keeps the canonical controls.
