# BUILD_RECEIPT — experimental stamp → bleed → relief

Bounded proof only. Classification stays **DEFER**. No merge, no force-push, no branch protection, no paid services, no credential changes, no runtime promotion.

## Identity

| | |
|---|---|
| Start SHA | `294c330c8bc57a1d13cf669533dc4d203409c924` (`main`, 2026-11-06, matches the brief) |
| Branch | `cursor/press-cycle-specimen-9bdf` |
| Final SHA | filled after the implementing commit; the PR head is the source of truth |
| Draft spec | [PR #5](https://github.com/MelodicBloom/lithomemphis/pull/5) still open, head `540c3ecaee6c6c976526b652e1895e4f9ac68407`. Those docs are **not** on `main`. This specimen cites them as draft. |
| Live route | `/lab/press-cycle` (and `/lab#press-cycle` on the pick board) |

`/portico` is still not a route. The wildcard still renders Home.

## What changed

- `src/lab/press-cycle/` — plate model, clock-injected controller, React specimen, CSS
- `src/pages/LabPressCycle.tsx` and a `/lab/press-cycle` route
- one pick-board card (`press-cycle`) and a lab header link
- Storybook plays under `Lab/Press cycle`
- `node:test` for clamp, seed, phenomenon boundaries, reduced snapshots, dwell hysteresis, pause/dispose/sensor
- Playwright stills, keyboard, reduced motion, dwell, replay sample, Storybook play smoke
- `.github/workflows/ci.yml` — `contents: read`, Node from `.nvmrc` (22.23.4), `npm ci`, separate lint / typecheck / unit / storybook / playwright jobs, artifacts, no `pull_request_target`, no secrets, actions pinned to commit SHAs
- `docs/decisions/0001-press-cycle-motion-and-tests.md`
- `docs/lab/press-cycle.md`, `press-cycle.receipt.json`, `press-cycle-perf-sample.json`
- Pre-existing oxlint error in `src/stories/LabCards.stories.tsx` (hooks in an anonymous render) fixed so the new lint job can pass. Warnings that already existed are unchanged.

Tokens, unrelated routes, and `token-audit-receipt.json` are unchanged.

## Commands (this environment)

| Command | Result |
|---|---|
| Baseline `npm run lint` (before edits) | exit 1. `LabCards.stories.tsx` rules-of-hooks. |
| Baseline `npm run build` | pass. tokens:audit 49 tokens, 0 drift. |
| Baseline `npm run build-storybook` | pass. Storybook 10.6.4. |
| `npm run test:unit` | pass. 11 tests. |
| `npm run lint` (after) | exit 0. Pre-existing warnings only. |
| `npm run test:e2e` | pass. 16 tests. Screenshot compare used `maxDiffPixels: 0` and `threshold: 0` against the committed baselines (second run did not rewrite them). |
| Node | v22.23.4. Lockfile install. New devDependency: `@playwright/test` 1.65.0 (Apache-2.0, not in the client bundle). |

CI on GitHub had not run at the time this file was first written. The PR body is updated with the run URL after the workflow is observed. Do not treat a missing check as a pass.

## Preview

No deploy job was added. A Vercel preview exists only if the existing GitHub integration comments on the PR. A Storybook artifact is a static build, not a live site. The page to open on a preview host is `/lab/press-cycle`.

## Decision

One scalar plate scrub. CSS variables paint it. A tiny clock advances `t` only while Replay is playing. GSAP and Motion were not added. Cypress was not added. `Spring` stays on the other lab cards and is not a second writer of this plate. Details: `docs/decisions/0001-press-cycle-motion-and-tests.md`.

## Measured motion sample

Headless Chrome 158, Node v22.23.4, linux, viewport 1280×800.

- Manual clock: 150 frames × 16ms = 2400ms to reach `t=1` (`AUTHORED_CYCLE_MS`).
- Browser Replay: 145 `data-t` updates in about 2428ms and 2430ms on two samples.
- Proposed budget (not a CI gate): 0 frames while paused, authored playback 2400ms.

The webm is `/opt/cursor/artifacts/press-cycle-replay.webm` (sha256 `2501ad0b6dd3339d1672b7652b2b905a8311326858d6448f6b99fdd2587f2679`, container duration 4.32s including a short hold after `t=1`). It is not in the git tree.

## Stills

Committed under `e2e/press-cycle.spec.ts-snapshots/`. CI sets Playwright `updateSnapshots: 'none'`. These PNGs are proposed baselines for a human to look at. They are not auto-accepted.

`plate-bleeding-linux.png`, `plate-bleeding-reduced-linux.png`, and `plate-reduced-motion-linux.png` share sha256 `0842a613…` because reduced mode and `prefers-reduced-motion` at `t=0.52` render the canonical bleeding still (`t=0.63`). `plate-bleeding-edge-linux.png` is the full-mode edge and is a different image. That match is the orthogonal-mode check.

## Known limits

- Experimental. Not ADAPT. Not a calibrated press. Units are illustrative.
- No `/portico` beat.
- Gyro is optional, off by default, and does not request an iOS permission.
- Automated a11y checks are name, tab order, and 44px targets only.
- Screenshot baselines are linux Headless Chrome 158. Another OS will not match at zero tolerance; do not loosen the threshold to hide that.
- Storybook plays use the scrubber and buttons. Arrow keys are covered by Playwright on `/lab/press-cycle`, because the Storybook preview binds arrows.
- `npm audit` reported 4 moderate vulnerabilities before and after adding Playwright. They were not “fixed” with `--force`.

## Next bounded slice

Human visual review of the stills and the replay. Only after that review should anyone talk about DEFER → ADAPT, and only then a separate change for a `/portico` orientation beat. Do not widen this PR into that.
