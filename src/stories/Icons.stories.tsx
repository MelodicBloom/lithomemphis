import type { Meta, StoryObj } from '@storybook/react-vite'
import Icon, { iconPaths } from '../components/Icon'
import OfferChip from '../components/OfferChip'
const meta = { title: 'Iconography/Icon', component: Icon, args: { name: 'stamp', size: 48, finish: 'bleed' },
  argTypes: { name: { control: 'select', options: Object.keys(iconPaths) }, finish: { control: 'radio', options: ['clean', 'bleed', 'stamp'] } } } satisfies Meta<typeof Icon>
export default meta
export const Single: StoryObj<typeof meta> = {}
export const Set: StoryObj<typeof meta> = { render: a => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 64px)', gap: 12 }}>{Object.keys(iconPaths).map(n => <div key={n} style={{ textAlign: 'center', fontFamily: 'Space Mono', fontSize: 10 }}><Icon {...a} name={n as never} /><div>{n}</div></div>)}</div> }
export const Offers: StoryObj<typeof meta> = { render: () => <div style={{ display: 'flex', gap: 10 }}><OfferChip kind="commission">Commission</OfferChip><OfferChip kind="specimen">Specimen</OfferChip><OfferChip kind="kit">Kit</OfferChip></div> }
