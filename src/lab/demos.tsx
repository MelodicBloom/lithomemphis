import { useEffect, useRef, useState, type ReactNode } from 'react'
import SpringPressable from '../components/SpringPressable'
import Magnetic from '../components/Magnetic'
import GrainMask from '../components/GrainMask'
import BackdropSurface, { type BackdropVariant } from '../components/BackdropSurface'
import LithoCard from '../components/LithoCard'
import OfferChip from '../components/OfferChip'
import Icon, { iconPaths, type IconName } from '../components/Icon'
import ShaderCanvas, { type ShaderMode } from '../components/ShaderCanvas'
import { Button, Tabs, Switch } from '../components/ui'
import { springs, useSpring, motionSafe } from '../lib/spring'
import Art from '../components/Art'

export type Demo = { id: string; title: string; group: 'Tactile' | 'Material' | 'Motion' | 'Graphics' | 'Type' | 'Offer' | 'A11y'; forr: string; against: string; Stage: () => ReactNode }
const Knob = ({ l, v, min, max, set, step = 1 }: { l: string; v: number; min: number; max: number; set: (n: number) => void; step?: number }) =>
  <label className="flex items-center gap-2 font-mono text-[10px] uppercase w-full">{l}<input className="flex-1 accent-[var(--lm-color-cherry)]" type="range" min={min} max={max} step={step} value={v} onChange={e => set(+e.target.value)} /><b className="w-8 text-right">{v}</b></label>

function SpringStage() { const [k, setK] = useState(springs.squish.stiffness), [c, setC] = useState(springs.squish.damping)
  return <div className="flex flex-col items-center gap-3 w-full p-3">
    <SpringPressable config={{ stiffness: k, damping: c }} className="lm-btn lm-btn--accent lm-btn--md !text-lg !px-8 !py-4">PRESS ME</SpringPressable>
    <Knob l="stiff" v={k} min={60} max={900} set={setK} /><Knob l="damp" v={c} min={4} max={60} set={setC} /></div> }
function MagnetStage() { return <Magnetic strength={0.4} radius={140}><div className="w-20 h-20 rounded-full bg-cherry border-2 border-ink shadow-[4px_4px_0_#0E0E0E] grid place-items-center text-paper"><Icon name="registration" size={34} /></div></Magnetic> }
function GrainStage() { const [f, setF] = useState(0.8), [o, setO] = useState(0.45)
  return <div className="w-full p-3 flex flex-col gap-2"><GrainMask frequency={f} opacity={o} className="h-28 rounded-lg border-2 border-ink" ><div className="h-28 rounded-lg bg-[var(--lm-color-paper)] grid place-items-center font-serif italic text-3xl">cotton rag</div></GrainMask>
    <Knob l="freq" v={f} min={0.2} max={1.6} step={0.05} set={setF} /><Knob l="ink" v={o} min={0} max={1} step={0.05} set={setO} /></div> }
function RisoStage() { const [r, setR] = useState(3); const ref = useRef<HTMLDivElement>(null)
  return <div className="w-full p-3 flex flex-col gap-2 items-center" onPointerMove={e => { const b = e.currentTarget.getBoundingClientRect(); ref.current?.style.setProperty('--ry', `${((e.clientY - b.top) / b.height - .5) * r * 2}px`) }}>
    <div ref={ref} className="lm-riso" style={{ ['--rx' as string]: `${r}px`, ['--ry' as string]: `${r * .6}px`, containerType: 'inline-size', width: '100%', textAlign: 'center' }}>LITHO<span className="c1">LITHO</span><span className="c2">LITHO</span><span className="c3">LITHO</span></div>
    <Knob l="misreg" v={r} min={0} max={10} set={setR} /></div> }
function GlassStage() { const [v, setV] = useState<BackdropVariant>('frost')
  return <div className="relative w-full h-[200px] overflow-hidden"><div className="absolute inset-0 scale-110"><Art kind="garden" /></div>
    <div className="absolute inset-0 halftone opacity-20" /><div className="absolute top-2 left-2 z-10"><Tabs label="backdrop" value={v} onChange={setV} items={['frost', 'smoke', 'vellum'] as const} /></div>
    <BackdropSurface variant={v} className="absolute left-6 right-6 bottom-4 p-3"><div className="font-mono text-[10px] uppercase">BackdropSurface · {v}</div><div className="font-serif text-xl leading-tight">Glass that still prints.</div></BackdropSurface></div> }
function LightStage() { return <div className="flex flex-col items-center"><div className="flex gap-4 p-4">{['--lm-color-cornflower', '--lm-color-sunflower', '--lm-color-cherry'].map(c =>
  <div key={c} className="lm-lit w-16 h-20 rounded-lg border-2 border-ink" style={{ ['--c' as string]: `var(${c})` }} />)}</div><p className="font-mono text-[10px] text-center px-2 -mt-2 mb-2">☀ LIGHT slider (header) re-lights every card</p></div> }
function FilmStage() { return <LithoCard sheen="film" className="w-[78%] p-4"><div className="font-mono text-[10px] uppercase">Nacre · thin-film</div><div className="font-display font-black text-2xl">Mother-of-pearl</div><div className="font-serif italic">tilt me</div></LithoCard> }
function VTStage() { const [open, setOpen] = useState<number | null>(null)
  const go = (n: number | null) => { const d = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (d.startViewTransition && !motionSafe()) d.startViewTransition(() => setOpen(n)); else setOpen(n) }
  const kinds = ['flora', 'vessel', 'arches'] as const
  return <div className="w-full p-3">{open === null
    ? <div className="grid grid-cols-3 gap-2">{kinds.map((k, i) => <button key={k} onClick={() => go(i)} className="border-2 border-ink rounded-lg overflow-hidden h-24 bg-paper" style={{ viewTransitionName: `vt-art-${i}` }}><Art kind={k} /></button>)}</div>
    : <div className="flex gap-3 items-start"><button onClick={() => go(null)} className="border-2 border-ink rounded-lg overflow-hidden h-36 w-36 bg-paper shrink-0" style={{ viewTransitionName: `vt-art-${open}` }}><Art kind={kinds[open]} /></button>
      <div><div className="font-display font-black text-xl capitalize">{kinds[open]}</div><p className="font-mono text-[10px]">{'startViewTransition' in document ? 'Morphed via View Transitions API' : 'No VT support → instant swap'}. Tap to go back.</p></div></div>}</div> }
function RevealStage() { const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (CSS.supports('animation-timeline: view()')) return
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-in', e.isIntersecting)), { root: ref.current, threshold: .25 })
    ref.current!.querySelectorAll('.lm-reveal').forEach(n => io.observe(n)); return () => io.disconnect() }, [])
  return <div ref={ref} className="lm-reveal-scroller w-full p-3 flex flex-col gap-3"><p className="font-mono text-[10px] uppercase">scroll inside ↓ · {typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()') ? 'CSS scroll-driven' : 'IO fallback'}</p>
    {['Proof', 'Plate', 'Pull', 'Print', 'Press', 'Publish'].map((w, i) => <div key={w} className="lm-reveal paper p-3 font-display font-black text-xl" style={{ background: i % 2 ? 'var(--lm-color-sunflower)' : undefined }}>{i + 1}. {w}</div>)}</div> }
function TapStage() { const [score, setScore] = useState(0); const [pops, setPops] = useState<{ id: number; x: number }[]>([])
  return <div className="flex flex-col items-center gap-3 relative"><span className="lm-score">SCORE {String(score).padStart(3, '0')}</span>
    <SpringPressable preset="wobbly" squish={0.22} onPress={() => { setScore(s => s + 10); navigator.vibrate?.(12); const id = Date.now(); setPops(p => [...p, { id, x: Math.random() * 60 - 30 }]); setTimeout(() => setPops(p => p.filter(q => q.id !== id)), 800) }}
      className="w-20 h-20 rounded-full bg-cornflower border-2 border-ink shadow-[4px_4px_0_#0E0E0E] grid place-items-center text-paper"><Icon name="star" size={36} /></SpringPressable>
    {pops.map(p => <span key={p.id} className="lm-plus" style={{ left: `calc(50% + ${p.x}px)`, top: 40 }}>+10</span>)}</div> }
function IconStage() { const [f, setF] = useState<'clean' | 'bleed' | 'stamp'>('bleed')
  return <div className="p-3 flex flex-col gap-2 items-center"><div className="grid grid-cols-6 gap-2">{(Object.keys(iconPaths) as IconName[]).map(n => <span key={n} title={n} className="w-9 h-9 grid place-items-center border-2 border-ink rounded bg-paper"><Icon name={n} finish={f} /></span>)}</div>
    <Tabs label="finish" value={f} onChange={setF} items={['clean', 'bleed', 'stamp'] as const} /><a href="/lab/icons" className="font-mono text-[10px] underline">browse /lab/icons →</a></div> }
function ShaderStage({ mode }: { mode: ShaderMode }) { return <div className="w-full h-[190px] p-2"><ShaderCanvas mode={mode} /></div> }
function TexStage() { const [m, setM] = useState<ShaderMode>('grain'); return <div className="w-full flex flex-col gap-1 items-center p-1"><Tabs label="shader" value={m} onChange={setM} items={['grain', 'film', 'dither'] as const} /><div className="w-full h-[160px] px-2"><ShaderCanvas key={m} mode={m} /></div></div> }
function SafeStage() { const [safe, setSafe] = useState(document.documentElement.dataset.motion === 'safe')
  const os = matchMedia('(prefers-reduced-motion: reduce)').matches
  return <div className="p-3 flex flex-col gap-2 items-center text-center"><div className="flex items-center gap-2 font-mono text-xs"><Switch label="safe mode" checked={safe} onChange={v => { setSafe(v); document.documentElement.dataset.motion = v ? 'safe' : 'full' }} />SAFE MODE (whole lab)</div>
    <div className="lm-blob scale-50 -my-6" /><p className="font-mono text-[10px]">OS reduced-motion: <b>{os ? 'ON' : 'off'}</b>. Springs snap, shaders render 1 frame, VT skipped, blob freezes — per-rule, never a global 0.01ms hack.</p></div> }
function BentoStage() { return <div className="w-full p-3"><div className="lm-bento" style={{ width: '70%' }}><div className="lm-bento__grid">
  <div className="bg-sunflower">Edition 04 — drag corner ↘ to resize</div><div className="bg-lime">12 plates</div><div className="bg-cornflower text-paper">Riso</div><div className="bg-paper">A3</div></div></div><p className="font-mono text-[10px] mt-1">@container, not @media — layout follows the card.</p></div> }
function TypeStage() { const [w, setW] = useState(900), [o, setO] = useState(96)
  return <div className="w-full p-3"><div style={{ fontFamily: 'Fraunces', fontWeight: w, fontVariationSettings: `'opsz' ${o}, 'SOFT' 50`, fontSize: 40, lineHeight: .95 }}>Lithograph</div>
    <p className="font-serif text-lg leading-snug">Instrument Serif body carries the voice; <span className="font-mono text-xs">Space Mono</span> labels the plate.</p>
    <Knob l="wght" v={w} min={100} max={900} step={50} set={setW} /><Knob l="opsz" v={o} min={9} max={144} set={setO} /></div> }
function OfferStage() { return <LithoCard className="w-[88%] p-4"><div className="flex gap-2 flex-wrap mb-2"><OfferChip kind="commission">Commission</OfferChip><OfferChip kind="specimen">Specimen</OfferChip><OfferChip kind="kit">Kit</OfferChip></div>
  <div className="font-display font-black text-2xl leading-none">Your poster, pulled by hand.</div><div className="font-serif italic">3 slots left this month · from $240</div>
  <div className="mt-3 flex gap-2"><SpringPressable className="lm-btn lm-btn--ink lm-btn--md">Commission a plate</SpringPressable><Button variant="paper">See kit</Button></div></LithoCard> }
function MeterStage() { const [n, setN] = useState(2)
  return <div className="flex flex-col items-center gap-3"><div className="flex gap-2">{[0, 1, 2, 3, 4].map(i => <span key={i} className={`w-11 h-11 rounded-full border-2 border-ink grid place-items-center ${i < n ? 'bg-cherry text-paper lm-stamped' : 'bg-paper border-dashed'}`}>{i < n && <Icon name="stamp" finish="stamp" size={22} />}</span>)}</div>
    <div className="flex gap-2"><Button size="sm" onClick={() => setN(v => Math.max(0, v - 1))}>−</Button><Button size="sm" variant="accent" onClick={() => setN(v => Math.min(5, v + 1))}>stamp +1</Button></div>
    <span className="font-mono text-[10px]">{n === 5 ? '★ PASSPORT COMPLETE' : `${n}/5 studio visits`}</span></div> }
function PeelStage() { const ref = useRef<HTMLDivElement>(null); const drag = useRef(false)
  const s = useSpring([18], springs.wobbly, ([p]) => ref.current?.style.setProperty('--p', `${p}%`))
  return <div ref={ref} className="lm-peel" style={{ ['--p' as string]: '18%' }} onPointerDown={e => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId) }}
    onPointerMove={e => { if (!drag.current) return; const b = e.currentTarget.getBoundingClientRect(); s.set([Math.min(85, Math.max(18, ((b.right - e.clientX) + (b.bottom - e.clientY)) / 2.4))]) }}
    onPointerUp={() => { drag.current = false; s.set([18]) }}><div className="lm-peel__face">L·M</div><div className="lm-peel__back" /><span className="absolute -bottom-5 w-full text-center font-mono text-[9px]">drag the corner</span></div> }
function DitherStage() { return <ShaderStage mode="dither" /> }
function BlobFocusStage() { return <div className="flex flex-col items-center gap-3"><div className="lm-blob" /><div className="lm-focus-row flex gap-2">{['Tab', 'to', 'focus'].map(t => <button key={t} className="lm-btn lm-btn--sm">{t}</button>)}</div></div> }

export const demos: Demo[] = [
  { id: 'spring-press', title: 'Spring press / squish', group: 'Tactile', forr: 'feel, delight, perceived quality', against: 'battery on long lists; rAF per press', Stage: SpringStage },
  { id: 'magnetic', title: 'Magnetic hover', group: 'Tactile', forr: 'discoverability of primary CTA', against: 'precision; useless on touch', Stage: MagnetStage },
  { id: 'paper-grain', title: 'Paper fiber grain mask', group: 'Material', forr: 'print authenticity, zero bitmaps', against: 'SVG filter cost on huge areas', Stage: GrainStage },
  { id: 'riso', title: 'Risograph misregistration', group: 'Graphics', forr: 'brand signature, playful', against: 'legibility at small sizes', Stage: RisoStage },
  { id: 'glass', title: 'BackdropSurface glass', group: 'Material', forr: 'layered depth over art', against: 'GPU cost, contrast on busy art', Stage: GlassStage },
  { id: 'light', title: 'Lighting-angle token', group: 'Material', forr: 'one knob → coherent shadows/sheen', against: 'needs discipline to not hardcode shadows', Stage: LightStage },
  { id: 'nacre', title: 'Iridescent thin-film', group: 'Material', forr: 'premium, collectible feel', against: 'can read "holo sticker" if overused', Stage: FilmStage },
  { id: 'view-transition', title: 'View Transitions card→detail', group: 'Motion', forr: 'spatial continuity, no lib', against: 'Firefox < 144 falls back to instant', Stage: VTStage },
  { id: 'scroll-reveal', title: 'Scroll-driven reveal', group: 'Motion', forr: 'off-main-thread, zero JS where supported', against: 'hides content if misconfigured', Stage: RevealStage },
  { id: 'tap-score', title: 'Haptic tap + score chip', group: 'Tactile', forr: 'gamified engagement, voting', against: 'gimmick risk; vibrate only on Android', Stage: TapStage },
  { id: 'ink-icons', title: 'Ink-bleed stamp icons (12)', group: 'Graphics', forr: 'cohesive print iconography', against: 'filter fuzz below 16px', Stage: IconStage },
  { id: 'texture-shader', title: 'Texture shader toggle', group: 'Graphics', forr: 'living paper, nacre, dither in 1 canvas', against: 'WebGL context limits (~16/page)', Stage: TexStage },
  { id: 'safe-mode', title: 'Reduced-motion safe mode', group: 'A11y', forr: 'vestibular safety, trust', against: 'nothing — ship it', Stage: SafeStage },
  { id: 'bento', title: 'Container-query bento', group: 'Type', forr: 'components that reflow anywhere', against: 'needs containment on parents', Stage: BentoStage },
  { id: 'type', title: 'Type specimen · optical sizes', group: 'Type', forr: 'display drama + readable body', against: 'variable-font payload', Stage: TypeStage },
  { id: 'offer', title: 'Branded feature offer card', group: 'Offer', forr: 'conversion: commission/specimen/kit', against: 'salesy if stacked too often', Stage: OfferStage },
  { id: 'stamp-meter', title: 'Stamped progress meter', group: 'Tactile', forr: 'loyalty / challenge progress', against: 'needs real backing data', Stage: MeterStage },
  { id: 'peel', title: 'Peel sticker', group: 'Tactile', forr: 'reward reveal, collectible', against: 'drag affordance must be taught', Stage: PeelStage },
  { id: 'dither', title: 'Ordered-dither fade', group: 'Graphics', forr: 'retro print transition', against: 'pixel shimmer on hi-dpi', Stage: DitherStage },
  { id: 'blob-focus', title: 'Liquid blob + focus choreography', group: 'A11y', forr: 'keyboard users get a delight path too', against: 'blob is decoration only', Stage: BlobFocusStage },
]
