import type { Meta, StoryObj } from '@storybook/react-vite'
import { demos } from '../lab/demos'
import { Button, Switch, Tabs } from '../components/ui'
import { useState } from 'react'
const meta: Meta = { title: 'Lab/Gallery cards', parameters: { layout: 'padded' } }
export default meta
const pick = (id: string): StoryObj => { const d = demos.find(x => x.id === id)!; return { name: d.title, render: () => <div className="paper p-3" style={{ width: 340 }}><h3 className="font-display font-black">{d.title}</h3><div className="lm-demo__stage"><d.Stage /></div></div> } }
export const Riso = pick('riso'); export const TapScore = pick('tap-score'); export const Offer = pick('offer'); export const StampMeter = pick('stamp-meter'); export const Peel = pick('peel'); export const Bento = pick('bento')
export const UIKit: StoryObj = { name: 'ui · Button/Switch/Tabs', render: () => { const [on, setOn] = useState(true); const [t, setT] = useState<'a' | 'b' | 'c'>('a')
  return <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Button>paper</Button><Button variant="ink">ink</Button><Button variant="accent">accent</Button><Switch label="demo" checked={on} onChange={setOn} /><Tabs label="t" value={t} onChange={setT} items={['a', 'b', 'c'] as const} /></div> } }
