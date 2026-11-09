/**
 * Experimental plate model for litho.print.stamp-bleed-relief-v0.
 * Lengths and spring-like amounts are illustrative. Nothing here is a calibrated press.
 * Orthogonal axes: phenomenonState × presentationMode. Classification stays DEFER.
 */

export const PROGRESS_SEMANTICS = 'plate-state-scrub' as const
export const DEFAULT_SEED = 271828
export const AUTHORED_CYCLE_MS = 2400
export const KEY_STEP = 0.02
export const DWELL_STEP = 0.04
export const DWELL_INTERVAL_MS = 80
export const TILT_LIMIT_DEG = 12

export const PHENOMENA = ['idle', 'lensing', 'impressed', 'bleeding', 'drifting'] as const
export type PhenomenonState = (typeof PHENOMENA)[number]
export type PresentationMode = 'full' | 'reduced'
export type PressCycleModeProp = PresentationMode | 'auto'
export type Gesture = 'press' | 'dwell' | 'release' | 'reset'

type Span = { from: number; to: number }

const SEGMENT_BY_STATE: Record<PhenomenonState, Span> = {
  idle: { from: 0, to: 0.16 },
  lensing: { from: 0.16, to: 0.34 },
  impressed: { from: 0.34, to: 0.52 },
  bleeding: { from: 0.52, to: 0.74 },
  drifting: { from: 0.74, to: 1 },
}

export const SEGMENTS = PHENOMENA.map((state) => ({ state, ...SEGMENT_BY_STATE[state] }))

export type Speck = { x: number; y: number; r: number }

export type PlateSample = {
  t: number
  renderT: number
  phenomenonState: PhenomenonState
  presentationMode: PresentationMode
  impression: number
  bleed: number
  misreg: number
  halo: number
  hatch: number
  specks: Speck[]
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function clamp01(t: number): number {
  return clamp(t, 0, 1)
}

function q4(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 10000) / 10000
}

/** Plate progress quantized to 1e-4 so seeks are deterministic. */
export function quantize(t: number): number {
  return q4(clamp01(t))
}

export function formatProgress(t: number): string {
  return quantize(t).toFixed(4)
}

/** mulberry32. Same seed → same sequence. Used only for stable paper specks. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function specksFor(seed: number, count = 7): Speck[] {
  const rand = mulberry32(seed)
  const specks: Speck[] = []
  for (let i = 0; i < count; i += 1) {
    specks.push({ x: q4(rand()), y: q4(rand()), r: q4(0.8 + rand() * 1.6) })
  }
  return specks
}

export function phenomenonAt(t: number): PhenomenonState {
  const x = clamp01(t)
  for (const seg of SEGMENTS) {
    if (x < seg.to || seg.to === 1) return seg.state
  }
  return 'drifting'
}

export function snapshotProgress(state: PhenomenonState): number {
  const seg = SEGMENT_BY_STATE[state]
  return quantize((seg.from + seg.to) / 2)
}

export function gloss(state: PhenomenonState): string {
  switch (state) {
    case 'idle':
      return 'Plate at rest. Dry ink film.'
    case 'lensing':
      return 'Press halo before contact. Not a thin film.'
    case 'impressed':
      return 'Plate bite. Debossed stamp.'
    case 'bleeding':
      return 'Capillary bleed and ink lift.'
    case 'drifting':
      return 'Riso misregistration. Two spot inks.'
    default: {
      const unknown: never = state
      return unknown
    }
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = clamp01((x - edge0) / (edge1 - edge0))
  return u * u * (3 - 2 * u)
}

function peak(rise0: number, rise1: number, fall0: number, fall1: number, x: number): number {
  return smoothstep(rise0, rise1, x) * (1 - smoothstep(fall0, fall1, x))
}

/**
 * Authored plate cycle. `full` interpolates `t`. `reduced` keeps the phenomenon
 * and renders the canonical still for that state (one snapshot per phenomenon).
 * Scrubbing `t` may move backward: that is the plate cycle, not a live un-bleed.
 */
export function plateSample(t: number, presentationMode: PresentationMode, seed: number): PlateSample {
  const clamped = quantize(t)
  const phenomenonState = phenomenonAt(clamped)
  const renderT = presentationMode === 'reduced' ? snapshotProgress(phenomenonState) : clamped
  const impression = q4(peak(0.32, 0.42, 0.66, 0.82, renderT))
  return {
    t: clamped,
    renderT,
    phenomenonState,
    presentationMode,
    impression,
    bleed: q4(smoothstep(0.5, 0.66, renderT)),
    misreg: q4(smoothstep(0.74, 0.92, renderT)),
    halo: q4(peak(0.1, 0.22, 0.32, 0.42, renderT)),
    hatch: q4(clamp(impression * 0.85, 0, 1)),
    specks: specksFor(seed),
  }
}

/**
 * Live gesture. `dwell` is monotonic up to the bleeding snapshot (ink does not un-bleed
 * mid-hold). `press` jumps forward to the bite and never backward. Reverse travel is
 * `reset` or a plate-state scrub via `quantize` / the controller `setProgress`.
 */
export function nextProgress(t: number, gesture: Gesture): number {
  const cur = quantize(t)
  switch (gesture) {
    case 'press': {
      const bite = snapshotProgress('impressed')
      return cur >= bite ? cur : bite
    }
    case 'dwell': {
      const cap = snapshotProgress('bleeding')
      if (cur >= cap) return cur
      return quantize(Math.min(cap, cur + DWELL_STEP))
    }
    case 'release':
      return cur
    case 'reset':
      return 0
    default: {
      const unknown: never = gesture
      return unknown
    }
  }
}
