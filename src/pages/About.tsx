import { Link } from 'react-router-dom'
import Clips from '../components/Clips'
import SpecimenPage from '../components/SpecimenPage'
const SW = [['Ink', '#0E0E0E'], ['Paper', '#F7F6F2'], ['Cornflower', '#3B6FF0'], ['Sunflower', 'var(--color-sunflower)'], ['Cherry', '#D54545'], ['Lime', 'var(--color-lime)'], ['Mauve', 'var(--color-mauve)'], ['Wine', 'var(--color-wine)']]
export default function About() {
  return <SpecimenPage title="About" kicker="The Collective · intent" intro="LITHOMEMPHIS is a specimen for a print-born creative collective: interfaces that feel pulled from a press rather than rendered on glass.">
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="paper p-6 relative"><Clips /><span className="registration top-3 right-3" />
        <h2 className="font-serif text-4xl">Print-born, on purpose.</h2>
        <p className="font-display text-lg mt-3">Paper cards, brass clips, registration marks, halftone and grain — the vocabulary of lithography and screen printing, set as UI. Memphis-era colour, neobrutalist edges.</p>
        <p className="font-mono text-xs mt-4 border-t border-ink/20 pt-3">This is a demo. There are no accounts, votes, challenges or live data yet; metrics read “—”.</p>
        <div className="flex flex-wrap gap-2 mt-4"><Link to="/gallery" className="btn bg-cornflower text-paper text-xs uppercase">Gallery →</Link><Link to="/lab" className="btn bg-sunflower text-xs uppercase">Lab →</Link></div></article>
      <article className="paper p-6 relative"><Clips />
        <div className="font-mono text-[11px] uppercase tracking-widest">Palette</div>
        <div className="grid grid-cols-4 gap-2 mt-2">{SW.map(([n, c]) => <div key={n} className="font-mono text-[10px]"><div className="h-12 rounded border-2 border-ink" style={{ background: c }} />{n}</div>)}</div>
        <div className="font-mono text-[11px] uppercase tracking-widest mt-6">Type</div>
        <ul className="mt-2 grid gap-1"><li className="font-display font-black text-2xl">Fraunces — display</li><li className="font-serif italic text-2xl">Instrument Serif — headlines</li><li className="font-mono">Space Mono — labels & data</li><li className="font-sans">Inter — body</li></ul></article>
    </div>
  </SpecimenPage>
}
