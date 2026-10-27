import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { demos, type Demo } from '../lab/demos'
import { Button, Switch, Tabs, Dialog } from '../components/ui'
import Icon from '../components/Icon'
import GrainMask from '../components/GrainMask'
import receipt from '../../token-audit-receipt.json'

const KEY = 'lm-lab-picks'
function Card({ d, i, picked, onPick, onOpen }: { d: Demo; i: number; picked: boolean; onPick: () => void; onOpen: () => void }) {
  const [on, setOn] = useState(true)
  return <article id={d.id} className="lm-demo paper p-3 flex flex-col gap-2" data-off={!on} data-picked={picked} style={{ viewTransitionName: `lab-${d.id}` }}>
    <header className="flex items-center gap-2"><span className="font-mono text-[10px] bg-ink text-paper rounded px-1.5">{String(i + 1).padStart(2, '0')}</span>
      <h3 className="font-display font-black text-[17px] leading-tight flex-1">{d.title}</h3><Switch label={`toggle ${d.title}`} checked={on} onChange={setOn} /></header>
    <div className="lm-demo__stage">{on ? <d.Stage /> : <span className="font-mono text-xs">OFF</span>}</div>
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 font-mono text-[10px] leading-snug"><dt className="text-lime font-bold" style={{ color: '#4d6a12' }}>FOR</dt><dd>{d.forr}</dd><dt className="font-bold text-cherry">AGAINST</dt><dd>{d.against}</dd></dl>
    <footer className="flex gap-2 items-center"><span className="chip">{d.group}</span><span className="flex-1" />
      <Button size="sm" onClick={onOpen}>open ↗</Button><Button size="sm" variant={picked ? 'ink' : 'accent'} onClick={onPick} aria-pressed={picked}>{picked ? '★ picked' : '☆ pick'}</Button></footer></article>
}
export default function Lab() {
  const [picks, setPicks] = useState<string[]>(() => JSON.parse(localStorage.getItem(KEY) ?? '[]'))
  const [angle, setAngle] = useState(135), [group, setGroup] = useState<'All' | Demo['group']>('All'), [open, setOpen] = useState<Demo | null>(null)
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(picks)), [picks])
  useEffect(() => { document.documentElement.style.setProperty('--lm-angle', `${angle}deg`) }, [angle])
  useEffect(() => { const h = location.hash.slice(1); if (h) document.getElementById(h)?.scrollIntoView() }, [])
  const groups = ['All', 'Tactile', 'Material', 'Motion', 'Graphics', 'Type', 'Offer', 'A11y'] as const
  const list = useMemo(() => demos.filter(d => group === 'All' || d.group === group), [group])
  const vt = (f: () => void) => { const d = document as Document & { startViewTransition?: (cb: () => void) => unknown }; d.startViewTransition ? d.startViewTransition(f) : f() }
  return <div className="lm-lab min-h-screen p-3 sm:p-6">
    <GrainMask opacity={0.25} className="paper p-4 sm:p-6 mb-5"><div className="relative z-[2] flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[240px]"><Link to="/" className="font-mono text-[10px] underline">← specimen home</Link>
        <h1 className="font-display font-black text-4xl sm:text-5xl leading-none tracking-tight">The Lab <span className="font-serif italic font-normal">— pick board</span></h1>
        <p className="font-serif text-lg">{demos.length} live effects. Toggle, poke, then ☆ pick the ones that should ship. Picks persist in this browser.</p></div>
      <div className="flex flex-col gap-2 font-mono text-[11px]">
        <label className="flex items-center gap-2">☀ LIGHT <input type="range" min={0} max={360} value={angle} onChange={e => setAngle(+e.target.value)} /> {angle}°</label>
        <div className="flex gap-2 items-center"><span className="lm-score">★ {picks.length} / {demos.length} PICKED</span>
          <Button size="sm" onClick={() => navigator.clipboard?.writeText(picks.join(', '))}>copy picks</Button><Button size="sm" onClick={() => setPicks([])}>reset</Button></div>
        <div className="flex gap-2 items-center"><Link className="underline" to="/lab/icons"><Icon name="stamp" size={14} /> icons</Link>
          <span className={`chip ${receipt.pass ? 'bg-lime' : 'bg-cherry'}`} title={`commit ${receipt.commit} · ${receipt.auditedAt}`}>tokens:audit {receipt.pass ? 'PASS' : 'FAIL'} · {receipt.counts.tokens}</span></div></div>
    </div></GrainMask>
    <div className="mb-4 overflow-x-auto"><Tabs label="filter" value={group} onChange={g => vt(() => setGroup(g))} items={groups} /></div>
    <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}>
      {list.map(d => <Card key={d.id} d={d} i={demos.indexOf(d)} picked={picks.includes(d.id)} onOpen={() => setOpen(d)} onPick={() => setPicks(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id])} />)}</div>
    <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''}>{open && <><div className="lm-demo__stage !min-h-[320px]"><open.Stage /></div>
      <p className="font-mono text-[11px] mt-3"><b>FOR</b> {open.forr} · <b>AGAINST</b> {open.against} · deep link <code>/lab#{open.id}</code></p></>}</Dialog>
  </div>
}
