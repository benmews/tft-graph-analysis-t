/**
 * Styling regression tests.
 *
 * These guard against accidental theme flips (e.g. a CSS refactor swapping
 * the active :root tokens) and against the data→cytoscape color pipeline
 * silently breaking.
 */

import { test, expect, Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 720 } })

async function waitForGraph(page: Page) {
  await expect(page.getByText(/\d+ nodes/)).toBeVisible()
}

async function waitForCyNodes(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => (window as any).__cy?.nodes().length ?? 0))
    .toBeGreaterThan(0)
}

function parseRgb(value: string): [number, number, number] {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) throw new Error(`Unexpected color string: ${value}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/**
 * Browsers may return computed colors in their original color space (e.g. oklch()).
 * Resolve to rgb by painting into a hidden canvas — works for any CSS color string.
 */
async function colorToRgb(page: Page, cssColor: string): Promise<[number, number, number]> {
  const rgb = await page.evaluate((color) => {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const ctx = c.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return [r, g, b] as [number, number, number]
  }, cssColor)
  return rgb
}

test.describe('Theme background', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('body background renders as white (light theme is active)', async ({ page }) => {
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const [r, g, b] = await colorToRgb(page, bg)
    // --background is oklch(1 0 0) → pure white. Allow tiny rounding wiggle.
    expect(r).toBeGreaterThan(245)
    expect(g).toBeGreaterThan(245)
    expect(b).toBeGreaterThan(245)
  })
})

test.describe('Cytoscape node colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
    await waitForCyNodes(page)
  })

  test('every node carries a valid hex color in its data', async ({ page }) => {
    const colors: string[] = await page.evaluate(() =>
      (window as any).__cy.nodes().map((n: any) => n.data('color'))
    )
    expect(colors.length).toBeGreaterThan(0)
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  test('cytoscape applies node data color as the rendered background', async ({ page }) => {
    const sample: { dataColor: string; styleColor: string } = await page.evaluate(() => {
      const node = (window as any).__cy.nodes('[type="champion"]').first()
      return {
        dataColor: node.data('color'),
        styleColor: node.style('background-color'),
      }
    })
    // Cytoscape returns rgb(...) for the resolved style; compare against the hex from data.
    const [r, g, b] = parseRgb(sample.styleColor)
    const expected = sample.dataColor.toLowerCase()
    const actualHex =
      '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
    expect(actualHex).toBe(expected)
  })

  test('different champion costs produce different colors', async ({ page }) => {
    const distinctColors: number = await page.evaluate(() => {
      const colors = (window as any).__cy
        .nodes('[type="champion"]')
        .map((n: any) => n.data('color'))
      return new Set(colors).size
    })
    // The cost-based palette has at least 5 buckets (1g–5g).
    expect(distinctColors).toBeGreaterThanOrEqual(5)
  })
})
