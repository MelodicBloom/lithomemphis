import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_SEED,
  PHENOMENA,
  SEGMENTS,
  clamp,
  clamp01,
  formatProgress,
  gloss,
  mulberry32,
  nextProgress,
  phenomenonAt,
  plateSample,
  quantize,
  snapshotProgress,
  specksFor,
} from './model.ts'

test('clamp and quantize send non-finite and out-of-range progress to the plate', () => {
  assert.equal(clamp(5, 0, 1), 1)
  assert.equal(clamp(-2, 0, 1), 0)
  assert.equal(clamp(Number.NaN, 0, 1), 0)
  assert.equal(clamp(Number.POSITIVE_INFINITY, 0, 1), 0)
  assert.equal(clamp01(1.2), 1)
  assert.equal(clamp01(-0.1), 0)
  assert.equal(quantize(2), 1)
  assert.equal(quantize(-1), 0)
  assert.equal(quantize(Number.NaN), 0)
  assert.equal(formatProgress(0.63), '0.6300')
  assert.equal(formatProgress(Number.NaN), '0.0000')
})

test('mulberry32 and specks are stable for a seed', () => {
  const a = mulberry32(DEFAULT_SEED)
  const b = mulberry32(DEFAULT_SEED)
  assert.equal(a(), b())
  assert.equal(a(), b())
  assert.notEqual(mulberry32(1)(), mulberry32(2)())
  const specks = specksFor(DEFAULT_SEED)
  assert.deepEqual(specks, specksFor(DEFAULT_SEED))
  assert.notDeepEqual(specks, specksFor(DEFAULT_SEED + 1))
  assert.equal(specks.length, 7)
  for (const speck of specks) {
    assert.ok(speck.x >= 0 && speck.x <= 1)
    assert.ok(speck.y >= 0 && speck.y <= 1)
    assert.ok(speck.r > 0)
  }
})

test('phenomenon segments cover [0,1] and meet at the boundaries', () => {
  assert.deepEqual(SEGMENTS.map((seg) => seg.state), [...PHENOMENA])
  assert.equal(SEGMENTS[0]?.from, 0)
  assert.equal(SEGMENTS.at(-1)?.to, 1)
  for (let i = 1; i < SEGMENTS.length; i += 1) assert.equal(SEGMENTS[i]?.from, SEGMENTS[i - 1]?.to)
  assert.equal(phenomenonAt(0), 'idle')
  assert.equal(phenomenonAt(0.1599), 'idle')
  assert.equal(phenomenonAt(0.16), 'lensing')
  assert.equal(phenomenonAt(0.34), 'impressed')
  assert.equal(phenomenonAt(0.52), 'bleeding')
  assert.equal(phenomenonAt(0.74), 'drifting')
  assert.equal(phenomenonAt(1), 'drifting')
  assert.equal(phenomenonAt(-1), 'idle')
  assert.equal(phenomenonAt(4), 'drifting')
  assert.equal(phenomenonAt(Number.NaN), 'idle')
})

test('reduced mode keeps the phenomenon and snaps to its canonical still', () => {
  for (const t of [0, 0.2, 0.4, 0.52, 0.6, 0.9, 1]) {
    const full = plateSample(t, 'full', DEFAULT_SEED)
    const reduced = plateSample(t, 'reduced', DEFAULT_SEED)
    assert.equal(reduced.phenomenonState, full.phenomenonState)
    assert.equal(reduced.presentationMode, 'reduced')
    assert.equal(reduced.renderT, snapshotProgress(full.phenomenonState))
    assert.equal(full.renderT, quantize(t))
    assert.deepEqual(reduced.specks, full.specks)
  }
  const edge = plateSample(0.52, 'full', DEFAULT_SEED)
  const still = plateSample(0.52, 'reduced', DEFAULT_SEED)
  assert.equal(edge.phenomenonState, 'bleeding')
  assert.equal(still.phenomenonState, 'bleeding')
  assert.ok(edge.bleed < 0.2)
  assert.ok(still.bleed > edge.bleed + 0.5)
})

test('each phenomenon snapshot is a distinct print state', () => {
  const idle = plateSample(snapshotProgress('idle'), 'full', 1)
  const lensing = plateSample(snapshotProgress('lensing'), 'full', 1)
  const impressed = plateSample(snapshotProgress('impressed'), 'full', 1)
  const bleeding = plateSample(snapshotProgress('bleeding'), 'full', 1)
  const drifting = plateSample(snapshotProgress('drifting'), 'full', 1)
  assert.equal(idle.halo, 0)
  assert.equal(idle.impression, 0)
  assert.equal(idle.bleed, 0)
  assert.equal(idle.misreg, 0)
  assert.equal(lensing.halo, 1)
  assert.equal(lensing.impression, 0)
  assert.equal(lensing.bleed, 0)
  assert.equal(impressed.impression, 1)
  assert.equal(impressed.bleed, 0)
  assert.equal(impressed.misreg, 0)
  assert.ok(bleeding.bleed > 0.8)
  assert.equal(bleeding.misreg, 0)
  assert.equal(drifting.bleed, 1)
  assert.ok(drifting.misreg > 0.5)
  assert.equal(drifting.impression, 0)
  const lines = new Set(PHENOMENA.map((state) => gloss(state)))
  assert.equal(lines.size, PHENOMENA.length)
})

test('live dwell is monotonic and press does not move backward', () => {
  assert.equal(nextProgress(0, 'press'), snapshotProgress('impressed'))
  assert.equal(nextProgress(0.9, 'press'), quantize(0.9))
  assert.equal(nextProgress(0.7, 'release'), quantize(0.7))
  assert.equal(nextProgress(0.7, 'reset'), 0)
  let t = 0
  for (let i = 0; i < 40; i += 1) {
    const next = nextProgress(t, 'dwell')
    assert.ok(next >= t)
    t = next
  }
  assert.equal(t, snapshotProgress('bleeding'))
  assert.equal(nextProgress(t, 'dwell'), t)
  assert.equal(phenomenonAt(nextProgress(snapshotProgress('lensing'), 'press')), 'impressed')
})
