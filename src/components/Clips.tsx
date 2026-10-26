export default function Clips({only}:{only?:('tl'|'tr'|'bl'|'br')[]}){return <>{(only??['tl','tr','bl','br']).map(p=><span key={p} className={`clip ${p}`} aria-hidden/>)}</>}
