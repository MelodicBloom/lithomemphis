# Stamp → bleed → relief (experimental)

Lab specimen for a plate-state scrub. **Classification: DEFER.** Not runtime authority, not a `/portico` beat, not a calibrated press.

The orthogonal model (`phenomenonState` × `presentationMode`, progress semantics `plate-state-scrub`) follows draft Consumer Spec v1.3 on unmerged [PR #5](https://github.com/MelodicBloom/lithomemphis/pull/5) (`docs/w2-w3-scope` @ `540c3ecaee6c6c976526b652e1895e4f9ac68407`): `docs/VISUAL-LANGUAGE-CONSUMER.md` and `docs/consumables/stamp-bleed-relief-v0.md`. Those files are not on `main`. This page does not copy them and does not promote the consumable.

Prior art was not imported: `MelodicBloom/magical-risograph` and `MelodicBloom/aurora-collage-ui-system` (`StampSvg` / `InkBlot`). Ink is the existing `lm-ink-bleed` and `lm-stamp` filters plus flat spot color (ink, cherry, cornflower). There is no thin-film gradient.

Decision record: [../decisions/0001-press-cycle-motion-and-tests.md](../decisions/0001-press-cycle-motion-and-tests.md).

## Where it runs

- Route: `/lab/press-cycle` (also `/lab/press-cycle?t=0.52&mode=reduced`)
- Pick board: `/lab#press-cycle`
- Storybook: `Lab/Press cycle`

`t` in the query is the mount-only progress. The scrubber, keyboard, and pointer then own it. `mode=full|reduced` forces presentation. Omitting `mode` follows `prefers-reduced-motion` and `document.documentElement.dataset.motion = "safe"` via `motionSafe()`.

## Public React props

```tsx
import PressCycle from './src/lab/press-cycle/PressCycle'

<PressCycle
  seed={271828}
  initialProgress={0.52}
  presentationMode="reduced" // 'full' | 'reduced' | 'auto'
  autoplay={false}
  sensors="off" // 'enhancement' listens for deviceorientation; never required
  showControls
  onProgress={(detail) => {
    // { t, renderT, phenomenonState, presentationMode, playing, seed }
    console.log(detail.phenomenonState, detail.t)
  }}
  controllerRef={ref}
/>
```

`initialProgress` is applied when the controller mounts. Clamp: NaN and non-finite values become `0`; values outside `[0,1]` clamp. Remount with a `key` to apply a new initial progress.

`onProgress` also fires as a bubbling `CustomEvent` named `litho-press-cycle` on the root element, with the same `detail`.

## Controller

`createPressCycleController` in `src/lab/press-cycle/controller.ts`.

```ts
import { createPressCycleController } from './src/lab/press-cycle/controller.ts'

const cycle = createPressCycleController({
  seed: 271828,
  progress: 0,
  presentationMode: 'full',
  sensors: 'off',
})
const stop = cycle.subscribe((snap) => {
  // snap.t, snap.renderT, snap.phenomenonState, snap.playing
})
cycle.setProgress(0.63) // seek; cancels playback
cycle.replay()          // t = 0, then play to 1 over 2400ms; no-op clock when reduced
cycle.pause()           // keeps t, cancels the frame
cycle.press()           // forward-only jump to the impressed still
cycle.dwell()           // monotonic step, capped at the bleeding still
cycle.reset()
cycle.dispose()         // cancel the frame, detach the sensor, drop listeners
stop()
```

After `dispose()`, `setProgress`, `replay`, `press`, and `dwell` do nothing. `dispose()` is safe to call twice.

`browserClock()` and `browserTiltSensor()` are the DOM adapters. Tests pass a manual clock and a fake sensor. The React tree calls `dispose()` on unmount.

## Plate functions

`src/lab/press-cycle/model.ts`:

| Function | Role |
|---|---|
| `clamp(n, min, max)` / `clamp01(t)` | Finite range. Non-finite returns `min` / `0`. |
| `quantize(t)` / `formatProgress(t)` | Progress to 1e-4, displayed as four decimals. |
| `mulberry32(seed)` / `specksFor(seed)` | Stable paper specks. |
| `phenomenonAt(t)` | `idle \| lensing \| impressed \| bleeding \| drifting`. |
| `snapshotProgress(state)` | Canonical still for reduced mode. |
| `plateSample(t, mode, seed)` | Full interpolation, or the reduced still for the current phenomenon. |
| `gloss(state)` | Print sentence. Lensing is a press halo, not a thin film. |
| `nextProgress(t, gesture)` | `press` (forward only), `dwell` (monotonic, cap at bleeding), `release` (hold), `reset`. |

Segments: idle `[0, 0.16)`, lensing `[0.16, 0.34)`, impressed `[0.34, 0.52)`, bleeding `[0.52, 0.74)`, drifting `[0.74, 1]`.

Keyboard on the plate (when the plate itself is focused, not one of its buttons): ArrowLeft/Right ±0.02, Home, End, Enter = press, Space = replay. The slider is a separate seek. Pointer down presses; holding dwells until the bleeding still and then holds.

## Commands

```bash
npm run test:unit
npm run typecheck
npm run lint
npm run test:e2e   # production build, Storybook build, Playwright
```

Screenshot baselines live under `e2e/press-cycle.spec.ts-snapshots/`. CI sets Playwright `updateSnapshots: 'none'`. Do not refresh them in CI. A Storybook static build is an artifact, not a live site. The live page is `/lab/press-cycle` on whatever host serves the Vite app.
