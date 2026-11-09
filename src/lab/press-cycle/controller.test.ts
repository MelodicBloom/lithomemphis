import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPressCycleController, type SensorSource } from './controller.ts'
import { AUTHORED_CYCLE_MS, snapshotProgress } from './model.ts'

function manualClock() {
  let now = 0
  let nextId = 1
  const pending = new Map<number, (t: number) => void>()
  return {
    now: () => now,
    requestFrame(cb: (t: number) => void) {
      const id = nextId
      nextId += 1
      pending.set(id, cb)
      return id
    },
    cancelFrame(id: number) {
      pending.delete(id)
    },
    pendingCount: () => pending.size,
    latest() {
      const id = Math.max(...pending.keys())
      const cb = pending.get(id)
      if (!cb) throw new Error('no frame scheduled')
      return cb
    },
    fireNext() {
      const id = Math.min(...pending.keys())
      const cb = pending.get(id)
      if (!cb) throw new Error('no frame scheduled')
      pending.delete(id)
      now += 16
      cb(now)
    },
    advance(ms: number) {
      now += ms
    },
  }
}

function drive(clock: ReturnType<typeof manualClock>, playing: () => boolean) {
  let frames = 0
  while (playing()) {
    clock.fireNext()
    frames += 1
    assert.ok(frames < 400, 'playback did not settle')
  }
  return frames
}

test('paused and disposed controllers schedule no frames', () => {
  const clock = manualClock()
  const cycle = createPressCycleController({ clock, progress: 0.2 })
  assert.equal(clock.pendingCount(), 0)
  cycle.setProgress(0.4)
  assert.equal(cycle.getProgress(), 0.4)
  assert.equal(cycle.isPlaying(), false)
  assert.equal(clock.pendingCount(), 0)
  cycle.setProgress(Number.NaN)
  assert.equal(cycle.getProgress(), 0)
  cycle.setProgress(3)
  assert.equal(cycle.getProgress(), 1)
  cycle.dispose()
  cycle.setProgress(0.2)
  cycle.replay()
  cycle.press()
  assert.equal(cycle.isDisposed(), true)
  assert.equal(cycle.getProgress(), 1)
  assert.equal(clock.pendingCount(), 0)
  cycle.dispose()
  assert.equal(cycle.isDisposed(), true)
})

test('replay reaches 1 in authored-cycle steps and pause freezes progress', () => {
  const clock = manualClock()
  const cycle = createPressCycleController({ clock, progress: 0.3, presentationMode: 'full' })
  cycle.replay()
  assert.equal(cycle.getProgress(), 0)
  assert.equal(cycle.isPlaying(), true)
  assert.equal(clock.pendingCount(), 1)
  const frames = drive(clock, () => cycle.isPlaying())
  assert.equal(frames, AUTHORED_CYCLE_MS / 16)
  assert.equal(cycle.getProgress(), 1)
  assert.equal(clock.pendingCount(), 0)

  const second = manualClock()
  const other = createPressCycleController({ clock: second, presentationMode: 'full' })
  other.replay()
  assert.equal(drive(second, () => other.isPlaying()), frames)

  const heldClock = manualClock()
  const held = createPressCycleController({ clock: heldClock, progress: 0, presentationMode: 'full' })
  held.replay()
  heldClock.fireNext()
  const t = held.getProgress()
  assert.ok(t > 0 && t < 1)
  held.pause()
  assert.equal(held.isPlaying(), false)
  assert.equal(held.getSnapshot().playing, false)
  assert.equal(heldClock.pendingCount(), 0)
  heldClock.advance(800)
  assert.equal(held.getProgress(), t)
})

test('seek cancels playback and reduced replay does not start a clock', () => {
  const clock = manualClock()
  const cycle = createPressCycleController({ clock, presentationMode: 'full' })
  cycle.replay()
  cycle.setProgress(0.25)
  assert.equal(cycle.isPlaying(), false)
  assert.equal(cycle.getProgress(), 0.25)
  assert.equal(clock.pendingCount(), 0)
  assert.equal(cycle.getSnapshot().phenomenonState, 'lensing')

  cycle.replay()
  clock.fireNext()
  const mid = cycle.getProgress()
  cycle.setPresentationMode('reduced')
  assert.equal(cycle.isPlaying(), false)
  assert.equal(cycle.getProgress(), mid)
  assert.equal(cycle.getSnapshot().presentationMode, 'reduced')
  assert.equal(cycle.getSnapshot().renderT, snapshotProgress(cycle.getSnapshot().phenomenonState))
  assert.equal(clock.pendingCount(), 0)

  const reduced = createPressCycleController({ clock, progress: 0.8, presentationMode: 'reduced' })
  reduced.replay()
  assert.equal(reduced.getProgress(), 0)
  assert.equal(reduced.isPlaying(), false)
  assert.equal(reduced.getSnapshot().phenomenonState, 'idle')
  assert.equal(clock.pendingCount(), 0)
})

test('dispose drops the listener and ignores a late frame', () => {
  const clock = manualClock()
  const cycle = createPressCycleController({ clock, progress: 0 })
  const seen: number[] = []
  const unsub = cycle.subscribe((snap) => seen.push(snap.t))
  assert.deepEqual(seen, [0])
  cycle.setProgress(0.5)
  unsub()
  cycle.setProgress(0.6)
  assert.deepEqual(seen, [0, 0.5])
  cycle.replay()
  const late = clock.latest()
  cycle.dispose()
  assert.equal(clock.pendingCount(), 0)
  late(500)
  assert.equal(seen.length, 2)
  assert.equal(cycle.getProgress(), 0)
  assert.equal(cycle.isPlaying(), false)
})

test('tilt is enhancement-only and dispose detaches the sensor once', () => {
  let listens = 0
  let unsubs = 0
  const sensor: SensorSource = {
    listen() {
      listens += 1
      return () => {
        unsubs += 1
      }
    },
  }
  const off = createPressCycleController({ sensors: 'off', sensor, clock: manualClock() })
  off.setTilt(8)
  assert.equal(off.getTilt(), 0)
  assert.equal(listens, 0)
  const on = createPressCycleController({ sensors: 'enhancement', sensor, clock: manualClock() })
  assert.equal(listens, 1)
  on.setTilt(40)
  assert.equal(on.getTilt(), 12)
  on.setTilt(-40)
  assert.equal(on.getTilt(), -12)
  on.dispose()
  on.dispose()
  assert.equal(unsubs, 1)
  on.setTilt(3)
  assert.equal(on.getTilt(), -12)
})
