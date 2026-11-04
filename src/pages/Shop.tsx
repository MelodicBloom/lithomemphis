import Art from '../components/Art'
import Clips from '../components/Clips'
import SpecimenPage from '../components/SpecimenPage'
const EDITIONS = [
  { t: 'Flora Typica No. 7 — Edition', art: 'flora', ed: 'Edition of 20 · stone lithograph', s: 'Sold out', c: 'bg-wine text-paper' },
  { t: 'Signal / Noise Poster', art: 'signal', ed: 'Edition of 50 · 2-colour screen print', s: 'Inquire', c: 'bg-sunflower' },
  { t: 'Garden of Marks', art: 'garden', ed: 'Open proof · screen print', s: 'Specimen only', c: 'bg-lime' },
  { t: 'Field Notes Zine No. 23', art: 'book', ed: 'Riso zine · 24pp', s: 'Specimen only', c: 'bg-lime' },
]
export default function Shop() {
  return <SpecimenPage title="Shop" kicker="Editions & ephemera · specimen" intro="What a print shelf could look like. Nothing here is for sale — no cart, no checkout, no prices. Editions are fictional.">
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{EDITIONS.map(e => <article key={e.t} className="paper overflow-hidden relative"><Clips /><span className={`tag absolute z-10 top-3 left-3 ${e.c}`}>{e.s}</span><span className="registration top-3 right-3 z-10" />
      <div className="h-44 print-frame"><Art kind={e.art} /></div>
      <div className="p-3"><h2 className="font-serif text-xl leading-tight">{e.t}</h2><div className="font-mono text-[10px] text-ink/60">{e.ed}</div>
        <div className="flex justify-between items-center mt-3 font-mono text-xs"><span>Price —</span><button disabled className="chip opacity-60 cursor-not-allowed" title="No checkout in this specimen">{e.s === 'Inquire' ? 'Inquire (demo)' : e.s}</button></div></div></article>)}</div>
  </SpecimenPage>
}
