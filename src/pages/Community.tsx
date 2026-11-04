import Clips from '../components/Clips'
import SpecimenPage from '../components/SpecimenPage'
const STUDIOS = [
  { n: 'INKDRIFT', c: 'bg-cornflower text-paper', city: 'Memphis, TN', note: 'Stone lithography, botanical states.' },
  { n: 'PAPIER NOIR', c: 'bg-ink text-paper', city: 'Lyon', note: 'Monochrome posters, one-screen pulls.' },
  { n: 'Studio Ardent', c: 'bg-cherry text-paper', city: 'Glasgow', note: 'Misregistration as method.' },
  { n: 'M3NOLITH', c: 'bg-sunflower', city: 'Osaka', note: 'Print-born interface plates.' },
  { n: 'dot.exe', c: 'bg-lime', city: 'Online', note: 'Halftone loops and motion studies.' },
]
const NOTES = ['INKDRIFT pinned a new state of Flora Typica', 'Studio Ardent shared a misregistered proof', 'dot.exe posted a loop sketch', 'PAPIER NOIR archived a poster run']
export default function Community() {
  return <SpecimenPage title="Community" kicker="Studios of the collective · sample" intro="A specimen of who prints here. Studio names and notes are fictional; there are no accounts, follows, or live activity yet.">
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{STUDIOS.map(s => <article key={s.n} className="paper p-4 relative"><Clips /><span className="registration top-3 right-3" />
      <span className={`tag ${s.c}`}>{s.city}</span><h2 className="font-display font-black text-3xl mt-3">{s.n}</h2><p className="font-mono text-xs mt-1">{s.note}</p>
      <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-[10px] uppercase">{['Prints', 'Members'].map(k => <div key={k} className="border-2 border-ink rounded p-2">{k}<div className="font-serif text-2xl normal-case">—</div></div>)}</div></article>)}</div>
    <section className="ink-card p-5 mt-8 max-w-xl"><div className="font-mono text-xs uppercase tracking-widest flex justify-between"><span>Studio notes</span><span className="text-paper/50">sample · not live</span></div>
      <ul className="mt-3 flex flex-col gap-2 font-mono text-sm">{NOTES.map(n => <li key={n}>✧ {n}</li>)}</ul></section>
  </SpecimenPage>
}
