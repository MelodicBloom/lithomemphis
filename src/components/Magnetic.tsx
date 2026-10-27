import { useRef, type ReactNode } from 'react'
import { springs, useSpring } from '../lib/spring'
/** Pulls its child toward the cursor inside `radius`, springs home when the cursor leaves. */
export default function Magnetic({ children, strength = 0.35, radius = 120 }: { children: ReactNode; strength?: number; radius?: number }) {
  const zone = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null)
  const s = useSpring([0, 0], springs.wobbly, ([x, y]) => { if (inner.current) inner.current.style.translate = `${x}px ${y}px` })
  return <div ref={zone} className="lm-magnetic" style={{ padding: radius / 3 }}
    onPointerMove={e => { const r = inner.current!.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
      const d = Math.hypot(dx, dy); s.set(d < radius ? [dx * strength, dy * strength] : [0, 0]) }}
    onPointerLeave={() => s.set([0, 0])}><div ref={inner} style={{ display: 'inline-block' }}>{children}</div></div>
}
