# Study A — The Inversion Monolith

A standalone WebGL2 / GLSL ES 3.00 study. One eroded stone monolith is sectioned by a moving cut. Inside it, a carved hall changes continuously between a nave, a crossing, and an apse. The technique is a bounded signed-distance raymarch: rigid rotations, exact boxes and capsules, and a conservative union. There is no domain warp.

This is not a gear, a dial, or a clock face. The rejected reference for that direction is the circular brass mechanism the study was asked not to repeat.

## Open it

From the site root:

`/experiments/glsl3/inversion-monolith/`

The folder is the source. `public/experiments` is a symlink so Vite copies it into the build, and `vercel.json` keeps `/experiments` out of the app’s catch-all rewrite to `index.html`.

```bash
npm run dev
# http://127.0.0.1:5173/experiments/glsl3/inversion-monolith/
```

A static file server on the repo root works the same way. WebGL2 is required for the raymarch. If it is missing, or the context is lost, the page keeps the same CPU state and shows a labeled static section instead of pretending the shader is still running.

## Controls

| Control | Domain | What changes |
|---|---|---|
| Phase − / + | integer detent k ∈ {0…23}, ±1, wraps mod 24, 15° per step | The hall’s blend and the amber joint move one detent. Signed delta is ±1, not a shortest-path guess. |
| Section 1/2, 2/3, 4/5 | integer ratio pair, never a stored float | The cut plane moves. `z = 12·(d−2n)/(25·d)` WU. |
| Light | azimuth −60°…60°, step 1°, elevation fixed at 35° | The highlight travels. It does not change the puzzle. |
| Fog | off, or σ = 0.012 WU⁻¹ | `T = exp(−σ·clamp(d,0,40))`. Off is σ = 0. |
| Undo / redo | snapshots, history cap 128 | Restores the saved state, including the clock and any seating plan. Oldest entry is announced when it is dropped. |
| Reset | active preset | Returns sculpture, clock, and pause to that preset. Keeps reduced-motion and page-hidden. |
| Presets | Mass, Vault, Apse, Puzzle seed | Replaces state and clears history. |
| Pause / seek | integer tick at 120 Hz, `t = n/120` s | Pause holds the clock. Seek sets the tick exactly and does not replay intermediate frames. |
| Free / Puzzle | camera yaw ±12°, pitch ±8° only in free | Puzzle camera is fixed. Dragging it says so and changes nothing. |
| Reduced motion | on / off, also follows `prefers-reduced-motion` | No tween, no idle drift. The final detent is immediate. |

Phase seats in 50 ticks (~416.7 ms) with `E(u) = 1−(1−u)⁴`. A section change seats in 72 ticks (600 ms) with smoothstep. At most two detents wait behind the one that is seating. A further click is refused with “Queue full.” Reset, undo, and a preset drop the queue.

Puzzle goal is exact `(k, cut) = (k*, cut*)` from the seed. Light, fog, and the bridge do not count. The hint names the next control and direction. It does not reveal the seed or play the move. All 72 targets are solvable, and a settled decoy stays at least the measured pixel gap away from the target joint (see `RECEIPT.md`).

## Determinism

Canonical state is integers, ratio indices, and an explicit seating plan `{from, to, startTick, durationTicks, signedDelta}`. Uniforms are a pure function of that state plus the drawing-buffer size. The live clock adds whole ticks from frame time. Seek and the tests set the tick directly. Hidden page and pause both hold the clock.

```bash
node experiments/glsl3/inversion-monolith/tests/run.mjs
```

Browser checks (shader compile, pixels, real click and key, context loss) live in `tests/capture.mjs`. Frame timing is `tests/bench.mjs`. Both expect the page to be served at the path above.

## Shaders

`shaders/monolith.vert` and `shaders/monolith.frag` are the GLSL ES 3.00 sources (`#version 300 es`). The march is capped at 64 steps, the shadow march at 16, the ambient-occlusion taps at 4, and the ray length at 40 WU. The fragment shader clamps the same ranges the CPU already enforces.
