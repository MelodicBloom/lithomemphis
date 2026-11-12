# Inversion Monolith review repair specification

Status: accepted for implementation on PR #8 after Codex review `5863848529`.

Authority:

- Repository: `MelodicBloom/lithomemphis`
- Pull request: `#8`, `cursor/inversion-monolith-56b5` into `main`
- Reviewed head: `5d1eb770251e13ce057d1016043ae096f61683f3`
- Required verification profile: study logic, study-scoped lint, and production build

This specification is the change boundary for the first review cycle. It fixes the four unresolved reviewer findings and adds only the regression and delivery coverage needed to prove those repairs. It does not change the sculpture, shader equations, state domains, puzzle rules, captures, performance claims, application routes, dependencies, or Vercel rewrite rules.

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

1. Add scoped `#stage[hidden], #fallback[hidden] { display: none; }` rules after the canvas/SVG display rule. The renderer IDs are required so the hidden rule outranks the existing `#fallback` display selector without using `!important`.
2. Continue using `setMode()` as the single owner of renderer visibility, and toggle the actual `hidden` attributes rather than relying on SVG `.hidden` property behavior.

Acceptance:

- Exactly one of `#stage` and `#fallback` is visible in WebGL and fallback modes.
- The inactive renderer has no layout box.
- The control band is not displaced by an empty renderer row.

### R3 — preserve an in-progress seed edit

Problem: live clock repainting assigns `dom.seed.value` on every tick, overwriting a visitor's unsubmitted seed draft.

Design:

1. Track the canonical seed last rendered into the field.
2. Synchronize the field only when canonical `state.seed` changes, rather than on every clock repaint.
3. Preserve the visitor's draft across focus and blur until the Puzzle seed action reads it.
4. Keep `readSeed()` as the validation boundary and force canonical resynchronization after that action, including its invalid-input fallback.

Acceptance:

- A typed seed field retains its valid draft across live clock repaints and a real blur-before-click sequence.
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

### R5 — keep source receipts stable across checkout line endings

Problem: the logic suite hashes working-tree text verbatim. Git's Windows checkout converts LF to CRLF, changing the recorded shader and JS source hashes even when the Git blobs are otherwise identical.

Design:

1. Normalize CRLF and lone CR to LF before hashing text sources.
2. Continue hashing the same shader and JS file lists in the same order.

Acceptance:

- The unchanged shader pair retains its existing canonical hash on Windows and POSIX.
- JS source hashes change for substantive runtime edits, not checkout line-ending policy.
- All existing logic assertions continue to pass.

### R6 — include the study in cross-platform production builds

Problem: `public/experiments` is a Git symlink. On Windows without symlink checkout support it becomes a 14-byte placeholder file, so Vite reports a successful build but emits `dist/experiments` as a file and serves the application shell for every study resource.

Design:

1. Add a dependency-free Vite build plugin that copies the repository's canonical `experiments/` directory to `dist/experiments/` after the normal bundle.
2. Remove an emitted placeholder file before copying when the checkout cannot materialize the symlink.
3. Keep `public/experiments` and Vercel rewrites unchanged for existing POSIX behavior.

Acceptance:

- `npm run build` produces `dist/experiments/glsl3/inversion-monolith/index.html` and its JS, CSS, and shader resources on Windows and POSIX.
- Vite preview serves the study HTML and resources directly rather than the application shell.
- The browser regression suite passes against the production preview URL.

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
2. `npm.cmd exec oxlint -- experiments/glsl3/inversion-monolith/js experiments/glsl3/inversion-monolith/tests` on Windows (`npm exec` on POSIX)
3. `npm.cmd run build` on Windows (`npm run build` on POSIX)

The repository-wide `npm run lint` remains an additional diagnostic. At the reviewed base it exits nonzero on pre-existing `react(only-export-components)` warnings in `src/lab/demos.tsx`, which is outside PR #8. Those warnings are recorded as baseline debt rather than widened into this visual-demo repair.

Targeted browser regression checks:

- DOM connectivity and layout boxes for both renderer elements and both range inputs.
- Light, scrub, seed-draft, and Puzzle seed interactions through the rendered controls.
- WebGL compile/draw and context loss/restoration with visible-mode assertions.
- Desktop and 320 x 568 layouts, console errors, failed resources, keyboard focus, and reduced-motion behavior.

Test harness portability:

- `tests/capture.mjs` may accept `CHROME_BIN` and use the operating system's temporary directory so the same CDP checks can run on Windows while retaining `google-chrome` as the default on existing Linux runners.

Additional scans:

- `npm audit --audit-level=high`
- repository-wide `npm run lint`, with base-versus-PR attribution for any failure
- `git diff --check`
- changed-file review against this specification
- current-head GitHub checks and unresolved review threads after push

## Merge gate

Do not merge unless all required profile checks pass on the final source, the targeted browser checks pass or are explicitly classified with a human decision, the four review threads are superseded or resolved by the reviewer, the exact pushed head has no blocking checks or conflicts, and the visual result is reviewed at desktop and narrow viewports. A successful Vercel deployment alone is not a visual or engineering pass.

Rollback is `git revert` of the repair commits. The original study commit remains independently recoverable.
