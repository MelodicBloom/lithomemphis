import type { Meta, StoryObj } from '@storybook/react-vite'
import BackdropSurface from '../components/BackdropSurface'
import GrainMask from '../components/GrainMask'
import LithoCard from '../components/LithoCard'
import ShaderCanvas from '../components/ShaderCanvas'
import Art from '../components/Art'
const meta: Meta = { title: 'Materials' }
export default meta
export const Backdrop: StoryObj<typeof BackdropSurface> = { render: a => <div style={{ position: 'relative', width: 360, height: 240 }}><Art kind="garden" />
  <BackdropSurface {...a} style={{ position: 'absolute', left: 24, right: 24, bottom: 20, padding: 14 }}><b className="font-serif text-xl">Glass that still prints.</b></BackdropSurface></div>,
  args: { variant: 'frost' }, argTypes: { variant: { control: 'radio', options: ['frost', 'smoke', 'vellum'] }, blur: { control: 'text' }, saturate: { control: 'number' } } }
export const Grain: StoryObj<typeof GrainMask> = { render: a => <GrainMask {...a}><div style={{ width: 320, height: 180, background: '#F7F6F2', border: '2px solid #0E0E0E', borderRadius: 14 }} /></GrainMask>,
  args: { frequency: 0.8, opacity: 0.45, fibers: true }, argTypes: { frequency: { control: { type: 'range', min: .1, max: 2, step: .05 } }, opacity: { control: { type: 'range', min: 0, max: 1, step: .05 } } } }
export const Specular: StoryObj<typeof LithoCard> = { render: a => <LithoCard {...a} className="p-6 w-72"><div className="font-display font-black text-3xl">Plate 04</div><div className="font-serif italic">hover to tilt</div></LithoCard>, args: { sheen: 'specular' }, argTypes: { sheen: { control: 'radio', options: ['specular', 'film', 'none'] } } }
export const Nacre: StoryObj<typeof LithoCard> = { ...Specular, args: { sheen: 'film' } }
export const Shader: StoryObj<typeof ShaderCanvas> = { render: a => <div style={{ width: 360, height: 220 }}><ShaderCanvas key={a.mode} {...a} /></div>, args: { mode: 'grain' }, argTypes: { mode: { control: 'radio', options: ['grain', 'film', 'dither'] } } }
