import { useEffect, useRef } from 'react'
import springTokens from '../../tokens/spring.json'
export type SpringConfig = { stiffness: number; damping: number; mass: number }
export type SpringPreset = keyof typeof springTokens.tokens
export const springs = springTokens.tokens as Record<SpringPreset, SpringConfig>

/** True when the OS asks for reduced motion OR the lab "safe mode" switch is on. */
export const motionSafe = () =>
  (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) ||
  (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'safe')

/** Tiny semi-implicit Euler spring. Animates N channels toward targets; snaps when reduced motion. */
export class Spring {
  value: number[]; target: number[]; vel: number[]; raf = 0; last = 0
  cfg: SpringConfig; onChange: (v: number[]) => void
  constructor(init: number[], cfg: SpringConfig, onChange: (v: number[]) => void) {
    this.cfg = cfg; this.onChange = onChange
    this.value = [...init]; this.target = [...init]; this.vel = init.map(() => 0)
  }
  set(target: number[], impulse?: number[]) {
    this.target = target
    if (impulse) this.vel = this.vel.map((v, i) => v + (impulse[i] ?? 0))
    if (motionSafe()) { this.value = [...target]; this.vel = target.map(() => 0); this.onChange(this.value); return }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick) }
  }
  tick = (t: number) => {
    const dt = Math.min(0.032, (t - this.last) / 1000); this.last = t
    const { stiffness: k, damping: c, mass: m } = this.cfg
    let rest = true
    for (let s = 0; s < 4; s++) { const h = dt / 4
      this.value = this.value.map((x, i) => { const a = (-k * (x - this.target[i]) - c * this.vel[i]) / m; this.vel[i] += a * h; return x + this.vel[i] * h })
    }
    this.value.forEach((x, i) => { if (Math.abs(x - this.target[i]) > 1e-3 || Math.abs(this.vel[i]) > 1e-3) rest = false })
    if (rest) this.value = [...this.target]
    this.onChange(this.value)
    this.raf = rest ? 0 : requestAnimationFrame(this.tick)
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0 }
}

export function useSpring(init: number[], cfg: SpringConfig, onChange: (v: number[]) => void) {
  const ref = useRef<Spring | null>(null)
  if (!ref.current) ref.current = new Spring(init, cfg, onChange)
  ref.current.cfg = cfg; ref.current.onChange = onChange
  useEffect(() => () => ref.current?.stop(), [])
  return ref.current
}
