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
3. Keep `public/experiments` and unrelated Vercel rewrites unchanged for existing POSIX behavior; canonical slash handling is specified separately in R9.

Acceptance:

- `npm run build` produces `dist/experiments/glsl3/inversion-monolith/index.html` and its JS, CSS, and shader resources on Windows and POSIX.
- Vite preview serves the study HTML and resources directly rather than the application shell.
- The browser regression suite passes against the production preview URL.

### R7 — preserve one history entry for an active gesture

Problem: `cloneState()` recreates live state through `snapshot()` and `inflate()`, both of which intentionally clear `gesture` for stored undo/redo snapshots. A live slider or camera drag therefore loses its active-gesture flag after the first input mutation or clock advance, causing later pointer moves to append history entries instead of extending the original gesture.

Design:

1. Keep `snapshot()` and `inflate()` zeroing `gesture` so persisted undo/redo states cannot restore a half-open interaction.
2. After cloning live state, explicitly copy the current live `state.gesture` value onto the clone.
3. Add a regression that begins a gesture, performs multiple light and camera mutations with an intervening clock advance, and verifies that history grows only at gesture start.

Acceptance:

- An active gesture remains active across live-state cloning and clock advancement.
- Repeated mutations during one gesture do not append history entries.
- Gesture end clears the flag without adding history.
- One Undo after the gesture restores the pre-gesture state.
- Undo/redo snapshots continue to restore with `gesture === 0`.

### R8 — run the static fallback after shader initialization failure

Problem: the shader load/compile rejection path paints the fallback once but never schedules `loop()`. In the default animated state, later Phase or Section actions enqueue transitions whose ticks never advance, so the controls and static geometry diverge and the queue can remain permanently full.

Design:

1. Introduce one guarded animation-loop starter used by every non-shot runtime path.
2. Start that loop after shader load or compilation failure, after setting fallback mode and painting the diagnostic state.
3. Keep shot and benchmark paths deterministic and avoid scheduling duplicate animation loops.
4. Extend the browser harness with a request-interception case that forces one shader request to fail and proves that fallback state advances after a real control action.

Acceptance:

- A forced shader failure reaches ready fallback mode with the canvas hidden and SVG visible.
- A Phase action in that mode advances ticks and updates the fallback geometry/state instead of leaving an open plan frozen.
- The diagnostic notice remains visible until a subsequent user action produces its own notice.
- Successful WebGL, WebGL-unavailable, context-loss, shot, and benchmark paths retain their existing scheduling behavior.

### R9 — canonicalize the deployed study URL before serving relative assets

Problem: the slashless Vercel rewrite serves the study HTML at `/experiments/glsl3/inversion-monolith` without changing the browser URL. Relative `./css`, `./js`, and `./shaders` references then resolve from `/experiments/glsl3/` instead of the study directory.

Design:

1. Replace only the slashless study rewrite with a Vercel `redirects` entry targeting `/experiments/glsl3/inversion-monolith/`.
2. Use a permanent redirect so the canonical directory URL is stable; Vercel documents this as HTTP 308 and processes redirects before rewrites.
3. Retain the trailing-slash rewrite to `index.html` and the existing exclusions from the application-shell catch-all.

Acceptance:

- The Vercel configuration parses and the production build remains green.
- A deployed request to the slashless URL returns a redirect whose `Location` is the trailing-slash URL.
- The trailing-slash URL returns the study HTML and its relative CSS, JS, and shader requests succeed.
- Storybook and the application-shell catch-all behavior remain unchanged.

### R10 — close range-input gestures when the pointer is canceled

Problem: the Light and Tick sliders open a coalesced history gesture on `pointerdown` and close it only on `pointerup`. Touch scrolling and other browser interventions can emit `pointercancel` instead, leaving `state.gesture` active so later keyboard or control changes are folded into the abandoned gesture and cannot be undone independently.

Design:

1. Route both range controls through one gesture-aware binding helper so their pointer lifecycle cannot drift.
2. End the gesture on both `pointerup` and `pointercancel`; keep `input` and `change` dispatch semantics unchanged.
3. Add a focused event-level regression that exercises cancellation for Light and normal pointer completion for Tick, proving both controls emit the same closed gesture lifecycle.
4. Extend rendered-browser coverage to cancel a real Light slider gesture, perform a keyboard Light change, and verify that one Undo reverses only the keyboard change.

Acceptance:

- `pointercancel` on either range input dispatches `{ type: 'gesture', value: 0 }`.
- After a canceled slider interaction, the next keyboard or control mutation creates its own history entry.
- One Undo after that later mutation returns to the canceled gesture's final value rather than the pre-gesture value.
- Normal `pointerup`, range `input`, and range `change` behavior remains unchanged for both sliders.

### R11 — preserve the 16:9 renderer frame on narrow viewports

Problem: the narrow-layout rule independently sets `width: 100%` and `height: 200px` on the 1280 × 720 canvas and the 640 × 360 fallback. A 320 px viewport leaves a 284 × 200 content box, compressing the scene horizontally; other mobile widths stretch it until the available width happens to be about 356 px.

Design:

1. Keep both renderers centered and constrained to the available width, but derive height from their shared intrinsic 16:9 ratio instead of fixing it independently.
2. Retain 200 px as the narrow stage's minimum reserved height so controls do not jump when renderer modes change.
3. Apply the same sizing contract to the WebGL canvas and static SVG fallback.
4. Extend the browser harness to measure the visible renderer at 320 × 568 and reject a material deviation from 16:9.

Acceptance:

- At a 320 px viewport, the visible renderer's CSS width-to-height ratio is 16:9 within one device pixel of rounding.
- Neither renderer exceeds the stage's available width.
- Switching between WebGL and fallback does not change the renderer aspect ratio.
- Desktop sizing and the 1280 × 720 drawing buffer remain unchanged.

### R12 — make invalid Puzzle seed drafts fall back without throwing

Problem: the Puzzle preset passes `getState()` into `readSeed()`, but the invalid-input path calls its second argument as a function. Drafts below 0, above `0xffffffff`, non-integers, and non-numbers therefore throw instead of falling back to the canonical seed.

Design:

1. Pass the state getter itself to the seed validation boundary.
2. Keep valid unsigned 32-bit integer drafts authoritative for the new puzzle.
3. Keep invalid drafts non-authoritative: use the current canonical seed and force the input to resynchronize after dispatch.
4. Add deterministic and rendered-control coverage for both `-1` and `4294967296`.

Acceptance:

- Clicking Puzzle with either boundary-invalid draft produces no exception.
- The resulting puzzle retains the current canonical seed for invalid drafts.
- A valid draft such as `4242` still becomes the new canonical seed.
- After the action, the input displays the canonical seed rather than the rejected draft.

### R13 — keep the amber puzzle reference visible across section changes

Problem: puzzle uniforms place the amber target endpoints at the target section depth, while both the raymarched surface and amber shading are limited to the currently selected cut plane. When current and target sections differ, the guide is not on the visible surface and disappears, preventing the intended comparison.

Design:

1. Continue deriving the guide's X/Y endpoints from the canonical target detent and target section so it remains the exact puzzle reference.
2. Project only those endpoints' Z coordinate onto the current visible cut plane before upload.
3. Keep the current seam as the separately carved edge; do not alter alignment rules, target generation, or solved-state logic.
4. Add uniform-contract coverage for a puzzle whose current and target sections differ, and capture a rendered off-target puzzle state for visual review.

Acceptance:

- In every puzzle section, both amber endpoints lie on the current cut plane.
- Their X/Y coordinates remain those of the target seam, including the target section's lateral offset.
- The carved current seam still follows the current animated section and phase.
- Alignment, hint distance, deterministic replay, and free-explore rendering remain unchanged.

### R14 — remove undefined descending-edge GLSL `smoothstep`

Problem: GLSL leaves `smoothstep(edge0, edge1, x)` undefined when `edge0 >= edge1`. The cut-face cavity shading currently supplies `0.28, 0.0`; SwiftShader's observed output does not establish portable behavior on other GPU drivers.

Design:

1. Express the intended decreasing transition as `1.0 - smoothstep(0.0, 0.28, cavity)`.
2. Preserve the existing `mix(1.0, 0.62, ...)` endpoints and therefore the intended visual direction.
3. Scan every constant-edge `smoothstep` call in the fragment shader and reject non-ascending edge pairs.
4. Recompile and render the shader through the normal browser profile after the source change.

Acceptance:

- No constant-edge `smoothstep` call in `monolith.frag` has equal or descending edges.
- Cavity values at and below 0 map to the same transition endpoint as intended, and values at or above 0.28 map to the opposite endpoint.
- WebGL2 shader compilation and representative readback checks pass.
- No unrelated shading, march bounds, or uniform domains change.

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
- Forced shader-fetch failure with a progressing static-fallback clock.
- Multi-mutation gesture history coalescing, including an intervening clock advance.
- Range-input `pointercancel` closure followed by an independently undoable keyboard mutation.
- Desktop and 320 x 568 layouts, console errors, failed resources, keyboard focus, and reduced-motion behavior.

Test harness portability:

- `tests/capture.mjs` may accept `CHROME_BIN` and use the operating system's temporary directory so the same CDP checks can run on Windows while retaining `google-chrome` as the default on existing Linux runners.

Additional scans:

- `npm audit --audit-level=high`
- repository-wide `npm run lint`, with base-versus-PR attribution for any failure
- `git diff --check`
- changed-file review against this specification
- current-head GitHub checks and unresolved review threads after push
- deployed slashless redirect and trailing-slash resource checks after Vercel reports success

## Merge gate

Do not merge unless all required profile checks pass on the final source, the targeted browser checks pass or are explicitly classified with a human decision, all review threads are superseded or resolved, the exact pushed head has no blocking checks or conflicts, and the visual result is reviewed at desktop and narrow viewports. A successful Vercel deployment alone is not a visual or engineering pass.

Rollback is `git revert` of the repair commits. The original study commit remains independently recoverable.
