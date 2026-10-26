import { Link } from 'react-router-dom'
import Sidebar, { SpecimenBadge } from '../components/Nav'
import Clips from '../components/Clips'
import Art, { HeroCollage, Flower, EdgeBotanical, MarbleBlob } from '../components/Art'
import MobileNav from '../components/MobileNav'
import artifacts from '../data/artifacts.json'
import { palette } from '../tokens'
export default function Home(){
  return <><MobileNav/><div className="min-h-screen p-4 lg:p-5 flex gap-5 max-w-[1440px] mx-auto relative">
    <div className="hidden lg:flex"><Sidebar/></div>
    <main className="flex-1 flex flex-col gap-5 min-w-0">
      <header className="hidden lg:flex items-center gap-4"><div className="paper !rounded-full flex-1 px-5 py-2.5 font-mono text-sm text-ink/50">⌕ Search the collective (specimen — not wired)</div><SpecimenBadge/><Link to="/gallery" className="btn bg-cornflower text-paper px-5 py-2 text-sm">Open Gallery →</Link></header>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <section className="paper p-5 sm:p-7 overflow-hidden min-h-[340px] flex flex-col md:block"><Clips only={['tl','br']}/>
          <div className="order-2 md:absolute md:right-0 md:top-0 md:w-[58%] md:h-full h-64 -mx-2 mt-4 md:m-0"><HeroCollage/></div>
          <div className="relative md:max-w-[48%] order-1">
            <div className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-2"><span className="text-cherry">✶</span> Specimen prompt · demo content</div>
            <h1 className="font-display font-black text-[56px] sm:text-[76px] leading-[.86] tracking-tight mt-3">PRINT<br/>THE<br/>FUTURE</h1>
            <p className="font-mono text-xs uppercase mt-4 max-w-[260px]">Envision tomorrow. Then make it unmistakably yours.</p>
            <div className="flex flex-wrap gap-3 mt-6 items-center"><Link to="/gallery" className="btn bg-cornflower text-paper px-6 py-3 text-sm">Browse the archive →</Link><span className="font-mono text-[10px] text-ink/60">Submissions open in Wave 2</span></div>
          </div>
        </section>
        <aside className="ink-card p-5 flex flex-col"><div className="font-mono text-xs uppercase tracking-widest flex justify-between"><span>Featured studios</span><span className="text-paper/50">sample</span></div>
          <ol className="mt-4 flex flex-col gap-3">{['INKDRIFT','PAPIER NOIR','Studio Ardent','M3NOLITH','dot.exe'].map((n,i)=><li key={n} className="flex items-center gap-3 font-mono text-sm"><span className="w-4" style={{color:[palette.sunflower,palette.paper,palette.cherry,palette.paper,palette.paper][i]}}>{i+1}</span><span className="w-8 h-8 rounded-full marble border border-paper/40"/><span className="flex-1">{n}</span><span className="text-paper/40">—</span></li>)}</ol>
          <p className="mt-auto font-mono text-[10px] text-paper/50 pt-4">Fictional studio names. Rankings &amp; scores are not computed in this specimen.</p></aside>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_300px] gap-4 lg:gap-5">
        {[['Community votes','—'],['Submissions this week','—'],['Active creators','—']].map(([l,v])=><div key={l} className="paper p-4"><div className="font-mono text-[10px] uppercase">{l}</div><div className="font-display text-4xl font-bold mt-1">{v}</div><div className="font-mono text-[10px] text-ink/50">Metric placeholder — no live data</div></div>)}
        <div className="paper p-4 flex items-center gap-3 overflow-hidden sm:col-span-3 xl:col-span-1"><span className="font-display text-5xl leading-none">“</span><p className="font-serif text-xl leading-tight flex-1">Great work thrives where bold minds play together.</p><svg viewBox="0 0 60 60" className="w-16 h-16 shrink-0"><circle cx="30" cy="30" r="28" fill={palette.lime} stroke={palette.ink} strokeWidth="2"/><Flower x={30} y={30} r={14}/></svg></div>
      </div>
      <section className="paper p-5"><div className="flex justify-between items-center"><h2 className="font-mono text-xs uppercase tracking-widest">From the archive · sample artifacts</h2><Link to="/gallery" className="chip min-h-[44px] px-3">View gallery →</Link></div>
        <div className="flex lg:grid lg:grid-cols-5 gap-4 mt-4 overflow-x-auto snap-x pb-3 -mx-1 px-1">{artifacts.slice(0,5).map((a,i)=><Link to="/gallery" key={a.id} className="paper !rounded-xl overflow-hidden block hover:-translate-y-0.5 transition shrink-0 w-56 lg:w-auto snap-start"><span className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-sunflower border-2 border-ink font-mono text-xs grid place-items-center">{i+1}</span><div className="h-36 print-frame"><Art kind={a.art}/></div><div className="p-2 font-mono text-[11px] flex justify-between"><span className="truncate">{a.title}</span><span className="text-ink/50">{a.year}</span></div></Link>)}</div></section>
      <footer className="font-mono text-[10px] text-paper/50 text-center pb-2">Lithomemphis specimen runtime · static content · no accounts, votes or challenges are implemented.</footer>
    </main>
    <EdgeBotanical className="hidden 2xl:block absolute -right-16 top-24 w-40 opacity-90 pointer-events-none"/><MarbleBlob className="hidden 2xl:block absolute -left-14 bottom-24 w-32 pointer-events-none"/></div></>}
