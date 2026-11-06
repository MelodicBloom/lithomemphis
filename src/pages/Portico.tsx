import { Link } from 'react-router-dom'
import Clips from '../components/Clips'
import SpecimenPage from '../components/SpecimenPage'

const ENCOUNTER = [
  ['01', 'Context', 'Know where you are, what is real, and what remains a specimen.'],
  ['02', 'Invitation', 'Offer a direction without turning it into an instruction.'],
  ['03', 'Exploration', 'Let artifacts, studios, tools, and traces reveal the system through use.'],
  ['04', 'Recognition', 'Surface relationships, provenance, and recurring motifs so discovery becomes legible.'],
  ['05', 'Choice', 'Present meaningful next gates instead of a single prescribed path.'],
  ['06', 'Reflection', 'Leave enough evidence to understand why a path felt useful or coherent.'],
  ['07', 'Departure', 'Carry a trace forward: a route, artifact, question, or handoff — not a locked destination.'],
] as const

const GATES = [
  { to: '/gallery', label: 'Artifact gate', title: 'Gallery', note: 'Discover through objects, media, tags, series, and provenance.' },
  { to: '/community', label: 'Collective gate', title: 'Community', note: 'Read the fictional studio field as a plural context, not a ranking engine.' },
  { to: '/archive', label: 'Memory gate', title: 'Archive', note: 'Move backward through retained traces instead of treating old work as discarded.' },
  { to: '/lab', label: 'Tool gate', title: 'Lab', note: 'Inspect the interaction and material primitives behind the surface.' },
] as const

const PRINCIPLES = [
  ['Orientation over instruction', 'Portico helps a visitor locate themselves before asking them to act.'],
  ['Discovery over premature revelation', 'Meaning should emerge through encounters, adjacency, and evidence rather than a top-down answer.'],
  ['Stewardship without ownership', 'The interface can guide, preserve, and connect without pretending one voice owns the collective story.'],
  ['Coherent divergence', 'Different paths may produce different readings while still sharing tokens, provenance, and interaction grammar.'],
] as const

export default function Portico() {
  return <SpecimenPage
    title="Portico"
    kicker="Shared thresholds · orientation grammar"
    intro={<>A Portico is the threshold layer of LITHOMEMPHIS: an architecture for shared discovery. It turns navigation into a sequence of meaningful encounters while keeping this runtime honest — static specimen content, no accounts, no live community state.</>}
  >
    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <article className="paper p-5 sm:p-7 relative overflow-hidden">
        <Clips only={['tl','br']} />
        <span className="registration top-4 right-4" />
        <div className="font-mono text-[11px] uppercase tracking-widest">The threshold</div>
        <h2 className="font-display font-black text-4xl sm:text-6xl leading-[.9] mt-3">ENTER WITHOUT<br/>BEING TOLD<br/>WHAT TO FIND.</h2>
        <p className="font-serif text-2xl leading-tight mt-5 max-w-2xl">Portico uses structure before decoration, spatial navigation, purposeful components, and motion that reveals relationships. The tactile LITHOMEMPHIS material language is the host; Portico is the encounter grammar.</p>
        <div className="flex flex-wrap gap-2 mt-6">
          <span className="tag bg-cornflower text-paper">threshold</span>
          <span className="tag bg-sunflower">shared discovery</span>
          <span className="tag bg-lime">provenance</span>
          <span className="tag bg-cherry text-paper">choice</span>
        </div>
      </article>

      <aside className="ink-card p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-widest text-paper/60">Torch passing · specimen rule</div>
        <h2 className="font-serif text-4xl mt-3">Leave a useful trace.</h2>
        <p className="font-mono text-xs text-paper/70 mt-3">A handoff should preserve enough context for the next person to orient themselves: what was observed, what was inferred, what was chosen, and what remains open.</p>
        <div className="border border-paper/20 rounded-xl mt-5 p-4">
          <div className="font-mono text-[10px] uppercase text-paper/50">Current implementation</div>
          <p className="font-serif text-2xl mt-1">Routes are the traveling gates.</p>
          <p className="font-mono text-[11px] text-paper/60 mt-2">No identity, messaging, handoff persistence, or live collaboration is implied by this page.</p>
        </div>
      </aside>
    </section>

    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-paper/60">Meaningful encounter</div>
          <h2 className="font-serif text-5xl text-paper">Seven moments</h2>
        </div>
        <span className="font-mono text-[10px] text-paper/45 hidden sm:block">context → invitation → exploration → recognition → choice → reflection → departure</span>
      </div>
      <ol className="grid gap-3 mt-4 md:grid-cols-2 xl:grid-cols-4">
        {ENCOUNTER.map(([n,title,note]) => <li key={title} className="paper p-4">
          <div className="font-mono text-[10px] uppercase flex justify-between"><span>{n}</span><span className="text-ink/40">encounter</span></div>
          <h3 className="font-display font-black text-2xl mt-2">{title}</h3>
          <p className="font-mono text-xs mt-2">{note}</p>
        </li>)}
      </ol>
    </section>

    <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {GATES.map(g => <Link key={g.to} to={g.to} className="paper p-5 block hover:-translate-y-0.5 transition">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink/55">{g.label}</div>
        <h3 className="font-serif text-4xl mt-1">{g.title}</h3>
        <p className="font-mono text-xs mt-3 min-h-[4.5rem]">{g.note}</p>
        <span className="btn bg-ink text-paper inline-flex px-4 py-2 text-xs mt-4">Cross threshold →</span>
      </Link>)}
    </section>

    <section className="paper p-5 sm:p-6 mt-8 relative">
      <Clips only={['tr','bl']} />
      <div className="font-mono text-[11px] uppercase tracking-widest">Operating principles</div>
      <div className="grid gap-4 mt-4 md:grid-cols-2">
        {PRINCIPLES.map(([title,note]) => <div key={title} className="border-l-4 border-ink pl-4">
          <h3 className="font-display font-black text-xl">{title}</h3>
          <p className="font-mono text-xs mt-1">{note}</p>
        </div>)}
      </div>
    </section>
  </SpecimenPage>
}
