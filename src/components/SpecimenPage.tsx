import type { ReactNode } from 'react'
import MobileNav from './MobileNav'
import { SiteHeader } from './Nav'
import { EdgeBotanical } from './Art'
export default function SpecimenPage({ title, kicker, intro, children }: { title: string; kicker: string; intro: ReactNode; children: ReactNode }) {
  return <><MobileNav /><div className="min-h-screen max-w-[1440px] mx-auto relative overflow-hidden">
    <EdgeBotanical className="hidden xl:block absolute -right-10 top-28 w-36 pointer-events-none" />
    <SiteHeader />
    <main className="px-4 lg:px-8 py-6 relative z-10">
      <div className="font-mono text-[11px] uppercase tracking-widest text-paper/60">{kicker}</div>
      <h1 className="font-serif text-[64px] sm:text-[96px] leading-none text-paper">{title}</h1>
      <div className="font-mono text-xs text-paper/75 max-w-xl mt-2">{intro}</div>
      <div className="mt-8">{children}</div>
      <p className="font-mono text-[10px] text-paper/45 mt-10">Wave 2 specimen page · fictional sample content · no accounts, no live data.</p>
    </main></div></>
}
