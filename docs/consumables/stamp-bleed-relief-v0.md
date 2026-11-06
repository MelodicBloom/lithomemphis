# LITHOMEMPHIS Consumable Candidate Spec — Stamp → Bleed → Relief (v0)

> **Status:** **`candidate-spec-unverified-runtime`** · `classification: "DEFER"` · `approval: "draft"`  
> **Approved as first §6 target** on `2026-11-06` (America/New_York) under [Consumer Spec v1.3](../VISUAL-LANGUAGE-CONSUMER.md).  
> **Consumable id:** `litho.print.stamp-bleed-relief-v0` · **engine alias:** `pressCycle` · **onboarding beat:** `orient.print.stamp-bleed-relief`  
> **Receipt skeleton:** [stamp-bleed-relief-v0.receipt.json](stamp-bleed-relief-v0.receipt.json)

**No runtime component is claimed as built in this commit.** This is a spec and a receipt skeleton only. Promotion from `DEFER` to `ADAPT` requires all of the following: build the bounded `/lab` demo, capture golden stills and a motion proof of 3 s or less, fill every SHA-256 digest, pass `tokens:audit`, and pass human visual review (§8).

---

## 1. Intent

Teach one print phenomenon per beat: an ink **stamp** strikes the plate, the ink **bleeds** by capillary wicking, and the plate **relief** catches raking light. This is a native print-craft consumable composed from LithoMemphis primitives that already exist. It is not an imported optical or textile engine.

## 2. Option matrix & Preservative Synthesis ledger

| Option | Description | Decision | Rationale / friction preserved |
|---|---|---|---|
| **1 — Native print-craft consumable** | Compose over existing LithoMemphis primitives; borrow **Shader Grammar receipt discipline only** (typed params, clamps, SHA-256, anti-claims) | **Chosen** (owner, 2026-11-06) | Stays print-born; no imported `spec-only` formulas; runtime cost is bounded |
| **2 — Remap an upstream engine** | Remap SG thin-film, or the Living Cloth watercolor engine, as the Tier-1 fill | **Chosen against for Tier 1**; **preserved** for gated Tier-2 research | Thin-film is an interference-rainbow category error in neobrutalist print; Living Cloth equations (`watercolor_radius_px`, `A_t`, `D_c`, `B_c`, `Q`) are `spec-only` |
| **3 — Staged promotion** | `/lab` pick first → `/portico` encounter beat `orient.print.stamp-bleed-relief` | **Chosen** as the delivery path for Option 1 | The lab proves the receipt before any orientation beat teaches it |
| Peer prior art | `MelodicBloom/aurora-collage-ui-system` @ `41c89e336e72`: `StampSvg.tsx`, `InkBlot.tsx`, `WatercolorField.tsx`, `BleedMargin.tsx` | **Cite only — `DIVERGE`, not absorbed** (owner, 2026-11-06) | Recovery matrix row `Candidate, unconfirmed`; keeps authority independent |

Also chosen against: generic bounce spring as press release; gyro-required relief; unversioned shader paste; inheriting `calibrated` from a metaphor remap; treating unpublished Omni-Loom Issues `06`/`07` as proven print physics.

## 3. Substrate inventory (`current` in `MelodicBloom/lithomemphis` @ `4b2a7cc`)

| File | Primitive | Role in pressCycle |
|---|---|---|
| `src/components/Icon/index.tsx` | SVG filters `#lm-stamp`, `#lm-ink-bleed` | Stamp edge texture; capillary bleed halo |
| `src/lab/demos.tsx` | `RisoStage` | Misregistration Δx/Δy → `drifting` |
| `src/components/SpringPressable.tsx` (used in `src/lab/demos.tsx`) | `SpringPressable` | Impression travel / ink lift → `impressed` |
| `src/lab/demos.tsx` | `FilmStage` | Optional optics beat only (raking catch-light); never Tier-1 fill |
| `tokens/spring.json` | Spring presets | `spring_k`, `spring_zeta` defaults |
| `src/lib/spring.ts` | `motionSafe()` | Drives `presentationMode` |
| `src/styles/lab.css` | `.lm-stamped` / `lm-stamp-in` | Existing stamp-in keyframe; already disabled in safe mode |

Note: the Icon file is `src/components/Icon/index.tsx` (a directory module), not `Icon.tsx`.

## 4. Print-process parameter contract

Every parameter has `provenance: "illustrative"`. Seed: `271828`. `progressSemantics: "plate-state-scrub"`. Envelope: `calibration: "not-claimed"`.

| Parameter | Default | Min | Max | Unit | Provenance |
|---|---|---|---|---|---|
| `misregistration_dx_mm` | 0.35 | 0 | 1.2 | mm | illustrative |
| `misregistration_dy_mm` | 0.22 | 0 | 1.2 | mm | illustrative |
| `capillary_spread_mm` | 0.45 | 0 | 2.0 | mm | illustrative |
| `bite_depth_um` | 80 | 10 | 400 | um | illustrative |
| `stock_weight_gsm` | 250 | 80 | 400 | gsm | illustrative |
| `dwell_ms` | 180 | 40 | 1200 | ms | illustrative |
| `impression_travel_mm` | 1.6 | 0.2 | 4.0 | mm | illustrative |
| `spring_k` | 180 | 60 | 420 | dimensionless-illustrative | illustrative |
| `spring_zeta` | 0.85 | 0.4 | 1.4 | dimensionless-illustrative | illustrative |
| `hatch_density` | 0.42 | 0 | 1 | normalized | illustrative |
| `ink_opacity` | 0.88 | 0.2 | 1 | normalized | illustrative |

Values are clamped on input. These are art-direction sliders and make **no claim** about physical press calibration.

## 5. Orthogonal state machine (`phenomenonState` × `presentationMode`)

### 5.1 Print gloss (normative, Consumer Spec v1.3 §4.3)

| `phenomenonState` | Gloss |
|---|---|
| `idle` | Plate at rest; dry ink film |
| `lensing` | Pre-contact press-halo / raking catch-light anticipation (**not** thin-film) |
| `impressed` | Plate bite / deboss under impression travel |
| `bleeding` | Capillary wicking / halftone dot gain / ink lift on release |
| `drifting` | Riso misregistration drift / registration scrub |

### 5.2 Behavior table (5 × 2)

| `phenomenonState` | `presentationMode: full` | `presentationMode: reduced` (deterministic static print) |
|---|---|---|
| `idle` | Flat plate, no motion | Clean plate still |
| `lensing` | Soft halo eases in around stamp; optional tilt catch-light | Static halo outline at rest offset |
| `impressed` | Spring travel to `impression_travel_mm`, press shadow, `lm-stamp` edge | Debossed stamp at full travel + press shadow |
| `bleeding` | `lm-ink-bleed` grows monotonically to `capillary_spread_mm` over `dwell_ms` | Final bleed halo frozen |
| `drifting` | Riso layers offset within Δx/Δy clamps, bound to pan or scroll velocity | Two-layer print at default offsets |

Switching `presentationMode` **preserves** `phenomenonState`. The v1.2 peer `reduced` + `lastPhenomenonState` workaround is superseded.

### 5.3 Transitions

`idle → lensing` (hover / focus / tilt-enhancement) · `lensing → idle` (leave / blur) · `lensing → impressed` (tap / press / Enter / Space) · `impressed → bleeding` (long-press, dwell ≥ `dwell_ms`) · `bleeding → drifting` (pan / scroll velocity) · `drifting → idle` (release + settle, or explicit reset).

### 5.4 Gesture hysteresis & scrub

- Inside one live press gesture, bleed is **monotonic**. Ink does not un-bleed.
- Reverse travel happens only after the gesture ends plus an explicit reset, or via a **plate-state scrub**. That scrub maps `t ∈ [0, 1]` onto the authored cycle `idle → lensing → impressed → bleeding → drifting`.

## 6. Six-surface bindings & input contract

| Surface | Binding |
|---|---|
| Design (Figma/tokens) | Variants per `phenomenonState` × mode; parameters as token-refs (no new tokens) |
| Component (web) | hover → `lensing`; press → `impressed`; hold → `bleeding`; drag → `drifting` |
| Mobile touch | tap = stamp; long-press = bleed; pinch = `hatch_density`; pan = registration |
| Device motion | tilt = relief catch-light (**enhancement only**) |
| Scroll narrative | scroll → `t` plate-state scrub |
| Onboarding / Portico | Beat `orient.print.stamp-bleed-relief` (stage 2 only) |

Input contract: pointer `required` · touch `required` · keyboard `required` · screen reader `required` · gyro `enhancement` · scrub `enhancement`. Screen-reader label: "Print press cycle: stamp, bleed, relief".

## 7. Device LOD (4 tiers)

| Tier | LOD | Min touch target | Shader |
|---|---|---|---|
| `phone` | low | 44 px | off or 1 frame |
| `tablet` | medium | 44 px | optional |
| `desktop` | high | 32 px | optional optics beat |
| `projector` | high | 48 px | optional high-contrast print |

## 8. Bounded build & `DEFER → ADAPT` verification checklist

**Stage 1: `/lab`**

1. [ ] Build a bounded demo (e.g. `src/lab/demos/StampBleedRelief.tsx`) composed **only** from §3 primitives, with no new tokens.
2. [ ] Wire `phenomenonState` × `presentationMode` per §5, with `motionSafe()` driving the mode.
3. [ ] Clamp all §4 parameters; seed `271828`.
4. [ ] Capture 10 golden stills (5 states × 2 modes) and a motion proof of ≤ 3 s; fill SHA-256s in the receipt.
5. [ ] Fill the source SHA-256; confirm there is no unversioned shader.
6. [ ] `npm run build` passes (`tokens:audit` 0 drift).
7. [ ] Run the keyboard + screen-reader path and the reduced-mode parity check.
8. [ ] Check every `anti_patterns` entry on visual review (`rainbow-splatter-brand`, `motion-before-readability`, `unversioned-shader`, `category-error-thin-film-as-ink`).
9. [ ] Human visual review signs off → flip `classification` to `ADAPT` (lab scope).

**Stage 2: `/portico`**

10. [ ] With an ADAPT receipt, add the encounter beat `orient.print.stamp-bleed-relief` per [PORTICO.md](../PORTICO.md) orientation-over-instruction rules.
11. [ ] Run `/portico` visual acceptance again.

## 9. Provenance

- LithoMemphis primitives @ `4b2a7cc8910943dc749665e36ca8f086d337270d` (`current`)
- Shader Grammar receipt discipline @ `be11bde30962773999e2c37888e044970f5673d5` (discipline only; identity pin `blocked`)
- Omni-Loom `VNEXT_SCOPE` + `specimen-v0` @ `0bbd92798b3d24285dfa046cfaa020f458d6f362`; recovery-pack `CONSUMER-MATRIX.md` (unpublished, SHA-256 `e9a9051f…`)
- Living Cloth watercolor equations (illustrative, `spec-only`)
- Peer prior art: `aurora-collage-ui-system` @ `41c89e336e72` (not absorbed)
- Upstream reconciliation by Interaction & Visual SDK, 2026-11-06
