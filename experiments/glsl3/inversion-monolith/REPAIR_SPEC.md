# Inversion Monolith review repair specification

Status: accepted for implementation on PR #8 after Codex review `5863848529`.

Authority:

- Repository: `MelodicBloom/lithomemphis`
- Pull request: `#8`, `cursor/inversion-monolith-56b5` into `main`
- Reviewed head: `5d1eb770251e13ce057d1016043ae096f61683f3`
- Required verification profile: study logic, repository lint, and production build

This specification is the change boundary for the first review cycle. It fixes the four unresolved reviewer findings and adds only the regression coverage needed to prove those repairs. It does not change the sculpture, shader equations, state domains, puzzle rules, captures, performance claims, application routes, dependencies, or deployment configuration.

## Findings and required behavior

### R1 — preserve the Light and Tick range inputs

Problem: `paintControls()` assigns `textContent` to labels that contain the `#light` and `#scrub` inputs. The first paint removes both inputs from the document.

Design:

1. Add dedicated `#light-value` and `#tick-value` spans inside the existing labels.
2. Add those spans to the DOM map.
3. Update only the spans during paint; never replace either label's children.

Acceptance:

- Both inputs are connected after initial boot and after a state-changing repaint.
- The light input remains operable and changes `state.lightDeg`.
- The scrub input remains operable and changes `state.tick`.
- The visible label text reflects the resulting state.

### R2 — make renderer visibility honor `hidden`

Problem: the author rule `canvas, svg { display: block; }` overrides the browser's default `[hidden]` rule. The inactive renderer can keep a full grid row.

Design:

1. Add a scoped `.stage-wrap > [hidden] { display: none; }` rule after the canvas/SVG display rule.
2. Continue using `setMode()` as the single owner of renderer visibility.

Acceptance:

- Exactly one of `#stage` and `#fallback` is visible in WebGL and fallback modes.
- The inactive renderer has no layout box.
- The control band is not displaced by an empty renderer row.

### R3 — preserve an in-progress seed edit

Problem: live clock repainting assigns `dom.seed.value` on every tick, overwriting a visitor's unsubmitted seed draft.

Design:

1. Do not synchronize the seed field while it owns focus.
2. Resume state-to-field synchronization after focus leaves the field.
3. Keep `readSeed()` as the validation boundary used by the Puzzle seed button.

Acceptance:

- A focused seed field retains a typed valid value across live clock repaints.
- Clicking Puzzle seed commits that value and produces the corresponding puzzle preset.
- A later state change updates the unfocused field from canonical state.
- Invalid seed input continues to fall back to the current canonical seed.

### R4 — show and retain the static fallback during context loss

Problem: the context-loss handler clears the GPU program but leaves renderer mode as `webgl`, so the fallback is skipped. Restoration also lacks a local failure boundary.

Design:

1. On `webglcontextlost`, preserve CPU state, clear the GPU handle, switch to fallback mode, and paint the static section.
2. On restoration, recreate the program inside `try/catch`.
3. Return to WebGL mode only after successful program creation.
4. If restoration fails, keep the fallback visible and report the failure without discarding CPU state.

Acceptance:

- Context loss preserves the canonical state hash.
- During loss, `mode()` reports `fallback`, the SVG is visible, and the canvas is hidden.
- Successful restoration returns to `webgl` and preserves the hash.
- A failed restoration remains in fallback mode and exposes a diagnostic notice.

## Changed-file sibling sweep

The PR's complete changed-file list was searched before implementation for:

- `textContent =`
- `display: block`
- `seed.value`
- `webglcontext`
- `setMode(`

The only destructive parent-label assignments are the two reported sites. The only author `display: block` rule is the reported canvas/SVG rule. Seed synchronization has one read and one write site. Context loss/restoration has one handler pair, and all renderer-mode transitions are in `main.js`.

## Verification and bug-scan contract

Required profile checks:

1. `node experiments/glsl3/inversion-monolith/tests/run.mjs`
2. `npm run lint`
3. `npm run build`

Targeted browser regression checks:

- DOM connectivity and layout boxes for both renderer elements and both range inputs.
- Light, scrub, seed-draft, and Puzzle seed interactions through the rendered controls.
- WebGL compile/draw and context loss/restoration with visible-mode assertions.
- Desktop and 320 x 568 layouts, console errors, failed resources, keyboard focus, and reduced-motion behavior.

Test harness portability:

- `tests/capture.mjs` may accept `CHROME_BIN` and use the operating system's temporary directory so the same CDP checks can run on Windows while retaining `google-chrome` as the default on existing Linux runners.

Additional scans:

- `npm audit --audit-level=high`
- `git diff --check`
- changed-file review against this specification
- current-head GitHub checks and unresolved review threads after push

## Merge gate

Do not merge unless all required profile checks pass on the final source, the targeted browser checks pass or are explicitly classified with a human decision, the four review threads are superseded or resolved by the reviewer, the exact pushed head has no blocking checks or conflicts, and the visual result is reviewed at desktop and narrow viewports. A successful Vercel deployment alone is not a visual or engineering pass.

Rollback is `git revert` of the repair commits. The original study commit remains independently recoverable.
