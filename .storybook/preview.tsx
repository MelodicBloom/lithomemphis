import type { Preview } from '@storybook/react-vite'
import '../src/index.css'
import '../src/styles/tokens.css'
import '../src/styles/lab.css'
import { InkDefs } from '../src/components/Icon'
const preview: Preview = {
  parameters: { backgrounds: { options: { paper: { name: 'paper', value: '#F7F6F2' }, press: { name: 'press', value: '#1a1916' } } }, layout: 'centered' },
  initialGlobals: { backgrounds: { value: 'paper' } },
  decorators: [Story => <><InkDefs /><Story /></>],
}
export default preview
