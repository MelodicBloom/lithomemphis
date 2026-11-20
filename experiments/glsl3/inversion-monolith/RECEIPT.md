# Receipt — Study A, The Inversion Monolith

Date of this run: 2026-11-09. Human visual approval by Jennipher is still open. Passing these checks is not completion.

The persona lenses below are review perspectives used while writing this study. They are not independent reviewers, and they are not scores.

## Decision log

| Decision | Action | Outcome | Chosen against, and why |
|---|---|---|---|
| Technique | Full-frame SDF raymarch, GLSL ES 3.00, raw WebGL2 | One stone mass whose carved hall can change shape without a mesh swap | Suspended Colonnade and Folded Atrium are the other studies. A clockwork reskin was the rejected reference. |
| Distance bounds | Rigid `rotY` / `rotZ`, exact box, sphere, capsule, plane. Union is `min`, subtraction is `max(a, −b)` | Sphere-trace steps stay inside the conservative bound | Smooth-min on a subtracted cavity can overestimate distance. Spatial warps were not used. |
| Vault yaw | Canonical phase is a full turn, 15° per detent. The chamber’s rigid yaw is `0.40·sin(phase)` | The section keeps cutting a hall at every detent | A full-turn yaw of the cavity turned the opening into a pinhole or a blank face. |
| Section depth | Ratios 1/2, 2/3, 4/5 stored as integer pairs. `z = 12·(d−2n)/(25·d)` WU | All three cuts still open the chamber. 1/2 → 0, 2/3 → −0.16, 4/5 → −0.288 | Mapping the ratio across the full block depth put the deepest cut behind the apse, so the section read as a solid face. |
| Queue | One seating action, plus at most two waiting. A third is refused out loud | “Queue full.” State unchanged | A silent drop, and a separate busy-gate, were the alternatives. One policy is implemented. |
| Time | Integer tick at 120 Hz. Phase ease is 50 ticks, quartic. Section ease is 72 ticks, smoothstep | Seek sets the tick. It does not rerun a solver | Accumulated float angles, `Date.now` inside the hash, and a spring integrator. |
| Sound | Not added | The page is silent | Opt-in synthesis was deferred. It is not required for the architecture or the puzzle. |
| Dependencies | No new runtime packages | `npm run build` stayed on the existing toolchain | A Three.js import was not needed for one fullscreen triangle. |

## Parameters

| Name | Unit | Domain | Equation |
|---|---|---|---|
| Detent k | 1 | 0…23 | θ = 2πk/24. One step is ±π/12, signed, wrap mod 24. |
| Phase ease | 1 | u ∈ [0,1] over 50 ticks | E(u) = 1−(1−clamp(u,0,1))⁴ |
| Section ratio | 1 | (1,2), (2,3), (4,5) | z = 12·(d−2n)/(25·d) WU |
| Section ease | 1 | 72 ticks | smoothstep |
| Light azimuth | degree | −60…60, step 1 | elevation fixed at 35°. L = (cos e sin a, sin e, cos e cos a), then normalized |
| Fog | WU⁻¹ | 0 or 0.012 | T(d) = exp(−σ·clamp(d,0,40)) |
| Idle | WU | 0, or ≤ 0.004 in free mode with motion on | 0.004·sin(2π·0.05·t), t = tick/120 s. Puzzle and reduced motion force 0 |
| Bridge | 1 | 0…1 | Quartic over 72 ticks after a settled puzzle alignment. Otherwise 0 |
| Inspect camera | degree | yaw −12…12, pitch −8…8 | Added to the fixed orbit. Puzzle mode ignores the input |
| March | WU, steps | 64 primary, 16 shadow, 4 AO, 40 WU | Fragment clamps match `SHADER_CLAMPS` in `js/constants.js` |
| Drawing buffer | px | 1280×720 | CSS scales the element. The buffer is not tied to device pixel ratio |

## Fixture results

Logic suite `node experiments/glsl3/inversion-monolith/tests/run.mjs`, 2026-11-09, pass.

| Check | Result |
|---|---|
| SHA-256("abc") | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| Replay | 100/100 seeded traces reproduced the same canonical hash sequence. 100 distinct final hashes |
| Invalid and extreme inputs | 10,000. 7,626 rejected with state unchanged. 1,447 finite out-of-range values clamped into domain. 927 already on the clamp and left state unchanged. Domain breaks: 0 |
| Endpoint uniforms | 1,296 settled combinations, all inside the declared ranges |
| Puzzle | Hint reduced the remaining distance by 1 on every non-goal pair of the 72×72 grid. Greedy hints solved all 72 targets. 200 seeds had a start distinct from the target and solved |
| Settled seam | Target error 0. Closest other configuration: **8.272 px** at 1280×720. Phase tweens produced 0 intrusions inside a 2 px threshold of a third configuration |
| Shader | `#version 300 es` in both stages. Clamp strings present. SHA-256 of the two shader sources: `c521842ef05e9674c713c179c4fd79511774fd812d012ce96860221d84dcf52f` |
| JS sources hashed by the suite | `74ddff05b8f73350cc36bbadecb41fe5e0ed0b3ebb3bba61576e0f4e1c686c02` |

Browser session, same day, headless Chrome 156.0.8078.47.

| Check | Result |
|---|---|
| Context | WebGL2 created. Renderer string: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. This is software rendering |
| Compile and first image | Center pixel of the initial frame read back as `[64, 58, 50, 255]`. Corner pixel `[42, 41, 39, 255]`. They differ |
| Pointer | Click on Phase + moved k from 0 to 1. Notice: `Detent 01. Phase +15°.` |
| Keyboard | ArrowRight then moved k to 2 with `Queue 1.` |
| Context loss | `WEBGL_lose_context` lose/restore, 5 times, while paused. Canonical hash unchanged |
| Narrow layout | 320×568 CSS viewport still shows the monolith above the controls (`captures/layout-320.png`). The drawing buffer stayed 1280×720. This is not a phone GPU measurement |

## Performance

Machine: this cloud VM. CPU string reports `Intel(R) Xeon(R) Processor` under a hypervisor. `/dev/dri` was empty. No discrete GPU was available. Chrome headless, SwiftShader, one tab, drawing buffer 1280×720.

Presented frame interval from `requestAnimationFrame`, scene paused, 10 s warmup, then three 60 s runs. Nearest-rank quantiles. Intervals landed on roughly 300 ms and 600 ms buckets.

| Run | n | p50 ms | p95 ms | p99 ms | max ms | fraction > 25 ms |
|---|---|---|---|---|---|---|
| 1 | 199 | 300 | 600 | 883.3 | 883.4 | 0.779 |
| 2 | 201 | 300 | 583.4 | 633.3 | 866.6 | 0.801 |
| 3 | 201 | 300 | 583.3 | 600 | 883.3 | 0.861 |

`gl.drawArrays` and `gl.finish()` both returned in under 0.3 ms (submit only; finish did not wait). Forcing the frame with `readPixels` of the center pixel, 6 draws: p50 **293 ms**, p95 **795.2 ms**, sample pixel `[64, 58, 50, 255]`.

`EXT_disjoint_timer_query_webgl2` is present. Per-frame GPU timestamps were not collected, so a separate GPU-elapsed number is unmeasured.

The p95 < 20 ms presented-frame gate is **not passed**. The renderer is software, which the brief says is not a pass for that gate. These numbers are not a 60 fps claim.

## Captures

- `captures/initial.png` — detent 0, section 1/2, tall nave
- `captures/mid.png` — one detent into the seat, tick 8
- `captures/hybrid.png` — detent 4, section 2/3, nave and crossing together
- `captures/aligned.png` — puzzle seed 1 solved: detent 16, section 4/5, apse, status Aligned
- `captures/morph.gif` — nine real frames from detent 0 through 8
- `captures/layout-320.png` — narrow CSS viewport

## Perspectives, not reviewers

- Engineering: the march is capped and the page rebuilds from CPU state. The cost on SwiftShader is the number above, not a guess.
- Mathematics: hashes, the 72-state seam gap, and the 10,000-input run are the checks. A 15° step is not claimed to be a large visual move; the closest decoy is 8.3 px.
- Interaction: phase, section, undo, queue refusal, and the fixed puzzle camera are wired to the same reducer the tests call. No visitor timing study was run.
- Visual: the mass, the cut, and the three hall shapes are in the captures. The cut face is one plane, so its lighting is even. That is a real limit of this lighting model.
- Creative: the rejected reference was circular gears. This is a cut stone. Whether that is the right sculpture is Jennipher’s call.
- Epistemic: Jamie Wong’s article is the source for conservative sphere tracing, rigid transforms, and min-scale bounds. It is not a claim that this scene matches his demos, and it is not a performance result.

## Known limits

- Software rendering on this VM. A GPU frame-time pass was not measured because no GPU was present.
- `gl.finish` did not represent the raster cost. The readPixels series is the one that waited for a pixel.
- Headless `requestAnimationFrame` intervals are coarse. They are reported as observed.
- Cross-device pixels are not promised.
- No participant tried the puzzle. The hint and the 8.3 px gap are necessary checks, not a usability study.
- Audio was not built.
- The amber joint is a thin inlay on the cut face. At some detents it leans. It is not a second light source.
- Reduced motion and the static SVG fallback were implemented and the reduced path is in the logic suite. A forced “WebGL2 missing” browser was not one of the captured sessions; the fallback is what the page shows when `getContext('webgl2')` returns null.

## Build

`npm run build` and `npm run build:all` both completed on 2026-11-09. Token audit passed (49 tokens, 0 drift), `tsc -b` passed, and Vite wrote `dist/experiments/glsl3/inversion-monolith/`. Storybook’s build finished as well. The Vercel rewrite excludes `/experiments` from the app catch-all and maps the study URL onto its `index.html`.
