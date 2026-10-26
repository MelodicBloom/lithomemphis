import { NavLink } from 'react-router-dom'
export function Logo({light=true}:{light?:boolean}){return <div className={light?'text-paper':'text-ink'}><div className="font-display font-black tracking-tight text-[22px] leading-none">LITHOMEMPHIS</div><div className="font-serif italic text-[22px] -mt-1">Collective</div></div>}
export function SpecimenBadge(){return <span className="font-mono text-[10px] uppercase tracking-widest bg-sunflower text-ink border-2 border-ink rounded px-2 py-0.5">Specimen · static demo</span>}
export default function Sidebar(){
  const items=[['/','Home','⌂'],['/gallery','Gallery','▦']] as const
  const soon=['Challenges','Votes','Leaderboard','Profile']
  return <aside className="ink-card p-5 flex flex-col gap-6 w-56 shrink-0 overflow-hidden">
    <Logo/><p className="font-mono text-[10px] tracking-widest text-paper/70 -mt-4">PRINT · STUDY · REMIX</p>
    <nav className="flex flex-col gap-1">{items.map(([to,l,i])=><NavLink key={to} to={to} end className={({isActive})=>`font-mono text-sm px-3 py-2 rounded-lg border-2 ${isActive?'bg-paper text-ink border-ink shadow-[3px_3px_0_#000]':'border-transparent text-paper/85 hover:bg-white/10'}`}><span className="mr-2">{i}</span>{l}</NavLink>)}
      {soon.map(s=><span key={s} className="font-mono text-sm px-3 py-2 text-paper/35 flex justify-between" title="Wave 2 — not built">{s}<span className="text-[9px] border border-paper/30 rounded px-1">W2</span></span>)}</nav>
    <div className="mt-auto relative h-36"><svg viewBox="0 0 160 140" className="absolute inset-0 w-full h-full opacity-80">{[0,1,2,3,4,5,6].map(i=><path key={i} d={`M80 140 Q${20+i*20} 70 ${10+i*24} ${10+(i%2)*20}`} stroke="#F7F6F2" strokeWidth="1" fill="none"/>)}<circle cx="80" cy="90" r="26" fill="#B08D57" stroke="#3b2c14" strokeWidth="2"/><text x="80" y="99" textAnchor="middle" fontFamily="Fraunces" fontSize="26" fontWeight="900" fill="#1b1306">L</text></svg></div>
    <div className="paper !shadow-none p-3 text-ink"><div className="font-mono text-[10px] uppercase">Specimen build</div><div className="font-serif text-lg leading-tight">No accounts. No live data.</div></div>
  </aside>}
