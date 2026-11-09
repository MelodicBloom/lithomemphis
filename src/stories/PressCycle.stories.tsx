import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, userEvent, within } from 'storybook/test'
import PressCycle from '../lab/press-cycle/PressCycle'
import { formatProgress, snapshotProgress } from '../lab/press-cycle/model.ts'

const meta = {
  title: 'Lab/Press cycle',
  component: PressCycle,
  args: { seed: 271828, initialProgress: 0, presentationMode: 'full', showControls: true, autoplay: false, sensors: 'off' },
  parameters: { layout: 'centered' },
  decorators: [
    (Story, ctx) => (
      <div key={`${ctx.id}-${String(ctx.args.initialProgress)}-${String(ctx.args.presentationMode)}-${String(ctx.args.seed)}`}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PressCycle>
export default meta
type Story = StoryObj<typeof meta>

function plateIn(canvasElement: HTMLElement) {
  return within(canvasElement).getByRole('group', { name: /print press cycle/i })
}

/** Slider seek. Set the native value so React's input tracker sees the change. */
async function seek(canvasElement: HTMLElement, value: string) {
  const slider = within(canvasElement).getByRole('slider', { name: 'Plate progress' })
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setValue?.call(slider, value)
  await fireEvent.input(slider, { bubbles: true })
  await fireEvent.change(slider, { bubbles: true })
}

export const Nominal: Story = {
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const canvas = within(canvasElement)
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-phenomenon', 'idle')
    await expect(plate).toHaveAttribute('data-t', '0.0000')
    await expect(plate).toHaveAttribute('data-seed', '271828')
    await userEvent.click(canvas.getByRole('button', { name: 'Replay press cycle' }))
    await expect(plate).toHaveAttribute('data-playing', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'Pause press cycle' }))
    await expect(plate).toHaveAttribute('data-playing', 'false')
    await seek(canvasElement, '0.02')
    await expect(plate).toHaveAttribute('data-t', '0.0200')
    await expect(plate).toHaveAttribute('data-phenomenon', 'idle')
    document.body.dataset.pressPlay = 'done'
  },
}

export const Lensing: Story = {
  args: { initialProgress: 0.25 },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-phenomenon', 'lensing')
    await seek(canvasElement, '0.2')
    await expect(plate).toHaveAttribute('data-t', '0.2000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'lensing')
    document.body.dataset.pressPlay = 'done'
  },
}

export const Impressed: Story = {
  name: 'Pressed / impressed',
  args: { initialProgress: 0.43 },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-phenomenon', 'impressed')
    await seek(canvasElement, '0.4')
    await expect(plate).toHaveAttribute('data-t', '0.4000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'impressed')
    document.body.dataset.pressPlay = 'done'
  },
}

export const Bleeding: Story = {
  args: { initialProgress: 0.63 },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-phenomenon', 'bleeding')
    await expect(plate).toHaveAttribute('data-render-t', formatProgress(snapshotProgress('bleeding')))
    await seek(canvasElement, '0.55')
    await expect(plate).toHaveAttribute('data-t', '0.5500')
    await expect(plate).toHaveAttribute('data-phenomenon', 'bleeding')
    document.body.dataset.pressPlay = 'done'
  },
}

export const Relief: Story = {
  name: 'Relief / drifting',
  args: { initialProgress: 0.87 },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-phenomenon', 'drifting')
    await seek(canvasElement, '0.8')
    await expect(plate).toHaveAttribute('data-t', '0.8000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'drifting')
    document.body.dataset.pressPlay = 'done'
  },
}

export const Reduced: Story = {
  args: { initialProgress: 0.52, presentationMode: 'reduced' },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const canvas = within(canvasElement)
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-mode', 'reduced')
    await expect(plate).toHaveAttribute('data-phenomenon', 'bleeding')
    await expect(plate).toHaveAttribute('data-t', '0.5200')
    await expect(plate).toHaveAttribute('data-render-t', '0.6300')
    await expect(plate).toHaveAttribute('data-playing', 'false')
    await userEvent.click(canvas.getByRole('button', { name: 'Replay press cycle' }))
    await expect(plate).toHaveAttribute('data-phenomenon', 'idle')
    await expect(plate).toHaveAttribute('data-mode', 'reduced')
    await expect(plate).toHaveAttribute('data-playing', 'false')
    await expect(plate).toHaveAttribute('data-t', '0.0000')
    document.body.dataset.pressPlay = 'done'
  },
}

export const EdgeLow: Story = {
  name: 'Edge below 0',
  args: { initialProgress: -0.4 },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-t', '0.0000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'idle')
    await seek(canvasElement, '0.02')
    await expect(plate).toHaveAttribute('data-t', '0.0200')
    document.body.dataset.pressPlay = 'done'
  },
}

export const EdgeHigh: Story = {
  name: 'Edge above 1',
  args: { initialProgress: 4 },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-t', '1.0000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'drifting')
    await seek(canvasElement, '0')
    await expect(plate).toHaveAttribute('data-t', '0.0000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'idle')
    document.body.dataset.pressPlay = 'done'
  },
}

export const EdgeNaN: Story = {
  name: 'Edge NaN',
  args: { initialProgress: Number.NaN },
  play: async ({ canvasElement }) => {
    document.body.dataset.pressPlay = 'running'
    const plate = plateIn(canvasElement)
    await expect(plate).toHaveAttribute('data-t', '0.0000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'idle')
    await seek(canvasElement, '1')
    await expect(plate).toHaveAttribute('data-t', '1.0000')
    await expect(plate).toHaveAttribute('data-phenomenon', 'drifting')
    document.body.dataset.pressPlay = 'done'
  },
}
