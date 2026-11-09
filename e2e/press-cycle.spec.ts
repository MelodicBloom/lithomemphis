import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

type IndexEntry = { id: string; title?: string; type?: string }

function pressCycleStoryIds(): string[] {
  const indexPath = fileURLToPath(new URL('../storybook-static/index.json', import.meta.url))
  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { entries: Record<string, IndexEntry> }
  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story' && entry.title === 'Lab/Press cycle')
    .map((entry) => entry.id)
    .sort()
}

async function openPlate(page: Page, t: string, mode?: 'full' | 'reduced') {
  await page.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference', colorScheme: 'light' })
  const query = new URLSearchParams({ t })
  if (mode) query.set('mode', mode)
  await page.goto(`/lab/press-cycle?${query.toString()}`)
  await page.evaluate(async () => { await document.fonts.ready })
  const root = page.getByTestId('press-cycle')
  await expect(root).toBeVisible()
  await expect(root).toHaveAttribute('data-seed', '271828')
  await expect(root).toHaveAttribute('data-progress', 'plate-state-scrub')
  await expect(root).toHaveAttribute('data-classification', 'DEFER')
  await expect(root).toHaveAttribute('data-playing', 'false')
  return root
}

test('smoke: experimental plate is idle and sensor-off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' })
  await page.goto('/lab/press-cycle')
  await expect(page.getByRole('heading', { name: 'Stamp → bleed → relief' })).toBeVisible()
  await expect(page.getByText(/classification stays DEFER/i)).toBeVisible()
  await expect(page.getByText(/not a calibrated press/i).first()).toBeVisible()
  const root = page.getByTestId('press-cycle')
  await expect(root).toHaveAttribute('data-phenomenon', 'idle')
  await expect(root).toHaveAttribute('data-playing', 'false')
  await expect(page.getByRole('checkbox', { name: /tilt sensor/i })).not.toBeChecked()
})

test.describe('fixed-progress stills', () => {
  const stills = [
    { name: 'plate-idle.png', t: '0', phenomenon: 'idle', inputT: '0.0000', renderT: '0.0000' },
    { name: 'plate-lensing.png', t: '0.25', phenomenon: 'lensing', inputT: '0.2500', renderT: '0.2500' },
    { name: 'plate-impressed.png', t: '0.43', phenomenon: 'impressed', inputT: '0.4300', renderT: '0.4300' },
    { name: 'plate-bleeding.png', t: '0.63', phenomenon: 'bleeding', inputT: '0.6300', renderT: '0.6300' },
    { name: 'plate-bleeding-edge.png', t: '0.52', phenomenon: 'bleeding', inputT: '0.5200', renderT: '0.5200' },
    { name: 'plate-drifting.png', t: '0.87', phenomenon: 'drifting', inputT: '0.8700', renderT: '0.8700' },
    { name: 'plate-edge-clamped.png', t: '2', phenomenon: 'drifting', inputT: '1.0000', renderT: '1.0000' },
  ] as const

  for (const still of stills) {
    test(still.name, async ({ page }) => {
      const root = await openPlate(page, still.t, 'full')
      await expect(root).toHaveAttribute('data-phenomenon', still.phenomenon)
      await expect(root).toHaveAttribute('data-mode', 'full')
      await expect(root).toHaveAttribute('data-t', still.inputT)
      await expect(root).toHaveAttribute('data-render-t', still.renderT)
      await expect(page.getByTestId('press-plate')).toHaveScreenshot(still.name, { maxDiffPixels: 0, threshold: 0 })
    })
  }

  test('plate-bleeding-reduced.png', async ({ page }) => {
    const root = await openPlate(page, '0.52', 'reduced')
    await expect(root).toHaveAttribute('data-phenomenon', 'bleeding')
    await expect(root).toHaveAttribute('data-mode', 'reduced')
    await expect(root).toHaveAttribute('data-t', '0.5200')
    await expect(root).toHaveAttribute('data-render-t', '0.6300')
    await expect(page.getByTestId('press-plate')).toHaveScreenshot('plate-bleeding-reduced.png', { maxDiffPixels: 0, threshold: 0 })
  })
})

test('reduced motion keeps the phenomenon and shows its still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.goto('/lab/press-cycle?t=0.52')
  await page.evaluate(async () => { await document.fonts.ready })
  const root = page.getByTestId('press-cycle')
  await expect(root).toHaveAttribute('data-mode', 'reduced')
  await expect(root).toHaveAttribute('data-phenomenon', 'bleeding')
  await expect(root).toHaveAttribute('data-t', '0.5200')
  await expect(root).toHaveAttribute('data-render-t', '0.6300')
  await expect(root).toHaveAttribute('data-playing', 'false')
  await expect(page.getByTestId('press-plate')).toHaveScreenshot('plate-reduced-motion.png', { maxDiffPixels: 0, threshold: 0 })
  await root.focus()
  await page.keyboard.press('ArrowRight')
  await expect(root).toHaveAttribute('data-t', '0.5400')
  await expect(root).toHaveAttribute('data-mode', 'reduced')
  await expect(root).toHaveAttribute('data-render-t', '0.6300')
  await expect(root).toHaveAttribute('data-playing', 'false')
  await page.getByRole('button', { name: 'Replay press cycle' }).click()
  await expect(root).toHaveAttribute('data-t', '0.0000')
  await expect(root).toHaveAttribute('data-phenomenon', 'idle')
  await expect(root).toHaveAttribute('data-playing', 'false')
})

test('keyboard reaches idle, impressed, and drifting without a timer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' })
  await page.goto('/lab/press-cycle?t=0&mode=full')
  const root = page.getByTestId('press-cycle')
  await page.getByRole('link', { name: '← lab' }).focus()
  await expect(page.getByRole('link', { name: '← lab' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Draft spec PR #5' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(root).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(root).toHaveAttribute('data-t', '0.0200')
  await page.keyboard.press('End')
  await expect(root).toHaveAttribute('data-phenomenon', 'drifting')
  await expect(root).toHaveAttribute('data-t', '1.0000')
  await page.keyboard.press('Home')
  await expect(root).toHaveAttribute('data-phenomenon', 'idle')
  await page.keyboard.press('Enter')
  await expect(root).toHaveAttribute('data-phenomenon', 'impressed')
  await expect(root).toHaveAttribute('data-t', '0.4300')
  await expect(root).toHaveAttribute('data-playing', 'false')
})

test('a11y partial: named controls, tab focus, 44px targets', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' })
  await page.goto('/lab/press-cycle?t=0&mode=full')
  await expect(page.getByRole('group', { name: 'Print press cycle: stamp, bleed, relief' })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Plate progress' })).toBeVisible()
  const replay = page.getByRole('button', { name: 'Replay press cycle' })
  const box = await replay.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
  expect(box?.width).toBeGreaterThanOrEqual(44)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: '← lab' })).toBeFocused()
})

test('pause holds t and a scrub seek stops playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' })
  await page.goto('/lab/press-cycle?t=0&mode=full')
  const root = page.getByTestId('press-cycle')
  await page.getByRole('button', { name: 'Replay press cycle' }).click()
  await expect(root).toHaveAttribute('data-playing', 'true')
  await expect.poll(async () => Number(await root.getAttribute('data-t'))).toBeGreaterThan(0.05)
  await page.getByRole('button', { name: 'Pause press cycle' }).click()
  await expect(root).toHaveAttribute('data-playing', 'false')
  const held = await root.getAttribute('data-t')
  await page.waitForTimeout(400)
  expect(await root.getAttribute('data-t')).toBe(held)

  await page.getByRole('button', { name: 'Replay press cycle' }).click()
  await expect(root).toHaveAttribute('data-playing', 'true')
  await page.getByRole('slider', { name: 'Plate progress' }).fill('0.25')
  await expect(root).toHaveAttribute('data-playing', 'false')
  await expect(root).toHaveAttribute('data-phenomenon', 'lensing')
  await expect(root).toHaveAttribute('data-t', '0.2500')
})

test('pointer dwell is monotonic and caps at the bleeding still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' })
  await page.goto('/lab/press-cycle?t=0&mode=full')
  const root = page.getByTestId('press-cycle')
  const plate = page.getByTestId('press-plate')
  const box = await plate.boundingBox()
  if (!box) throw new Error('plate has no box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(root).toHaveAttribute('data-phenomenon', 'impressed')
  await expect.poll(async () => root.getAttribute('data-t'), { timeout: 1500 }).toBe('0.6300')
  await page.waitForTimeout(240)
  expect(await root.getAttribute('data-t')).toBe('0.6300')
  await page.mouse.up()
  await page.waitForTimeout(240)
  expect(await root.getAttribute('data-t')).toBe('0.6300')
  await expect(root).toHaveAttribute('data-phenomenon', 'bleeding')
  await expect(root).toHaveAttribute('data-playing', 'false')
})

test('replay frame sample is measured, not a budget gate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' })
  await page.goto('/lab/press-cycle?t=0&mode=full')
  await expect(page.getByRole('button', { name: 'Replay press cycle' })).toBeVisible()
  const sample = await page.evaluate(async () => {
    const root = document.querySelector('[data-testid=press-cycle]')
    const button = document.querySelector('[aria-label="Replay press cycle"]')
    if (!(root instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) throw new Error('missing plate')
    const stamps: number[] = []
    const observer = new MutationObserver(() => stamps.push(performance.now()))
    observer.observe(root, { attributes: true, attributeFilter: ['data-t'] })
    const started = performance.now()
    button.click()
    await new Promise<void>((resolve) => {
      const watch = () => {
        if (root.getAttribute('data-t') === '1.0000' && root.getAttribute('data-playing') === 'false') resolve()
        else requestAnimationFrame(watch)
      }
      watch()
    })
    observer.disconnect()
    const finished = performance.now()
    return { updates: stamps.length, elapsedMs: finished - started, userAgent: navigator.userAgent }
  })
  expect(sample.updates).toBeGreaterThan(10)
  expect(sample.elapsedMs).toBeGreaterThan(500)
  expect(sample.elapsedMs).toBeLessThan(8000)
  console.log(`PERF_SAMPLE ${JSON.stringify({ ...sample, node: process.version, platform: process.platform, proposedPlaybackMs: 2400 })}`)
})

test('storybook play functions finish', async ({ page }) => {
  const ids = pressCycleStoryIds()
  expect(ids.length).toBeGreaterThanOrEqual(8)
  const logs: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') logs.push(msg.text()) })
  page.on('pageerror', (error) => logs.push(error.message))
  for (const id of ids) {
    logs.length = 0
    await page.goto(`http://127.0.0.1:6007/iframe.html?id=${id}&viewMode=story`)
    try {
      await page.waitForFunction(() => document.body.dataset.pressPlay === 'done', null, { timeout: 15_000 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(`${id} play did not finish\n${logs.join('\n')}\n${detail}`)
    }
    expect(logs, logs.join('\n')).toEqual([])
  }
})
