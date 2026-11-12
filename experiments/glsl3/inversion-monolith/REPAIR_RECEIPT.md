# Inversion Monolith repair receipt

Date: 2026-11-12

Scope: first Codex review cycle for `MelodicBloom/lithomemphis#8`.

## Authority

- Base: `main@294c330c8bc57a1d13cf669533dc4d203409c924`
- Reviewed head: `cursor/inversion-monolith-56b5@5d1eb770251e13ce057d1016043ae096f61683f3`
- Repair implementation: `199f686` (`fix: harden inversion monolith interactions`)
- Review: `5863848529`
- Findings repaired: four of four
- Fresh review on `806776e`: `5880013910`
- Second-cycle implementation: `a61b272` (`fix: preserve gestures and animate fallback`)
- Fresh review on `1ff2534`: `5880378286`
- Third-cycle implementation: `6e829a4` (`fix: redirect slashless study URL`)

## Implemented behavior

1. Light and Tick paint through dedicated value spans, so their range inputs remain connected and operable.
2. Renderer IDs own attribute-backed visibility; the inactive canvas or SVG has no layout box.
3. A visitor's seed draft survives live repaints and commits through the real blur-before-click Puzzle seed sequence.
4. Context loss preserves CPU state and shows the static fallback; successful restoration recreates the program before returning to WebGL.
5. Source receipt hashing normalizes checkout line endings without changing the canonical shader hash.
6. The production build copies the canonical `experiments/` tree on platforms where the public symlink is materialized as a file.
7. Live-state clones retain the active gesture flag, while stored undo/redo snapshots remain closed; a multi-mutation drag consumes one history entry and one Undo restores the pre-drag state.
8. A guarded animation-loop starter runs the static fallback after shader initialization failure without duplicating successful, shot, or benchmark scheduling.
9. Vercel permanently redirects the slashless study route to its canonical trailing-slash URL before the existing HTML rewrite, preserving relative asset resolution.

## Verification

Required profile, using the persisted GH Review Loop verification profile:

- `node experiments/glsl3/inversion-monolith/tests/run.mjs` — passed.
- `npm.cmd exec oxlint -- experiments/glsl3/inversion-monolith/js experiments/glsl3/inversion-monolith/tests` — passed.
- `npm.cmd run build` — passed; the production preview serves the study HTML, JS, CSS, and shader resources directly.

Rendered browser regression, Chrome with SwiftShader against the production preview:

- desktop initial, aligned, hybrid, mid-state, eight morph frames, and 320 x 568 capture — passed visual inspection;
- real pointer and keyboard detent input — passed;
- light and scrub state/label synchronization — passed;
- seed draft preservation, commit, and canonical resynchronization — passed;
- repeated context loss/restoration with state-hash and renderer-layout assertions — passed;
- forced shader-fetch failure — passed: visible fallback advanced from tick 154 to 322, completed the phase plan, and repainted from detent 0 to detent 1;
- browser failure list — empty.

Additional checks:

- `git diff --check` — passed; Git reported only expected Windows line-ending conversion notices for generated JSON/Markdown working-tree files.
- `npm.cmd audit --audit-level=high` — passed with zero high or critical advisories.
- `npm.cmd audit --json` — four moderate, development-only Storybook/glob/minimatch advisories. The offered fix is a breaking Storybook downgrade, so it was not applied in this bounded visual-demo repair.
- repository-wide `npm run lint` — baseline failure in untouched `src/lab/demos.tsx` on `react(only-export-components)` warnings; study-scoped oxlint is green.

## Remaining gates

Before merge: push the repair commits, obtain a fresh Codex review on the exact pushed head, confirm current-head GitHub checks and mergeability, and record the GH Review Loop terminal receipt. A green local receipt is not a deployment or merge claim.
