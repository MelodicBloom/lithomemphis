# Receipt — Folded Atrium (Study C)

Date of this run: 2026-11-09. Persona lenses below are review perspectives, not independent reviewers. No scores, users, or rankings are invented. Jennipher has not approved the picture.

## What was built

A standalone page at `/experiments/glsl3/folded-atrium/`. Raw WebGL2, `#version 300 es`, no Three.js and no WebGPU. CPU state is integer/rational. Uniforms are recomputed from that state. The aperture is a raster quad. Its fragment shader marches at most 64 steps in each of two chambers, redirects the ray once by 90° about Y, and stops at 40 WU. Foreground ribs write depth first, so they occlude the quad.

## Decision log

| Decision | Action | Outcome | Chosen against |
|---|---|---|---|
| Raw WebGL2 | Custom meshes, one material program, one portal program | Depth test on the aperture quad was enough for the occlusion contract in this scene | Three.js. No scene-graph or picking problem forced it |
| Spine scale | Scale each rib about y = 1.7 WU | Far ribs at r = 2/3 stay in the sightline | Scaling about the floor. Those ribs became sub-WU stumps and the aperture ray passed over them |
| Phase law | Keep sin(δ) and (1−cos δ), and add a middle-rib bulge `sin(π i / 6) · 1.05 · (1−cos δ)` plus `y = (i/6) · 1.35 · sin δ` | One detent moves the seam by about 31 px at 1280×720. A purely linear `(i/6)` offset left the marks colinear | The illustrative 0.30 / 0.15 / 0.12 amplitudes, which did not break the line on screen |
| Hinge | Yaw about the right stile | A center pivot did not move the seam marks | Yaw about the slab center |
| Seam line | World line from (−0.68, 2.28, 0.3) to (−0.16, 2.02, −8.2), marks baked per target ratio | Marks sit on stone for all three ratios. Wrong states miss that line | A line through the camera (it collapses to one pixel) and a line at spine height (ratio changes slid along it) |
| Camera | Eye (1.55, 1.78, 8.6), 28° vertical fov | The near rib reads as a slab with black space around it | The closer camera, which filled the frame with one wall |
| Routing | Vite plugin copies `site/` into `dist/experiments/...`. `vercel.json` excludes `/experiments` from the specimen rewrite | Preview curl returned the study HTML and the shader, not the specimen shell | A `public/` symlink. Vite's public walker rejects symlinks |
| Audio | Not added | The scene stays silent | An opt-in synth. It was allowed later and is not needed for the spatial test |

## Parameter table

Units are illustrative world units (WU), not metres.

| Quantity | Domain | Equation |
|---|---|---|
| Phase k | integer 0…23, wraps | θ = 2π k / 24. One detent is π/12. Ease E(u) = 1−(1−u)⁴ over 50 ticks at 120 Hz |
| Depth ratio r | {2/3, 3/4, 4/5}, stored as n/d | z_i = −2 (1−r^i)/(1−r), scale_i = r^(i/2), i = 0…6. Ratio ease is smoothstep over 72 ticks |
| Phase offset | derived | x_i = (i/6) (0.22 sin δ + 0.72 (1−cos δ)); yaw about the right stile (i/6)·0.38·sin δ; vertical bulge as in the decision log. δ = 2π (k_visual − k*) / 24 |
| Light azimuth | integer degrees [−60, 60], elevation fixed 35° | L = (cos e sin α, sin e, cos e cos α), then normalized |
| Mist σ | 0…0.06 WU⁻¹, default 0.012, stored in micros | T(d) = exp(−σ clamp(d, 0, 40)) |
| Bridge | 0…1000 thousandths | Opens when logical (k, r) equals the target and no structural transition is running. 72-tick smoothstep. Slide 0.86 WU |
| Inspect | free mode only, yaw ±12°, pitch ±8° | Puzzle mode refuses it and holds the fixed camera |
| Queue | 0…2 structural commands | A third is refused and announced. Undo, reset, and preset clear it |
| History | 128 snapshots | The next push drops the oldest and says so |
| Clock | integer tick, 120 Hz | Hidden tab and pause do not advance it. Seek sets the tick and does not drain the queue |

## Fixture results (this machine, 2026-11-09)

`node --test experiments/glsl3/folded-atrium/test/fixtures.test.mjs` — 10/10 passed.

| Check | Result |
|---|---|
| 100/100 seeded traces | Identical canonical SHA-256 both replays |
| Seek A→B→A | Scene serialization matched |
| 72 endpoints | Finite uniforms, inside scene bounds, seam anchors on stone |
| Seam fairness at 1280×720 | Target error ~0. Non-target minimum 5.64 px (correct phase, neighboring ratio) |
| Same enumeration at 320×568 | Non-target minimum 4.45 px |
| 10,000 invalid inputs | Non-finite and illegal discrete inputs refused with no hash change. Finite out-of-range sliders clamped. Every resulting scene stayed in domain |
| Portal center ray | 1 redirect, a hit, ≤64 steps per chamber, travel ≤ 40 WU |
| Shader sources | All four start with `#version 300 es`. Portal defines `MAX_STEPS = 64` and `MAX_DIST = 40.0` and calls `foldDir` once |
| Aligned center ray vs ribs | Not occluded. Stagger preset center ray is occluded. The misaligned preset still leaves a few aperture samples open, so the cold inset is hinted before the solve |
| Queue / undo / reset | CPU tests passed. In Chrome, ArrowRight changed k, a fourth rapid Phase+ was refused with “Queue full — action refused”, and Reset restored the stagger preset |

Source hash of the study modules and shaders (SHA-256 of their concatenation): `dd91d5530e151c3af6a4c1d4680f7d1eadf109924b2543c86721f21d428d5179`.

## Performance (not a pass of the 20 ms gate)

Device: this container. Renderer string: `Google Inc. (Google) / ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. This is software rendering. It is not a pass of the proposed 20 ms p95, and it is not a phone or an M2.

Drawing buffer 1280×720, DPR 1, seam preset, paused so the pose is still. About 8 s after a short settle, requestAnimationFrame intervals:

| | n | p50 | p95 | p99 | fraction > 25 ms |
|---|---|---|---|---|---|
| Portal march on | 226 | 33.3 ms | 50.1 ms | 83.4 ms | 0.81 |
| Portal march off (flat aperture quad) | 237 | 33.3 ms | 50.1 ms | 83.4 ms | 0.79 |

The portal delta is inside the noise of this sample. That does not show the march is cheap on a GPU; SwiftShader is already far above the gate with the portal off. `EXT_disjoint_timer_query_webgl2` was not read, so GPU time is unmeasured. The protocol's 10 s warmup and 3×60 s runs were not done. A separate ~4 s sample while the clock was running gave p50 33.3 ms, p95 66.7 ms, p99 83.4 ms.

CPU state updates in that 4 s sample had a p95 around 2.5 ms for a single `advance` dispatch. That is not frame time.

## Context loss

Five lose/restore cycles in this Chrome, clock paused, same canonical hash before and after each cycle. The page reports loss and restore in the notice line.

## What is unverified

- Jennipher's visual approval. The stills show a chalk slab, a receding set of frames, black space, saffron and cinnabar on the near pier, and a cold rectangle in the opening. The 90° chamber is in the shader; the stills do not make the sideways vanishing obvious.
- A real GPU, a phone, and the proposed M2 laptop.
- Disjoint GPU timer queries.
- The full 3×60 s protocol, and any comparison with KODE or WebGL Water. Those stays are unmeasured, not zero.
- Cross-device pixels. No image tolerance is locked.
- A recorded participant doing the control task. Browser automation checked keyboard phase, queue refusal, and reset. It is not a usability study.
- Audio. There is none.
- Screen recording. Stills are in `captures/`.

## Competitive cells

Old clockwork, KODE, and WebGL Water were not timed here. Every external metric is unmeasured. No rank is assigned.
