import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import Icon from '../../components/Icon'
import { motionSafe } from '../../lib/spring'
import {
  browserTiltSensor,
  createPressCycleController,
  toDetail,
  type PressCycleController,
  type PressCycleDetail,
  type PressCycleSnapshot,
} from './controller.ts'
import {
  DEFAULT_SEED,
  DWELL_INTERVAL_MS,
  KEY_STEP,
  formatProgress,
  gloss,
  type PresentationMode,
  type PressCycleModeProp,
} from './model.ts'
import './press-cycle.css'

type Props = {
  /** Stable speck seed. Default 271828. */
  seed?: number
  /** Mount-only plate progress in [0,1]. Out-of-range and NaN clamp to the plate. */
  initialProgress?: number
  /** `auto` follows prefers-reduced-motion and `motionSafe()` / `data-motion=safe`. */
  presentationMode?: PressCycleModeProp
  /** Ignored when the resolved mode is reduced. Starts playback once, on mount. */
  autoplay?: boolean
  /** Device tilt is enhancement-only. Default off. No permission prompt. */
  sensors?: 'off' | 'enhancement'
  showControls?: boolean
  compact?: boolean
  className?: string
  onProgress?: (detail: PressCycleDetail) => void
  /** Stable ref object. Assigned while mounted, cleared on dispose. */
  controllerRef?: { current: PressCycleController | null }
}

function useResolvedMode(prop: PressCycleModeProp): PresentationMode {
  const [autoMode, setAutoMode] = useState<PresentationMode>(() => (motionSafe() ? 'reduced' : 'full'))
  useEffect(() => {
    if (prop !== 'auto') return
    const apply = () => setAutoMode(motionSafe() ? 'reduced' : 'full')
    apply()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    media.addEventListener('change', apply)
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    return () => {
      media.removeEventListener('change', apply)
      observer.disconnect()
    }
  }, [prop])
  return prop === 'auto' ? autoMode : prop
}

export default function PressCycle({
  seed = DEFAULT_SEED,
  initialProgress = 0,
  presentationMode = 'auto',
  autoplay = false,
  sensors = 'off',
  showControls = true,
  compact = false,
  className = '',
  onProgress,
  controllerRef,
}: Props) {
  const mode = useResolvedMode(presentationMode)
  const glossId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const dwellTimer = useRef(0)
  const generation = useRef(0)
  const onProgressRef = useRef(onProgress)
  const [ctrl] = useState(() => createPressCycleController({
    seed,
    progress: Number.isFinite(initialProgress) ? initialProgress : 0,
    presentationMode: mode,
    sensors,
  }))
  const [snap, setSnap] = useState<PressCycleSnapshot>(() => ctrl.getSnapshot())

  useEffect(() => {
    onProgressRef.current = onProgress
  })

  function publish(next: PressCycleSnapshot = ctrl.getSnapshot()) {
    setSnap(next)
    const detail = toDetail(next)
    onProgressRef.current?.(detail)
    rootRef.current?.dispatchEvent(new CustomEvent('litho-press-cycle', { bubbles: true, detail }))
  }

  useEffect(() => {
    const current = ++generation.current
    ctrl.bindSensor(sensors === 'enhancement' ? browserTiltSensor() : undefined)
    const unsubscribe = ctrl.subscribe((next) => publish(next))
    if (controllerRef) controllerRef.current = ctrl
    if (autoplay && mode === 'full') ctrl.replay()
    return () => {
      const timer = dwellTimer.current
      window.clearInterval(timer)
      unsubscribe()
      ctrl.bindSensor(undefined)
      if (controllerRef) controllerRef.current = null
      // Strict Mode runs this cleanup and immediately re-subscribes. Dispose only if that did not happen.
      queueMicrotask(() => {
        if (generation.current === current) ctrl.dispose()
      })
    }
    // Controller identity is mount-stable. Remount (key) to change seed or the initial progress.
  }, [ctrl])

  useEffect(() => {
    ctrl.setPresentationMode(mode)
  }, [ctrl, mode])

  function stopDwell() {
    window.clearInterval(dwellTimer.current)
    dwellTimer.current = 0
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    stopDwell()
    ctrl.press()
    publish()
    dwellTimer.current = window.setInterval(() => {
      ctrl.dwell()
      publish()
    }, DWELL_INTERVAL_MS)
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key === 'ArrowRight') ctrl.setProgress(ctrl.getProgress() + KEY_STEP)
    else if (event.key === 'ArrowLeft') ctrl.setProgress(ctrl.getProgress() - KEY_STEP)
    else if (event.key === 'Home') ctrl.setProgress(0)
    else if (event.key === 'End') ctrl.setProgress(1)
    else if (event.key === ' ') ctrl.replay()
    else if (event.key === 'Enter') ctrl.press()
    else return
    event.preventDefault()
    publish()
  }

  const style = {
    '--pc-impression': snap.impression,
    '--pc-bleed': snap.bleed,
    '--pc-misreg': snap.misreg,
    '--pc-halo': snap.halo,
    '--pc-hatch': snap.hatch,
    '--pc-tilt': snap.tilt,
  } as CSSProperties
  const icon = compact ? 64 : 92

  return (
    <section
      ref={rootRef}
      className={`lm-press${compact ? ' lm-press--compact' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      role="group"
      tabIndex={0}
      aria-label="Print press cycle: stamp, bleed, relief"
      aria-describedby={glossId}
      aria-keyshortcuts="ArrowLeft ArrowRight Home End Enter Space"
      data-testid="press-cycle"
      data-phenomenon={snap.phenomenonState}
      data-mode={snap.presentationMode}
      data-t={formatProgress(snap.t)}
      data-render-t={formatProgress(snap.renderT)}
      data-playing={snap.playing ? 'true' : 'false'}
      data-seed={String(snap.seed)}
      data-progress="plate-state-scrub"
      data-classification="DEFER"
      onKeyDown={onKeyDown}
    >
      <div
        className="lm-press__sheet"
        data-testid="press-plate"
        onPointerDown={onPointerDown}
        onPointerUp={stopDwell}
        onPointerCancel={stopDwell}
      >
        <div className="lm-press__halo" />
        <div className="lm-press__hatch" />
        <div className="lm-press__bite" />
        {snap.specks.map((speck, index) => (
          <span key={index} className="lm-press__speck" style={{ left: `${speck.x * 100}%`, top: `${speck.y * 100}%`, width: speck.r, height: speck.r }} />
        ))}
        <div className="lm-press__layer lm-press__layer--drift"><Icon name="registration" size={compact ? 48 : 68} finish="stamp" /></div>
        <div className="lm-press__layer lm-press__layer--spot"><Icon name="press" size={icon} finish="bleed" /></div>
        <div className="lm-press__layer lm-press__layer--key"><Icon name="press" size={icon} finish="stamp" /></div>
      </div>
      <p className="lm-press__gloss" id={glossId}>{gloss(snap.phenomenonState)}</p>
      <p className="lm-press__readout" data-testid="press-readout">
        <span aria-live="polite">{snap.phenomenonState}</span>
        <span aria-hidden="true">{` · ${snap.presentationMode} · t ${formatProgress(snap.t)}`}</span>
      </p>
      {compact ? null : <p className="lm-press__note">Illustrative plate cycle. Not a calibrated press.</p>}
      {showControls ? (
        <div className="lm-press__controls">
          <label className="lm-press__range-label">
            Plate progress
            <input
              className="lm-press__range"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={snap.t}
              aria-label="Plate progress"
              onChange={(event) => { ctrl.setProgress(Number(event.target.value)); publish() }}
            />
          </label>
          <button type="button" className="lm-press__btn" aria-label="Replay press cycle" onClick={() => { ctrl.replay(); publish() }}>Replay</button>
          <button type="button" className="lm-press__btn" aria-label="Pause press cycle" disabled={!snap.playing} onClick={() => { ctrl.pause(); publish() }}>Pause</button>
        </div>
      ) : null}
    </section>
  )
}

export function PressCycleStage() {
  return (
    <div className="w-full p-2">
      <PressCycle compact showControls />
    </div>
  )
}
