import { test, expect, Page } from '@playwright/test'

// Desktop viewport (default from config)
test.use({ viewport: { width: 1280, height: 720 } })

async function getCount(page: Page, pattern: RegExp): Promise<number> {
  const text = await page.getByText(pattern).textContent()
  return parseInt(text?.match(/\d+/)?.[0] ?? '0')
}

// Wait for the graph to finish initialising (status bar appears with a real count)
async function waitForGraph(page: Page) {
  await expect(page.getByText(/\d+ nodes/)).toBeVisible()
}

// ─── Page shell ──────────────────────────────────────────────────────────────

test.describe('Page shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('title is visible', async ({ page }) => {
    await expect(page.getByText('TFT Graph Analysis').first()).toBeVisible()
  })

  test('graph canvas container is present', async ({ page }) => {
    // Cytoscape mounts inside a touch-none div
    await expect(page.locator('.touch-none').first()).toBeVisible()
  })

  test('status bar shows positive node and edge counts', async ({ page }) => {
    const nodes = await getCount(page, /\d+ nodes/)
    const edges = await getCount(page, /\d+ edges/)
    expect(nodes).toBeGreaterThan(0)
    expect(edges).toBeGreaterThan(0)
  })

  test('TFT set selector has options', async ({ page }) => {
    const trigger = page.locator('header').getByRole('combobox').first()
    await trigger.click()
    // At least two sets should appear
    const items = page.getByRole('option')
    await expect(items.first()).toBeVisible()
    expect(await items.count()).toBeGreaterThanOrEqual(2)
    // Close
    await page.keyboard.press('Escape')
  })
})

// ─── Graph controls (desktop sidebar) ───────────────────────────────────────

test.describe('Graph controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('switching mode changes edge count and status label', async ({ page }) => {
    const edgesBefore = await getCount(page, /\d+ edges/)
    await expect(page.getByText('Bipartite graph')).toBeVisible()

    // Desktop header mode button
    await page.locator('header').getByRole('button', { name: /Bipartite/i }).click()

    await expect(page.getByText('Trait edge graph')).toBeVisible()
    const edgesAfter = await getCount(page, /\d+ edges/)
    expect(edgesAfter).not.toBe(edgesBefore)
  })

  test('switching layout mode works without crashing', async ({ page }) => {
    const nodesBefore = await getCount(page, /\d+ nodes/)

    await page.locator('header').getByRole('button', { name: /Spring/i }).click()
    // Button label should flip
    await expect(page.locator('header').getByRole('button', { name: /Hierarchical/i })).toBeVisible()

    // Node count must remain the same — only layout changes, not data
    const nodesAfter = await getCount(page, /\d+ nodes/)
    expect(nodesAfter).toBe(nodesBefore)
  })

  test('unlocking fixed layout reduces visible nodes to 15', async ({ page }) => {
    const nodesBefore = await getCount(page, /\d+ nodes/)
    expect(nodesBefore).toBeGreaterThan(15)

    // "Fixed Layout" button is active (variant=default) initially
    await page.locator('header').getByRole('button', { name: /Fixed Layout/i }).click()

    // With fixed layout off and no selection, visibleNodes is capped at 15
    await expect(page.getByText('15 nodes')).toBeVisible()
  })

  test('selecting a champion reduces visible nodes', async ({ page }) => {
    const nodesBefore = await getCount(page, /\d+ nodes/)

    // Click the first champion button in the sidebar (buttons with cost labels like "1g")
    const firstChampion = page.locator('aside').getByRole('button').filter({ hasText: /\dg/ }).first()
    await firstChampion.click()

    // Selection-based view shows only the neighborhood — much fewer nodes
    await expect(async () => {
      const nodesAfter = await getCount(page, /\d+ nodes/)
      expect(nodesAfter).toBeLessThan(nodesBefore)
      expect(nodesAfter).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })
  })

  test('Reset All restores all nodes', async ({ page }) => {
    const nodesBefore = await getCount(page, /\d+ nodes/)

    // Select a champion
    await page.locator('aside').getByRole('button').filter({ hasText: /\dg/ }).first().click()
    await expect(async () => {
      expect(await getCount(page, /\d+ nodes/)).toBeLessThan(nodesBefore)
    }).toPass({ timeout: 5000 })

    // Reset All is in the desktop header
    await page.locator('header').getByRole('button', { name: /Reset All/i }).click()

    await expect(async () => {
      expect(await getCount(page, /\d+ nodes/)).toBe(nodesBefore)
    }).toPass({ timeout: 5000 })
  })

  test('unchecking a cost filter reduces node count', async ({ page }) => {
    const nodesBefore = await getCount(page, /\d+ nodes/)

    // "1g" checkbox label in the sidebar
    await page.locator('aside').getByLabel('1g').click()

    await expect(async () => {
      expect(await getCount(page, /\d+ nodes/)).toBeLessThan(nodesBefore)
    }).toPass({ timeout: 5000 })
  })

  test('selected champion appears in Selected Champions card', async ({ page }) => {
    await expect(page.locator('aside').getByText('No champions selected')).toBeVisible()

    await expect(page.locator('aside').getByText('No champions selected')).toBeVisible()

    await page.locator('aside').getByRole('button').filter({ hasText: /\dg/ }).first().click()

    // "No champions selected" should disappear once any champion is selected
    await expect(page.locator('aside').getByText('No champions selected')).not.toBeVisible()
  })
})
