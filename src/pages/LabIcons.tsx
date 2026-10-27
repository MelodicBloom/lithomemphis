import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { iconPaths, type IconName } from '../components/Icon'
import { Tabs } from '../components/ui'
export default function LabIcons() {
  const [finish, setFinish] = useState<'clean' | 'bleed' | 'stamp'>('bleed'), [size, setSize] = useState(48), [copied, setCopied] = useState('')
  return <div className="min-h-screen p-4 sm:p-8"><div className="paper p-6 max-w-5xl mx-auto">
    <Link to="/lab" className="font-mono text-[10px] underline">← lab</Link>
    <h1 className="font-display font-black text-4xl">Stamp icon set <span className="font-serif italic font-normal">· {Object.keys(iconPaths).length} glyphs</span></h1>
    <div className="flex flex-wrap gap-4 items-center my-4"><Tabs label="finish" value={finish} onChange={setFinish} items={['clean', 'bleed', 'stamp'] as const} />
      <label className="font-mono text-xs flex gap-2">size<input type="range" min={16} max={96} value={size} onChange={e => setSize(+e.target.value)} />{size}px</label></div>
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' }}>{(Object.keys(iconPaths) as IconName[]).map(n =>
      <button key={n} className="paper !shadow-[3px_3px_0_#0E0E0E] p-4 flex flex-col items-center gap-2 cursor-copy" onClick={() => { navigator.clipboard?.writeText(`<Icon name="${n}" finish="${finish}" />`); setCopied(n) }}>
        <Icon name={n} size={size} finish={finish} /><span className="font-mono text-[11px]">{copied === n ? 'copied ✓' : n}</span></button>)}</div>
    <p className="font-mono text-[11px] mt-4">Usage: <code>{'<Icon name="stamp" finish="bleed" size={24} />'}</code> — mount <code>{'<InkDefs/>'}</code> once.</p></div></div>
}
