import { test, expect, Page } from '@playwright/test'

// Force mobile viewport for every test in this file
test.use({ viewport: { width: 412, height: 915 } })

async function waitForGraph(page: Page) {
  await expect(page.getByText(/\d+ nodes/)).toBeVisible()
}

// ─── Layout ──────────────────────────────────────────────────────────────────

test.describe('Mobile layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('desktop sidebar is hidden', async ({ page }) => {
    await expect(page.locator('aside')).not.toBeVisible()
  })

  test('desktop header section is hidden', async ({ page }) => {
    // The desktop header wraps everything in a hidden md:flex div
    // Verify the desktop set selector (w-[200px]) is not visible
    const desktopSelect = page.locator('header .hidden.md\\:flex')
    await expect(desktopSelect).not.toBeVisible()
  })

  test('mobile mode buttons are visible', async ({ page }) => {
    // Three mode/layout buttons appear in the mobile-only header
    await expect(page.getByRole('button', { name: /Bipartite/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Spring/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Fixed/i })).toBeVisible()
  })

  test('set selector is visible in mobile header', async ({ page }) => {
    await expect(page.getByRole('combobox')).toBeVisible()
  })

  test('status bar is visible', async ({ page }) => {
    await expect(page.getByText(/\d+ nodes/)).toBeVisible()
    await expect(page.getByText(/\d+ edges/)).toBeVisible()
  })
})

// ─── Controls drawer ─────────────────────────────────────────────────────────

test.describe('Controls drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('Controls button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Controls' })).toBeVisible()
  })

  test('tapping Controls opens the drawer', async ({ page }) => {
    await page.getByRole('button', { name: 'Controls' }).click()
    await expect(page.locator('#mobile-controls-sheet')).toBeVisible()
  })

  test('drawer contains the champion list', async ({ page }) => {
    await page.getByRole('button', { name: 'Controls' }).click()
    const drawer = page.locator('#mobile-controls-sheet')
    await expect(drawer).toBeVisible()
    // Champion buttons with cost badges should be inside the drawer
    await expect(drawer.getByRole('button').filter({ hasText: /\dg/ }).first()).toBeVisible()
  })

  test('drawer can be dismissed by swiping down handle', async ({ page }) => {
    await page.getByRole('button', { name: 'Controls' }).click()
    await expect(page.locator('#mobile-controls-sheet')).toBeVisible()

    // Tap outside (above the drawer) to dismiss
    await page.mouse.click(206, 100)

    await expect(page.locator('#mobile-controls-sheet')).not.toBeVisible({ timeout: 3000 })
  })

  test('selecting a champion inside drawer updates node count', async ({ page }) => {
    const nodesBefore = parseInt(
      (await page.getByText(/\d+ nodes/).textContent())?.match(/\d+/)?.[0] ?? '0'
    )

    await page.getByRole('button', { name: 'Controls' }).click()
    const drawer = page.locator('#mobile-controls-sheet')
    await expect(drawer).toBeVisible()
    // Wait for the vaul slide-up animation to finish
    await page.waitForTimeout(400)

    const firstChampion = drawer.getByRole('button').filter({ hasText: /\dg/ }).first()
    // vaul positions the drawer via CSS transform; headless Chromium reports the
    // element as outside the composited viewport even when the drawer is open.
    // Dispatch the click directly via JS to bypass the Playwright viewport check.
    await firstChampion.evaluate((el: HTMLElement) => el.click())

    // Close drawer so status bar is readable
    await page.mouse.click(206, 100)

    // Node count should decrease (selection-based view)
    await expect(async () => {
      const nodesAfter = parseInt(
        (await page.getByText(/\d+ nodes/).textContent())?.match(/\d+/)?.[0] ?? '0'
      )
      expect(nodesAfter).toBeLessThan(nodesBefore)
      expect(nodesAfter).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })
  })
})

// ─── Mobile mode switching ───────────────────────────────────────────────────

test.describe('Mobile mode and layout switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('mode toggle changes edge count', async ({ page }) => {
    const edgesBefore = parseInt(
      (await page.getByText(/\d+ edges/).textContent())?.match(/\d+/)?.[0] ?? '0'
    )
    await expect(page.getByText('Bipartite graph')).toBeVisible()

    await page.getByRole('button', { name: /Bipartite/i }).click()

    await expect(page.getByText('Trait edge graph')).toBeVisible()
    const edgesAfter = parseInt(
      (await page.getByText(/\d+ edges/).textContent())?.match(/\d+/)?.[0] ?? '0'
    )
    expect(edgesAfter).not.toBe(edgesBefore)
  })

  test('layout toggle flips button label', async ({ page }) => {
    await page.getByRole('button', { name: /Spring/i }).click()
    await expect(page.getByRole('button', { name: /Hier/i })).toBeVisible()
  })
})
