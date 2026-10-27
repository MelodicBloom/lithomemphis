import type { Meta, StoryObj } from '@storybook/react-vite'
import SpringPressable from '../components/SpringPressable'
const meta = { title: 'Primitives/SpringPressable', component: SpringPressable, args: { children: 'PRESS ME', preset: 'squish', squish: 0.14, className: 'lm-btn lm-btn--accent lm-btn--md' },
  argTypes: { preset: { control: 'select', options: ['snappy', 'squish', 'wobbly', 'gentle'] }, squish: { control: { type: 'range', min: 0, max: 0.4, step: 0.02 } } } } satisfies Meta<typeof SpringPressable>
export default meta
export const Default: StoryObj<typeof meta> = {}
export const Wobbly: StoryObj<typeof meta> = { args: { preset: 'wobbly', squish: 0.25 } }
export const CustomPhysics: StoryObj<typeof meta> = { args: { config: { stiffness: 900, damping: 8 } } }
