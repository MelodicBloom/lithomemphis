import { iconPaths, type IconName } from './paths'
export { iconPaths, type IconName }
/** Mount once (App root / Storybook decorator): shared ink-bleed + stamp filters for every Icon. */
export function InkDefs() {
  return <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}><defs>
    <filter id="lm-ink-bleed" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" result="d" />
      <feMorphology in="d" operator="dilate" radius="0.35" result="fat" />
      <feGaussianBlur in="fat" stdDeviation="0.25" />
    </filter>
    <filter id="lm-stamp" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9" result="n" />
      <feColorMatrix in="n" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.2 1.6" result="holes" />
      <feComposite in="SourceGraphic" in2="holes" operator="in" />
    </filter>
  </defs></svg>
}
type Props = { name: IconName; size?: number; finish?: 'clean' | 'bleed' | 'stamp'; title?: string; className?: string }
export default function Icon({ name, size = 24, finish = 'bleed', title, className = '' }: Props) {
  return <svg className={`lm-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square"
    role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} filter={finish === 'clean' ? undefined : `url(#lm-${finish === 'bleed' ? 'ink-bleed' : 'stamp'})`}>
    {title && <title>{title}</title>}<path d={iconPaths[name]} /></svg>
}
