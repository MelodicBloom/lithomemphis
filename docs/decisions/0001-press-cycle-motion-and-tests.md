# 0001 — Press-cycle driver and test stack

Status: accepted for this experimental slice. Date: 2026-11-09.
Branch base: `main` @ `294c330c8bc57a1d13cf669533dc4d203409c924`.

This slice is one lab specimen, `litho.print.stamp-bleed-relief-v0`. It does not promote the consumable, change tokens, or add a `/portico` beat. Draft Consumer Spec v1.3 lives only on unmerged PR #5 (`docs/w2-w3-scope` @ `540c3ecaee6c6c976526b652e1895e4f9ac68407`). Those docs are cited as draft. Classification stays **DEFER**.

## What was already here

Measured before any edit, Node v22.23.4, `npm ci` from `package-lock.json`. No `engines` field, no test runner, no Cypress, no Playwright, no `.github/workflows`.

| Check | Result |
|---|---|
| `npm run lint` | exit 1. Pre-existing `react-hooks/rules-of-hooks` in `src/stories/LabCards.stories.tsx` (hooks inside an anonymous story render). Other hits were warnings. |
| `npm run build` | pass. `tokens:audit` 49 tokens, 0 drift. `tsc -b` and Vite build succeeded. |
| `npm run build-storybook` | pass. Storybook 10.6.4. |

`/portico` is not a route on `main`. Unknown paths render `Home` through the wildcard. The live `/portico` URL is that fallback, not a portico page.

Stack that stays: Vite, React 19, TypeScript, Tailwind 4, Storybook, oxlint, `motionSafe()` and `Spring` for the other lab demos, Icon filters `lm-ink-bleed` and `lm-stamp`.

## Motion engine

The specimen needs one external progress `t ∈ [0,1]` (plate-state scrub), plus pause, replay, seek, and dispose. The picture is a pure function of `t`, the seed, and `presentationMode`. It is not a multi-actor timeline.

| Option | Decision |
|---|---|
| CSS presentation + a tiny clock driver | **Use.** CSS variables paint the plate. A clock-injected driver advances `t` only while playing. `setProgress` cancels the frame. Node tests can drive the clock without a DOM timeline. |
| WAAPI `element.animate()` | Not used. Seeking one custom property would work in the browser and would not add a second engine, but it is harder to unit-test and does not describe more than one scalar. |
| GSAP | Not added. No coordinated multi-target timeline. The GSAP license is not MIT/Apache/BSD. |
| Motion | Not added. MIT, but it would be a second runtime engine and a client bundle for a function of `t`. |

`src/lib/spring.ts` stays the press physics for the other lab cards. This specimen does not call it. A spring and an external scrub would be two writers of the same pose.

There is no always-on loop. `requestAnimationFrame` runs only during replay. A `setInterval` runs only while the pointer is held, and it stops at the bleeding snapshot. Reduced mode never starts the clock. Replay in reduced snaps to idle and stays there.

Sensors are off unless `sensors="enhancement"`. The page checkbox is unchecked. Nothing required is behind a sensor. No DeviceOrientation permission prompt.

## Tests

| Option | Decision |
|---|---|
| `node:test` on the pure model and the driver | **Use.** Node 22.23 already runs type-stripped tests. No new unit runner. |
| Storybook `play` via `storybook/test` | **Use.** Already shipped inside Storybook 10.6.4. Plays run in the preview. |
| Playwright | **Use,** one browser suite. Dev dependency only. Apache-2.0. It covers fixed-seed, fixed-progress screenshots, keyboard, reduced motion, dwell hysteresis, and the Storybook plays (one iframe load each). |
| Cypress | Not added. It would be a second browser suite beside Playwright. |
| axe | Not added. The Playwright name, focus, and 44px checks are partial proof only. |

Screenshot policy: `maxDiffPixels: 0` and `threshold: 0`. `updateSnapshots` is `none` when `CI` is set, so CI cannot accept a new baseline. Reviewers update locally with `npx playwright test --update-snapshots` and look at the PNGs. Stills are seeked with `?t=` after `document.fonts.ready`. Pause, dwell, and replay are separate tests and are not screenshot baselines.

Proposed timing, not a pass/fail budget: authored playback is 2400ms on the manual clock (`AUTHORED_CYCLE_MS / 16` frames at a 16ms step). A browser sample is logged as `PERF_SAMPLE` and copied into the build receipt. The only automated timing bounds are "more than one update" and "finished in under 8s", which catch a stuck loop.

## Dependency

`@playwright/test` is the only new dependency. It is not in the client bundle. The app does not gain GSAP, Motion, Cypress, or a second test runner.

`engines.node` is `>=22.18.0` because that is the line where Node type-stripping covers these tests. `.nvmrc` pins CI to the measured runtime, 22.23.4.
