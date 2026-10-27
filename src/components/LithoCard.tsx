import { useRef, type ReactNode, type CSSProperties } from 'react'
import { springs, useSpring } from '../lib/spring'
/**
 * Paper card lit by the global --lm-light-angle token: a specular band is painted at that angle,
 * and pointer tilt shifts it (sheen follows the "lamp"). `sheen="film"` swaps to iridescent thin-film.
 */
export default function LithoCard({ children, tilt = true, sheen = 'specular', className = '', style }: { children: ReactNode; tilt?: boolean; sheen?: 'specular' | 'film' | 'none'; className?: string; style?: CSSProperties }) {
  const el = useRef<HTMLDivElement>(null)
  const s = useSpring([0, 0], springs.gentle, ([x, y]) => { const n = el.current; if (!n) return
    n.style.setProperty('--tx', String(x)); n.style.setProperty('--ty', String(y)); n.style.rotate = `${y * -6}deg ${x * 6}deg 0` })
  return <div ref={el} className={`lm-card paper ${className}`} data-sheen={sheen} style={style}
    onPointerMove={tilt ? e => { const r = el.current!.getBoundingClientRect(); s.set([(e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5]) } : undefined}
    onPointerLeave={tilt ? () => s.set([0, 0]) : undefined}>
    <div style={{ position: 'relative', zIndex: 2 }}>{children}</div><span aria-hidden className="lm-card__sheen" /></div>
}
