import { useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Clips from '../components/Clips'
import Art, { Flower } from '../components/Art'
import { Logo, SpecimenBadge } from '../components/Nav'
import artifacts from '../data/artifacts.json'
const TABS=['All','New Works','Editorial','Objects','Motion','Archives']
const TAGS=['Abstract','Botanical','Editorial','Geometric','Texture','Poster','Object','Experimental','Monochrome','Color Field']
const tabMatch=(t:string,a:typeof artifacts[number])=>t==='All'||(t==='New Works'&&a.tag==='NEW')||(t==='Editorial'&&a.kind==='Editorial')||(t==='Objects'&&a.kind==='Object')||(t==='Motion'&&a.kind==='Motion')||(t==='Archives'&&a.kind==='Archive')
const tagColor:Record<string,string>={NEW:'bg-cornflower text-paper',SERIES:'bg-sunflower',ARCHIVE:'bg-wine text-paper',MOTION:'bg-lime'}
export default function Gallery(){
  const [tab,setTab]=useState('All');const [q,setQ]=useState('');const [tag,setTag]=useState('Abstract');const [list,setList]=useState(false)
  const items=useMemo(()=>artifacts.filter(a=>tabMatch(tab,a)&&a.title.toLowerCase().includes(q.toLowerCase())),[tab,q])
  const mediums=Object.entries(artifacts.reduce<Record<string,number>>((m,a)=>{const k=a.medium.split(' ·')[0];m[k]=(m[k]||0)+1;return m},{}))
  return <div className="min-h-screen max-w-[1440px] mx-auto relative overflow-hidden">
    <svg className="absolute -left-10 top-40 w-40 opacity-90" viewBox="0 0 100 300"><path d="M0 0 H90 V300 H0Z" fill="#3B6FF0"/></svg>
    <header className="flex items-center gap-6 px-8 py-4 border-b border-paper/15 relative z-10"><Link to="/"><Logo/></Link>
      <nav className="flex gap-2 mx-auto font-mono text-xs uppercase">{[['/','Home'],['/gallery','Gallery']].map(([to,l])=><NavLink key={to} to={to} end className={({isActive})=>`px-4 py-2 rounded-md border-2 ${isActive?'bg-paper text-ink border-ink shadow-[3px_3px_0_#000]':'text-paper border-transparent'}`}>{l}</NavLink>)}{['Archive','Community','Shop','About'].map(l=><span key={l} className="px-4 py-2 text-paper/35" title="Wave 2">{l}</span>)}</nav><SpecimenBadge/></header>
    <div className="grid grid-cols-[230px_1fr] gap-6 px-8 py-6 relative z-10">
      <aside className="paper p-4 self-start text-sm"><Clips/>
        <div className="font-mono text-[11px] uppercase tracking-widest border-b border-ink/20 pb-2">Explore the collection</div>
        <div className="font-mono text-[11px] uppercase mt-4 mb-2">Tags</div><div className="flex flex-wrap gap-1.5">{TAGS.map(t=><button key={t} onClick={()=>setTag(t)} className={`chip ${tag===t?'on':''}`}>{t}</button>)}</div>
        <div className="font-mono text-[11px] uppercase mt-5 mb-2">Medium</div>{mediums.map(([m,n])=><div key={m} className="flex justify-between font-mono text-xs py-0.5"><span>{m}</span><span>{n}</span></div>)}
        <div className="font-mono text-[11px] uppercase mt-5 mb-2">Collections</div>{['Origination Series','Field Notes','Print-born Interfaces','Ephemera'].map(m=><div key={m} className="font-mono text-xs py-0.5">{m}</div>)}
        <div className="font-mono text-[11px] uppercase mt-5 mb-2">Year</div><div className="h-1 bg-ink rounded relative"><span className="absolute -top-1.5 left-0 w-4 h-4 rounded-full bg-paper border-2 border-ink"/><span className="absolute -top-1.5 right-0 w-4 h-4 rounded-full bg-paper border-2 border-ink"/></div><div className="flex justify-between font-mono text-[10px] mt-2"><span>2016</span><span>2024</span></div>
        <p className="font-mono text-[9px] text-ink/50 mt-4">Tag &amp; year filters are visual chrome in this specimen.</p></aside>
      <main>
        <div className="flex items-end justify-between"><div><h1 className="font-serif text-[96px] leading-none text-paper">Gallery</h1><p className="font-mono text-xs text-paper/75 max-w-md mt-2">A living archive of print-born experiments, interfaces, and visual artifacts. Sample entries — static JSON.</p></div>
          <svg viewBox="0 0 220 120" className="w-64"><Flower x={60} y={55} r={40} c="#F7F6F2"/><circle cx="150" cy="40" r="22" fill="#D54545"/><g stroke="#F7F6F2" strokeWidth=".7">{Array.from({length:8}).map((_,i)=><line key={i} x1={130+i*10} y1="60" x2={130+i*10} y2="120"/>)}</g></svg></div>
        <div className="paper p-2 flex items-center gap-2 mt-4">{TABS.map(t=><button key={t} onClick={()=>setTab(t)} className={`font-mono text-xs px-3 py-1.5 rounded-md ${tab===t?'bg-ink text-paper':''}`}>{t}</button>)}
          <span className="ml-auto font-mono text-[11px] border-l border-ink/20 pl-3">Sort: Date, new → old</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search the gallery…" className="font-mono text-xs border-2 border-ink rounded-md px-3 py-1.5 bg-transparent w-48"/>
          <button onClick={()=>setList(false)} className={`chip ${!list?'on':''}`}>▦</button><button onClick={()=>setList(true)} className={`chip ${list?'on':''}`}>≡</button></div>
        <div className={`mt-6 grid gap-5 ${list?'grid-cols-1':'grid-cols-4'}`}>{items.map(a=><article key={a.id} className={`paper overflow-hidden ${list?'flex':''}`}>{a.tag&&<span className={`absolute z-10 top-2 left-2 font-mono text-[10px] px-1.5 border border-ink rounded ${tagColor[a.tag]}`}>{a.tag}</span>}
          <div className={`${list?'w-48 h-28':'h-44'} border-b-2 border-ink`}><Art kind={a.art}/></div>
          <div className="p-3 flex-1"><h3 className="font-serif text-xl leading-tight">{a.title}</h3><div className="font-mono text-[10px] text-ink/60">{a.year} · {a.medium}</div>
            <div className="flex justify-between items-center mt-3"><span className="chip">{a.cta} →</span><span className="w-6 h-6 rounded-full border-2 border-ink grid place-items-center text-xs">✶</span></div></div></article>)}
          {items.length===0&&<p className="font-mono text-paper col-span-4">No sample artifacts match.</p>}</div>
      </main></div></div>}
