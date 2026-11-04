import { Link } from 'react-router-dom'
import Art from '../components/Art'
import Clips from '../components/Clips'
import SpecimenPage from '../components/SpecimenPage'
import { artifacts } from '../lib/gallery'
const isArchival = (a: (typeof artifacts)[number]) => a.kind === 'Archive' || a.kind === 'Editorial' || a.year < 2024 || a.series === 'Ephemera'
export default function Archive() {
  const items = artifacts.filter(isArchival).sort((a, b) => a.year - b.year)
  return <SpecimenPage title="Archive" kicker="Living archive · ephemera & field notes" intro={<>Older plates, notebooks and paper scraps — the stuff the collective keeps in flat files. Each entry opens in the gallery's artifact view. <Link className="underline" to="/gallery?tab=Archives">See archive tab in gallery →</Link></>}>
    <ol className="grid gap-5">{items.map(a => <li key={a.id} className="paper overflow-hidden flex flex-col sm:flex-row relative"><Clips /><span className="registration top-3 right-3 z-10" />
      <div className="sm:w-56 h-40 shrink-0 print-frame"><Art kind={a.art} /></div>
      <div className="p-4 flex-1"><div className="font-mono text-[11px] uppercase tracking-widest text-ink/60">{a.year} · {a.kind}{a.series ? ` · ${a.series}` : ''}</div>
        <h2 className="font-serif text-3xl leading-tight mt-1">{a.title}</h2>
        {a.description && <p className="font-display text-sm mt-2 max-w-2xl">{a.description}</p>}
        <Link to={`/gallery/${a.id}`} className="chip uppercase tracking-wider inline-block mt-3">Open record →</Link></div></li>)}</ol>
  </SpecimenPage>
}
