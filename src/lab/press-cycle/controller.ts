/**
 * One owner for plate progress. Schedules a frame only while playing.
 * Seek, pause, and dispose cancel that frame. No global loop.
 */
import {
  AUTHORED_CYCLE_MS,
  DEFAULT_SEED,
  TILT_LIMIT_DEG,
  clamp,
  clamp01,
  nextProgress,
  plateSample,
  quantize,
  type PhenomenonState,
  type PlateSample,
  type PresentationMode,
} from './model.ts'

export type Clock = {
  now: () => number
  requestFrame: (cb: (now: number) => void) => number
  cancelFrame: (id: number) => void
}

export type SensorSource = {
  listen: (fn: (tiltDeg: number) => void) => () => void
}

export type PressCycleSnapshot = PlateSample & {
  playing: boolean
  tilt: number
  seed: number
}

export type PressCycleDetail = {
  t: number
  renderT: number
  phenomenonState: PhenomenonState
  presentationMode: PresentationMode
  playing: boolean
  seed: number
}

export type PressCycleOptions = {
  seed?: number
  progress?: number
  presentationMode?: PresentationMode
  clock?: Clock
  sensors?: 'off' | 'enhancement'
  sensor?: SensorSource
}

export type PressCycleController = {
  setProgress: (t: number) => void
  pause: () => void
  replay: () => void
  dispose: () => void
  getProgress: () => number
  getSnapshot: () => PressCycleSnapshot
  isPlaying: () => boolean
  isDisposed: () => boolean
  setPresentationMode: (mode: PresentationMode) => void
  setSeed: (seed: number) => void
  press: () => void
  dwell: () => void
  reset: () => void
  setTilt: (deg: number) => void
  getTilt: () => number
  bindSensor: (source: SensorSource | undefined) => void
  subscribe: (fn: (snap: PressCycleSnapshot) => void) => () => void
}

export function browserClock(): Clock {
  return {
    now: () => performance.now(),
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (id) => cancelAnimationFrame(id),
  }
}

export function browserTiltSensor(): SensorSource {
  return {
    listen(fn) {
      if (typeof window === 'undefined') return () => {}
      const handler = (event: DeviceOrientationEvent) => {
        if (typeof event.gamma !== 'number' || Number.isNaN(event.gamma)) return
        fn(event.gamma)
      }
      window.addEventListener('deviceorientation', handler)
      return () => window.removeEventListener('deviceorientation', handler)
    },
  }
}

export function toDetail(snap: PressCycleSnapshot): PressCycleDetail {
  return {
    t: snap.t,
    renderT: snap.renderT,
    phenomenonState: snap.phenomenonState,
    presentationMode: snap.presentationMode,
    playing: snap.playing,
    seed: snap.seed,
  }
}

export function createPressCycleController(options: PressCycleOptions = {}): PressCycleController {
  const clock = options.clock ?? browserClock()
  const sensors = options.sensors ?? 'off'
  let progress = quantize(options.progress ?? 0)
  let mode: PresentationMode = options.presentationMode ?? 'full'
  let seed = options.seed === undefined || !Number.isFinite(options.seed) ? DEFAULT_SEED : options.seed >>> 0
  let playing = false
  let disposed = false
  let tilt = 0
  let frame: number | null = null
  let sensorUnsub: (() => void) | undefined
  const listeners = new Set<(snap: PressCycleSnapshot) => void>()

  function snapshot(): PressCycleSnapshot {
    return { ...plateSample(progress, mode, seed), playing: playing && !disposed, tilt, seed }
  }

  function emit() {
    if (disposed) return
    const snap = snapshot()
    for (const fn of [...listeners]) fn(snap)
  }

  function cancelFrame() {
    if (frame !== null) {
      clock.cancelFrame(frame)
      frame = null
    }
  }

  function pause() {
    if (disposed) return
    const wasPlaying = playing
    playing = false
    cancelFrame()
    if (wasPlaying) emit()
  }

  function setProgress(t: number) {
    if (disposed) return
    pause()
    progress = quantize(t)
    emit()
  }

  function playFrom(start: number) {
    if (disposed || mode === 'reduced') return
    playing = true
    const origin = clock.now()
    const span = 1 - start
    emit()
    const step = (now: number) => {
      if (disposed || !playing) return
      const u = clamp01((now - origin) / AUTHORED_CYCLE_MS)
      progress = quantize(start + span * u)
      if (u >= 1 || progress >= 1) {
        progress = 1
        playing = false
        frame = null
        emit()
        return
      }
      emit()
      frame = clock.requestFrame(step)
    }
    frame = clock.requestFrame(step)
  }

  function replay() {
    if (disposed) return
    pause()
    progress = 0
    if (mode === 'reduced') {
      emit()
      return
    }
    playFrom(0)
  }

  function setPresentationMode(next: PresentationMode) {
    if (disposed) return
    if (next === mode) return
    mode = next
    if (next === 'reduced') pause()
    emit()
  }

  function setSeed(next: number) {
    if (disposed || !Number.isFinite(next)) return
    seed = next >>> 0
    emit()
  }

  function setTilt(deg: number) {
    if (disposed || sensors !== 'enhancement' || !Number.isFinite(deg)) return
    const next = clamp(deg, -TILT_LIMIT_DEG, TILT_LIMIT_DEG)
    if (next === tilt) return
    tilt = next
    emit()
  }

  function subscribe(fn: (snap: PressCycleSnapshot) => void) {
    if (disposed) return () => {}
    listeners.add(fn)
    fn(snapshot())
    return () => listeners.delete(fn)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    playing = false
    cancelFrame()
    sensorUnsub?.()
    sensorUnsub = undefined
    listeners.clear()
  }

  function bindSensor(source: SensorSource | undefined) {
    sensorUnsub?.()
    sensorUnsub = undefined
    if (disposed || sensors !== 'enhancement' || !source) return
    sensorUnsub = source.listen((deg) => setTilt(deg))
  }

  if (sensors === 'enhancement' && options.sensor) bindSensor(options.sensor)

  return {
    setProgress,
    pause,
    replay,
    dispose,
    getProgress: () => progress,
    getSnapshot: snapshot,
    isPlaying: () => playing && !disposed,
    isDisposed: () => disposed,
    setPresentationMode,
    setSeed,
    press: () => setProgress(nextProgress(progress, 'press')),
    dwell: () => setProgress(nextProgress(progress, 'dwell')),
    reset: () => setProgress(0),
    setTilt,
    getTilt: () => tilt,
    bindSensor,
    subscribe,
  }
}
