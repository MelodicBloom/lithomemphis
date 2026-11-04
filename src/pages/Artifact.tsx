import { Link, useLocation, useParams } from 'react-router-dom'
import Clips from '../components/Clips'
import Art, { EdgeBotanical } from '../components/Art'
import MobileNav from '../components/MobileNav'
import { Logo, SpecimenBadge } from '../components/Nav'
import { artifacts, mediumOf } from '../lib/gallery'
const tagColor: Record<string, string> = { NEW: 'bg-cornflower text-paper', SERIES: 'bg-sunflower', ARCHIVE: 'bg-wine text-paper', MOTION: 'bg-lime' }
export default function Artifact() {
  const { id } = useParams(); const { search } = useLocation()
  const back = `/gallery${search}`
  const i = artifacts.findIndex(a => a.id === id); const a = artifacts[i]
  const header = <header className="flex items-center gap-6 px-4 lg:px-8 py-4 border-b border-paper/15 relative z-10"><Link to="/" className="hidden lg:block"><Logo /></Link>
    <Link to={back} className="chip bg-paper uppercase tracking-wider text-xs">← Back to gallery</Link><span className="ml-auto hidden sm:inline"><SpecimenBadge /></span></header>
  if (!a) return <><MobileNav /><div className="min-h-screen max-w-[1440px] mx-auto">{header}
    <main className="px-4 lg:px-8 py-10"><div className="paper p-10 max-w-xl mx-auto text-center relative"><Clips /><span className="registration top-3 right-3" />
      <div className="font-mono text-[11px] uppercase tracking-widest text-ink/60">Error 404 · plate missing from the archive</div>
      <h1 className="font-serif text-5xl mt-2">No such artifact.</h1>
      <p className="font-mono text-xs text-ink/70 mt-3">“{id}” was never pulled, or the stone was wiped. Sample collection only.</p>
      <Link to={back} className="btn bg-sunflower inline-block mt-6 text-xs uppercase">Return to the gallery →</Link></div></main></div></>
  const prev = artifacts[(i - 1 + artifacts.length) % artifacts.length], next = artifacts[(i + 1) % artifacts.length]
  return <><MobileNav /><div className="min-h-screen max-w-[1440px] mx-auto relative overflow-hidden">{header}
    <EdgeBotanical className="hidden xl:block absolute -right-10 top-28 w-36 pointer-events-none" />
    <main className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 px-4 lg:px-8 py-6 relative z-10">
      <div className="paper overflow-hidden relative"><Clips />{a.tag && <span className={`tag absolute z-10 top-3 left-3 ${tagColor[a.tag]}`}>{a.tag}</span>}<span className="registration top-3 right-3 z-10" />
        <div className="h-[340px] sm:h-[480px] print-frame"><Art kind={a.art} /></div></div>
      <article className="paper p-6 self-start relative">
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/20 pb-2">Artifact · {a.kind} · No. {String(i + 1).padStart(2, '0')}</div>
        <h1 className="font-serif text-5xl sm:text-6xl leading-none mt-4">{a.title}</h1>
        <dl className="grid grid-cols-[90px_1fr] gap-y-1 font-mono text-xs mt-5">
          <dt className="uppercase text-ink/60">Year</dt><dd><Link className="underline" to={`/gallery?year=${a.year}`}>{a.year}</Link></dd>
          <dt className="uppercase text-ink/60">Medium</dt><dd><Link className="underline" to={`/gallery?medium=${encodeURIComponent(mediumOf(a))}`}>{a.medium}</Link></dd>
          {a.series && <><dt className="uppercase text-ink/60">Series</dt><dd>{a.series}</dd></>}
        </dl>
        {a.description && <p className="font-display text-lg leading-snug mt-5">{a.description}</p>}
        <div className="font-mono text-[11px] uppercase mt-6 mb-2">Tags</div>
        <div className="flex flex-wrap gap-1.5">{a.tags.map(t => <Link key={t} to={`/gallery?tag=${encodeURIComponent(t)}`} className="chip">{t}</Link>)}</div>
        <nav className="flex justify-between gap-2 mt-8 pt-4 border-t border-ink/20 font-mono text-xs">
          <Link to={`/gallery/${prev.id}${search}`} className="chip">← {prev.title}</Link><Link to={`/gallery/${next.id}${search}`} className="chip">{next.title} →</Link></nav>
        <p className="font-mono text-[9px] text-ink/50 mt-4">Fictional sample entry · static JSON.</p>
      </article></main></div></>
}
