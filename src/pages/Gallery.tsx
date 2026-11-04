import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Clips from '../components/Clips'
import Art, { Flower, EdgeBotanical, MarbleBlob } from '../components/Art'
import MobileNav from '../components/MobileNav'
import { SiteHeader } from '../components/Nav'
import { artifacts, TABS, TAGS, YEARS, mediumOf, readFilters, filterArtifacts, type Filters } from '../lib/gallery'
const tagColor:Record<string,string>={NEW:'bg-cornflower text-paper',SERIES:'bg-sunflower',ARCHIVE:'bg-wine text-paper',MOTION:'bg-lime'}
export default function Gallery(){
  const [params,setParams]=useSearchParams();const f=readFilters(params);const {tab,q,tag,medium,year}=f
  const set=(k:keyof Filters,v:string)=>setParams(p=>{const n=new URLSearchParams(p);if(!v||(k==='tab'&&v==='All'))n.delete(k);else n.set(k,v);return n},{replace:k==='q'})
  const toggle=(k:keyof Filters,v:string)=>set(k,f[k]===v?'':v)
  const view=params.get('view');const list=view==='list';const setList=(l:boolean)=>set('view' as keyof Filters,l?'list':'')
  const [sheet,setSheet]=useState(false)
  const items=useMemo(()=>filterArtifacts({tab,q,tag,medium,year}),[tab,q,tag,medium,year])
  const active=[tag&&['tag',tag],medium&&['medium',medium],year&&['year',year],q&&['q',`“${q}”`],tab!=='All'&&['tab',tab]].filter(Boolean) as [keyof Filters,string][]
  const qs=params.toString()
  const mediums=Object.entries(artifacts.reduce<Record<string,number>>((m,a)=>{const k=mediumOf(a);m[k]=(m[k]||0)+1;return m},{}))
  return <><MobileNav/><div className="min-h-screen max-w-[1440px] mx-auto relative overflow-hidden">
    <svg className="hidden lg:block absolute -left-24 top-48 w-44" viewBox="0 0 100 300" aria-hidden><path d="M10 0 C90 20 100 120 60 160 C20 200 90 260 40 300 H0 V0Z" fill="#3B6FF0"/></svg><EdgeBotanical className="hidden xl:block absolute -right-10 top-28 w-36 pointer-events-none"/><MarbleBlob className="hidden lg:block absolute -left-12 bottom-40 w-32 pointer-events-none"/><div className="hidden lg:block absolute left-4 top-20 w-14 h-56 pointer-events-none" style={{backgroundImage:"repeating-linear-gradient(-45deg,#F7F6F2 0 6px,transparent 6px 14px)"}}/>
    <SiteHeader/>
    <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6 px-4 lg:px-8 py-4 lg:py-6 relative z-10">
      <aside className={`paper p-4 self-start text-sm lg:block ${sheet?"fixed inset-x-3 bottom-3 top-24 z-50 overflow-y-auto block":"hidden"}`}><Clips/>
        <button onClick={()=>setSheet(false)} className="lg:hidden btn bg-ink text-paper w-full mb-3 text-xs uppercase">Close filters ✕</button>
        <div className="font-mono text-[11px] uppercase tracking-widest border-b border-ink/20 pb-2">Explore the collection</div>
        <div className="font-mono text-[11px] uppercase mt-4 mb-2">Tags</div><div className="flex flex-wrap gap-1.5">{TAGS.map(t=><button key={t} onClick={()=>toggle('tag',t)} aria-pressed={tag===t} className={`chip ${tag===t?'on':''}`}>{t}</button>)}</div>
        <div className="font-mono text-[11px] uppercase mt-5 mb-2">Medium</div>{mediums.map(([m,n])=><button key={m} onClick={()=>toggle('medium',m)} aria-pressed={medium===m} className={`w-full flex justify-between font-mono text-xs py-0.5 px-1 rounded ${medium===m?'bg-ink text-paper':''}`}><span>{m}</span><span>{n}</span></button>)}
        <div className="font-mono text-[11px] uppercase mt-5 mb-2">Collections</div>{['Origination Series','Field Notes','Print-born Interfaces','Ephemera'].map(m=><div key={m} className="font-mono text-xs py-0.5">{m}</div>)}
        <div className="font-mono text-[11px] uppercase mt-5 mb-2">Year</div><div className="flex flex-wrap gap-1.5">{YEARS.map(y=><button key={y} onClick={()=>toggle('year',String(y))} aria-pressed={year===String(y)} className={`chip ${year===String(y)?'on':''}`}>{y}</button>)}</div>
        {active.length>0&&<button onClick={()=>setParams(view?{view}:{})} className="btn bg-cherry text-paper w-full mt-5 text-xs uppercase">Clear filters ✕</button>}</aside>
      <main>
        <div className="flex items-end justify-between gap-4"><div><h1 className="font-serif text-[64px] sm:text-[96px] leading-none text-paper">Gallery</h1><p className="font-mono text-xs text-paper/75 max-w-md mt-2">A living archive of print-born experiments, interfaces, and visual artifacts. Sample entries — static JSON.</p>{active.length>0&&<div className="flex flex-wrap gap-1.5 mt-3">{active.map(([k,v])=><button key={k} onClick={()=>set(k,'')} className="tag bg-sunflower text-ink">{k} · {v} ✕</button>)}</div>}</div>
          <svg viewBox="0 0 220 120" className="hidden md:block w-64 shrink-0"><Flower x={60} y={55} r={40} c="#F7F6F2"/><circle cx="150" cy="40" r="22" fill="#D54545"/><g stroke="#F7F6F2" strokeWidth=".7">{Array.from({length:8}).map((_,i)=><line key={i} x1={130+i*10} y1="60" x2={130+i*10} y2="120"/>)}</g></svg></div>
        <button onClick={()=>setSheet(true)} className="lg:hidden btn bg-paper w-full mt-4 text-xs uppercase tracking-widest">☰ Explore the collection · filters</button>
        <div className="paper p-2 flex flex-wrap lg:flex-nowrap items-center gap-2 mt-4"><div className="flex gap-1 overflow-x-auto w-full lg:w-auto">{TABS.map(t=><button key={t} onClick={()=>set('tab',t)} className={`font-mono text-xs px-3 min-h-[44px] lg:min-h-0 lg:py-1.5 rounded-md whitespace-nowrap ${tab===t?'bg-ink text-paper':''}`}>{t}</button>)}</div>
          <span className="hidden xl:inline ml-auto font-mono text-[11px] border-l border-ink/20 pl-3">{items.length} / {artifacts.length} artifacts</span>
          <input value={q} onChange={e=>set('q',e.target.value)} aria-label="Search the gallery" placeholder="Search the gallery…" className="font-mono text-xs border-2 border-ink rounded-md px-3 min-h-[44px] lg:min-h-0 lg:py-1.5 bg-transparent flex-1 lg:flex-none lg:w-48 lg:ml-auto xl:ml-0"/>
          <button onClick={()=>setList(false)} className={`chip min-w-[44px] ${!list?'on':''}`}>▦</button><button onClick={()=>setList(true)} className={`chip min-w-[44px] ${list?'on':''}`}>≡</button></div>
        <div className={`mt-6 grid gap-5 ${list?'grid-cols-1':'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>{items.map(a=><article key={a.id} className={`paper overflow-hidden ${list?'flex':''}`}>{a.tag&&<span className={`tag absolute z-10 top-3 left-3 ${tagColor[a.tag]}`}>{a.tag}</span>}<span className="registration top-3 right-3 z-10"/>
          <div className={`${list?'w-32 sm:w-48 h-28 shrink-0':'h-48 lg:h-44'} print-frame`}><Art kind={a.art}/></div>
          <div className="p-3 flex-1"><h3 className="font-serif text-xl leading-tight"><Link to={`/gallery/${a.id}${qs?`?${qs}`:''}`} className="hover:underline">{a.title}</Link></h3><div className="font-mono text-[10px] text-ink/60">{a.year} · {a.medium}</div>
            <div className="flex justify-between items-center mt-3"><Link to={`/gallery/${a.id}${qs?`?${qs}`:''}`} className="chip uppercase tracking-wider">{a.cta} →</Link><span className="w-6 h-6 rounded-full border-2 border-ink grid place-items-center text-xs">✶</span></div></div></article>)}
          {items.length===0&&<div className="paper p-8 col-span-full text-center relative"><span className="registration top-3 right-3"/><div className="font-mono text-[11px] uppercase tracking-widest text-ink/60">Plate not found · 0 impressions</div><h2 className="font-serif text-4xl mt-2">Nothing pulled from the press.</h2><p className="font-mono text-xs text-ink/70 mt-2 max-w-md mx-auto">No sample artifacts match these filters. Loosen a tag, medium, or year — or start over with a clean stone.</p><button onClick={()=>setParams(view?{view}:{})} className="btn bg-sunflower mt-5 text-xs uppercase">Wipe the stone ↺</button></div>}</div>
      </main></div>{sheet&&<div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={()=>setSheet(false)}/>}</div></>}
