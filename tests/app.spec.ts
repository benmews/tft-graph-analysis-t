import { test, expect } from '@playwright/test'
import { getEdgeCount, getNodeCount, waitForGraph } from './helpers'

test.use({ viewport: { width: 1280, height: 720 } })

test.describe('Page shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('graph canvas container is present', async ({ page }) => {
    await expect(page.locator('.touch-none').first()).toBeVisible()
  })

  test('TFT set selector has options', async ({ page }) => {
    const trigger = page.locator('header').getByRole('combobox').first()
    await trigger.click()
    const items = page.getByRole('option')
    await expect(items.first()).toBeVisible()
    expect(await items.count()).toBeGreaterThanOrEqual(2)
    await page.keyboard.press('Escape')
  })
})

test.describe('Graph controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('switching mode changes edge count', async ({ page }) => {
    const edgesBefore = await getEdgeCount(page)
    await page.locator('header').getByRole('button', { name: /Bipartite/i }).click()
    await expect(page.locator('header').getByRole('button', { name: /Trait Edges/i })).toBeVisible()

    await expect.poll(() => getEdgeCount(page)).not.toBe(edgesBefore)
  })

  test('switching layout mode works without crashing', async ({ page }) => {
    const nodesBefore = await getNodeCount(page)

    await page.locator('header').getByRole('button', { name: /Spring/i }).click()
    await expect(page.locator('header').getByRole('button', { name: /Hierarchical/i })).toBeVisible()

    expect(await getNodeCount(page)).toBe(nodesBefore)
  })

  test('unlocking fixed layout reduces visible nodes to 15', async ({ page }) => {
    expect(await getNodeCount(page)).toBeGreaterThan(15)

    await page.locator('header').getByRole('button', { name: /Fixed Layout/i }).click()

    await expect.poll(() => getNodeCount(page)).toBe(15)
  })

  test('selecting a champion reduces visible nodes', async ({ page }) => {
    const nodesBefore = await getNodeCount(page)

    const firstChampion = page.locator('aside').getByRole('button').filter({ hasText: /\dg/ }).first()
    await firstChampion.click()

    await expect.poll(() => getNodeCount(page)).toBeLessThan(nodesBefore)
    expect(await getNodeCount(page)).toBeGreaterThan(0)
  })

  test('Reset All restores all nodes', async ({ page }) => {
    const nodesBefore = await getNodeCount(page)

    await page.locator('aside').getByRole('button').filter({ hasText: /\dg/ }).first().click()
    await expect.poll(() => getNodeCount(page)).toBeLessThan(nodesBefore)

    await page.locator('header').getByRole('button', { name: /Reset All/i }).click()

    await expect.poll(() => getNodeCount(page)).toBe(nodesBefore)
  })

  test('unchecking a cost filter reduces node count', async ({ page }) => {
    const nodesBefore = await getNodeCount(page)

    await page.locator('aside').getByLabel('1g').click()

    await expect.poll(() => getNodeCount(page)).toBeLessThan(nodesBefore)
  })

  test('clicking a champion in the sidebar toggles its selected state', async ({ page }) => {
    const firstRow = page
      .locator('aside [data-testid^="champion-row-"]')
      .first()
    await expect(firstRow).toHaveAttribute('data-selected', 'false')

    await firstRow.click()
    // After selection, that champion's row carries data-selected="true"
    // (it may move to the top of the list, so re-locate by id).
    const id = await firstRow.getAttribute('data-testid')
    const rowAfter = page.locator(`aside [data-testid="${id}"]`)
    await expect(rowAfter).toHaveAttribute('data-selected', 'true')

    // Clicking it again unselects
    await rowAfter.click()
    await expect(rowAfter).toHaveAttribute('data-selected', 'false')
  })
})

test.describe('Traits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('shows empty-state copy with no champions selected', async ({ page }) => {
    await expect(
      page.locator('[data-testid="traits-card"]').getByText('Select a champion to see traits'),
    ).toBeVisible()
  })

  test('a single champion surfaces its traits as in-progress (not activated)', async ({ page }) => {
    await page.locator('aside').getByRole('button').filter({ hasText: /\dg/ }).first().click()

    // Count > 0 traits should be visible, but they must be marked not-activated
    // unless the trait's first breakpoint is 1 (uniques).
    const inProgress = page.locator('aside [data-testid^="activated-trait-"][data-activated="false"]')
    await expect(inProgress.first()).toBeVisible()
  })

  test('selecting two champions sharing a trait surfaces it with count 2', async ({ page }) => {
    // Find a pair of champions in the current set that share at least one trait,
    // pick the trait with the most pairs, and select two of its champions via
    // the dev __tftClickNode hook (cycling unselected → expanded → selected).
    const target = await page.evaluate(() => {
      // The Available Champions list shows champions from currentSet.champions.
      // Read the bipartite graph from __cy: edges go champion-X ↔ trait-Y.
      const cy = (window as any).__cy
      const traitChampions = new Map<string, string[]>()
      cy.nodes('[type="trait"]').forEach((t: any) => {
        const champs = t.neighborhood('[type="champion"]').map((c: any) => c.id())
        if (champs.length >= 2) traitChampions.set(t.id(), champs)
      })
      const [traitId, champIds] = [...traitChampions.entries()][0]
      return { traitId: traitId.replace('trait-', ''), champIds: champIds.slice(0, 2) }
    })

    // Click each champion twice to land in "selected" state (expand → select).
    for (const cyId of target.champIds) {
      await page.evaluate((id) => (window as any).__tftClickNode(id), cyId)
      await page.evaluate((id) => (window as any).__tftClickNode(id), cyId)
    }

    const badge = page.locator('aside').getByTestId(`activated-trait-${target.traitId}`)
    await expect(badge).toBeVisible()
    await expect(
      page.locator('aside').getByTestId(`activated-trait-count-${target.traitId}`),
    ).toHaveText('2')

    // Breakpoint indicators: each <span>'s data-active should equal `count >= bp`,
    // regardless of the trait's specific breakpoint set.
    const breakpoints = page
      .locator('aside')
      .getByTestId(`activated-trait-breakpoints-${target.traitId}`)
    await expect(breakpoints).toBeVisible()
    const states = await breakpoints.locator('span').evaluateAll((els) =>
      els.map((el) => ({
        value: parseInt(el.textContent ?? '', 10),
        active: el.getAttribute('data-active') === 'true',
      })),
    )
    expect(states.length).toBeGreaterThan(0)
    for (const { value, active } of states) {
      expect(active).toBe(2 >= value)
    }
  })

  test('trait tier styling: in-progress is outline, last activation is gold', async ({ page }) => {
    // Pick a unique trait — one whose breakpoints are [1] — so a single
    // selected champion lands directly in the highest tier (gold).
    const target = await page.evaluate(() => {
      const cy = (window as any).__cy
      const champions = cy.nodes('[type="champion"]').map((n: any) => n.data())
      // Champion ids are like 'champion-vex' in the cy graph; the click hook expects the cy id.
      // Find any champion adjacent to a trait with [1] breakpoints; in Set 17, Vex has 'doomer' which is [1].
      const vex = cy.nodes('[type="champion"][label="Vex"]').first()
      return { cyId: vex.id() }
    })

    // Click twice to land in selected (expand → select).
    await page.evaluate((id) => (window as any).__tftClickNode(id), target.cyId)
    await page.evaluate((id) => (window as any).__tftClickNode(id), target.cyId)

    // Doomer should appear at tier 0 — but since [1] has only one tier,
    // tier 0 IS the last tier → gold.
    const doomer = page.locator('aside').getByTestId('activated-trait-doomer')
    await expect(doomer).toBeVisible()
    await expect(doomer).toHaveAttribute('data-tier', '0')
    await expect(doomer).toHaveAttribute('data-activated', 'true')

    // Vex's other traits (none here, Vex is unique-only) — sanity check that
    // any in-progress entries get tier=-1.
    const inProgress = page.locator('aside [data-testid^="activated-trait-"][data-activated="false"]')
    if ((await inProgress.count()) > 0) {
      await expect(inProgress.first()).toHaveAttribute('data-tier', '-1')
    }
  })
})
