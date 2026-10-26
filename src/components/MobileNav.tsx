import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
const NAV=[['/','Home'],['/gallery','Gallery']] as const
const SOON=['Challenges','Collectives','Activity','Messages']
const ACTIONS:[string,string][]=[['+ Create',''],['⇧ Upload',''],['Studio Live','text-cherry'],['○ Feedback',''],['∘ Invite','']]
export default function MobileNav(){
  const [open,setOpen]=useState(false)
  useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow=''}},[open])
  return <div className="lg:hidden sticky top-0 z-40 px-4 pt-4 pb-2 dotgrid bg-[#efe9dc]">
    <div className="flex items-center justify-between bg-paper border-[2.5px] border-ink rounded-full pl-6 pr-2 py-2 shadow-[4px_5px_0_rgba(14,14,14,.35)]">
      <span className="font-mono font-bold tracking-[.25em] text-sm">LITHOMEMPHIS</span>
      <button aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(!open)} className="w-12 h-12 rounded-full bg-ink text-paper text-xl grid place-items-center shadow-[2px_3px_0_rgba(14,14,14,.4)]">{open?'✕':'≡'}</button></div>
    {open&&<div className="fixed inset-x-0 bottom-0 top-[88px] z-50 px-3 pb-3" onClick={()=>setOpen(false)}>
      <div className="h-full bg-[#141311] text-paper rounded-[26px] border-2 border-black p-6 flex flex-col overflow-y-auto shadow-[0_10px_30px_rgba(0,0,0,.5)]" onClick={e=>e.stopPropagation()}>
        <div className="font-display font-black text-3xl tracking-tight leading-none">LITHOMEMPHIS</div><div className="font-serif italic text-3xl">Collective</div>
        <span className="font-mono text-[10px] mt-2 self-start bg-sunflower text-ink px-2 py-0.5 rounded">SPECIMEN · STATIC DEMO</span>
        <hr className="border-paper/20 my-5"/>
        <nav className="flex flex-col gap-1">
          {NAV.map(([to,l])=><NavLink key={to} to={to} end onClick={()=>setOpen(false)} className={({isActive})=>`font-mono font-bold uppercase tracking-widest text-sm px-4 min-h-[48px] flex items-center gap-3 rounded-xl ${isActive?'bg-cornflower text-paper border-2 border-ink shadow-[3px_4px_0_#555]':'text-paper/90'}`}><span>✧</span>{l}</NavLink>)}
          {SOON.map(s=><span key={s} className="font-mono uppercase tracking-widest text-sm px-4 min-h-[48px] flex items-center gap-3 text-paper/35"><span>✧</span>{s}<span className="ml-auto text-[9px] border border-paper/30 rounded px-1">W2</span></span>)}</nav>
        <div className="mt-auto pt-5"><div className="bg-[#e9e6de] border-[3px] border-[#555] rounded-[22px] p-3 grid grid-cols-2 gap-2.5 shadow-[inset_0_2px_0_#fff]">
          {ACTIONS.map(([l,c],i)=><a key={l} href="#" onClick={e=>e.preventDefault()} className={`btn bg-paper ${c||"text-ink"} min-h-[48px] text-xs font-bold uppercase tracking-widest flex items-center justify-center ${i===2?'col-span-2 ring-4 ring-cherry/20':''}`}>{l}</a>)}</div>
          <p className="font-mono text-[10px] text-paper/45 mt-3 text-center">Actions are specimen UI — not wired.</p></div>
      </div></div>}
  </div>}
