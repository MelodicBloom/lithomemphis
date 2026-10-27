import { useRef, type ReactNode, type CSSProperties } from 'react'
import { springs, useSpring, type SpringConfig, type SpringPreset } from '../lib/spring'
type Props = { children: ReactNode; preset?: SpringPreset; config?: Partial<SpringConfig>; squish?: number; onPress?: () => void; className?: string; style?: CSSProperties; label?: string }
/** Press = volume-preserving squish (scaleX up as scaleY goes down), release = spring overshoot. */
export default function SpringPressable({ children, preset = 'squish', config, squish = 0.14, onPress, className = '', style, label }: Props) {
  const el = useRef<HTMLButtonElement>(null)
  const cfg = { ...springs[preset], ...config }
  const s = useSpring([1, 1], cfg, ([sx, sy]) => { if (el.current) el.current.style.scale = `${sx} ${sy}` })
  const down = () => s.set([1 + squish * 0.6, 1 - squish])
  const up = () => s.set([1, 1], [-squish * 4, squish * 6])
  return <button ref={el} type="button" aria-label={label} className={`lm-pressable ${className}`} style={style}
    onPointerDown={down} onPointerUp={up} onPointerLeave={() => s.set([1, 1])}
    onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down() }}
    onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') up() }}
    onClick={onPress}>{children}</button>
}
