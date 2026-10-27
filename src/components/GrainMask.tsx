import { useId, type ReactNode } from 'react'
/** Procedural paper-fiber grain: SVG feTurbulence (fractal noise) multiplied over children. No bitmaps. */
export default function GrainMask({ children, frequency = 0.8, octaves = 3, opacity = 0.35, fibers = true, className = '' }: { children?: ReactNode; frequency?: number; octaves?: number; opacity?: number; fibers?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '')
  return <div className={`lm-grain ${className}`} style={{ position: 'relative', isolation: 'isolate' }}>
    {children}
    <svg aria-hidden className="lm-grain__svg" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply', opacity, borderRadius: 'inherit' }}>
      <filter id={`g${id}`}><feTurbulence type="fractalNoise" baseFrequency={fibers ? `${frequency * 0.08} ${frequency}` : frequency} numOctaves={octaves} seed={7} stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 .32 0 0 0 0 .27 0 0 0 0 .2 0 0 0 1.4 -.35" /></filter>
      <rect width="100%" height="100%" filter={`url(#g${id})`} />
    </svg>
  </div>
}
