import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PressCycle from '../lab/press-cycle/PressCycle'
import type { PressCycleModeProp } from '../lab/press-cycle/model.ts'

export default function LabPressCycle() {
  const [params] = useSearchParams()
  const [sensors, setSensors] = useState<'off' | 'enhancement'>('off')
  const tParam = params.get('t')
  const modeParam = params.get('mode')
  const initialProgress = tParam === null ? 0 : Number(tParam)
  const presentationMode: PressCycleModeProp = modeParam === 'full' || modeParam === 'reduced' ? modeParam : 'auto'
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <article className="paper p-4 sm:p-6 max-w-3xl">
        <p className="font-mono text-[11px] flex gap-3">
          <Link to="/lab" className="underline">← lab</Link>
          <a className="underline" href="https://github.com/MelodicBloom/lithomemphis/pull/5">Draft spec PR #5</a>
        </p>
        <h1 className="font-display font-black text-4xl leading-none mt-3">Stamp → bleed → relief</h1>
        <p className="font-serif text-lg mt-2">
          Experimental lab specimen. Classification stays DEFER. The draft consumer spec is unmerged PR #5.
          Plate units are illustrative, not a calibrated press.
        </p>
        <div className="mt-4">
          <PressCycle
            key={`${initialProgress}-${presentationMode}-${sensors}`}
            seed={271828}
            initialProgress={initialProgress}
            presentationMode={presentationMode}
            sensors={sensors}
          />
        </div>
        <label className="mt-4 flex items-center gap-2 font-mono text-[11px] min-h-11">
          <input type="checkbox" checked={sensors === 'enhancement'} onChange={(event) => setSensors(event.target.checked ? 'enhancement' : 'off')} />
          Tilt sensor, optional enhancement
        </label>
        <p className="font-mono text-[11px] mt-2 max-w-xl">
          Off by default. Nothing on this plate requires a sensor, a pointer, or a running clock.
          Arrow keys, Home, End, Enter, and Space drive the focused plate. The scrubber is the plate-state seek.
        </p>
      </article>
    </main>
  )
}
