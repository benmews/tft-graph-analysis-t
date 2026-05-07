/**
 * Node interaction tests
 *
 * Cytoscape renders to canvas so nodes can't be queried as DOM elements.
 * Instead we use two dev-mode hooks exposed by the app:
 *   window.__tftClickNode(nodeId)  — fires the same handler as a canvas tap
 *   window.__cy                    — the live Cytoscape instance (read-only use)
 *
 * This lets us test the exact state machines and neighborhood logic without
 * depending on pixel coordinates or canvas rendering.
 */

import { test, expect, Page } from '@playwright/test'
import { getNodeCount, waitForGraph } from './helpers'

test.use({ viewport: { width: 1280, height: 720 } })

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simulate clicking a canvas node by calling the app's click handler directly. */
async function clickNode(page: Page, nodeId: string): Promise<void> {
  await page.evaluate((id) => (window as any).__tftClickNode(id), nodeId)
  await page.waitForTimeout(80) // let React flush the state update
}

/** Return the Cytoscape id of the first node matching a type selector. */
async function firstNodeId(page: Page, type: 'champion' | 'trait'): Promise<string> {
  return page.evaluate(
    (t) => (window as any).__cy.nodes(`[type="${t}"]`).first().id(),
    type
  )
}

// ─── State machine: trait node ────────────────────────────────────────────────

test.describe('Trait node state machine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('cycles unselected → expanded → opponent-selected → unselected on repeated clicks', async ({ page }) => {
    const traitId = await firstNodeId(page, 'trait')
    const fullCount = await getNodeCount(page)

    // 1st click → expanded: only the trait + its champion neighbours are visible.
    await clickNode(page, traitId)
    const afterFirst = await getNodeCount(page)
    expect(afterFirst).toBeLessThan(fullCount)
    const traitClass = (id: string) =>
      page.evaluate((nid) => (window as any).__cy.getElementById(nid).classes(), id)
    expect(await traitClass(traitId)).toContain('expanded')

    // Traits cannot be selected (champions can be), so no champion row pinned.
    expect(
      await page.locator('aside [data-testid^="champion-row-"][data-selected="true"]').count(),
    ).toBe(0)

    // 2nd click → opponent-selected: same nodes visible, trait class flips.
    await clickNode(page, traitId)
    expect(await getNodeCount(page)).toBe(afterFirst)
    expect(await traitClass(traitId)).toContain('opponent-trait')

    // 3rd click → unselected: full graph returns.
    await clickNode(page, traitId)
    expect(await getNodeCount(page)).toBe(fullCount)
    expect(await traitClass(traitId)).not.toContain('expanded')
    expect(await traitClass(traitId)).not.toContain('opponent-trait')
  })
})

// ─── State machine: champion node ────────────────────────────────────────────

test.describe('Champion node state machine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('cycles unselected → expanded → selected → unselected', async ({ page }) => {
    const champId = await firstNodeId(page, 'champion')
    const fullCount = await getNodeCount(page)
    const championRowSlug = champId.replace('champion-', '')
    const row = page.locator(`aside [data-testid="champion-row-${championRowSlug}"]`)

    await expect(row).toHaveAttribute('data-selected', 'false')

    // 1st click: unselected → expanded
    await clickNode(page, champId)
    const expandedCount = await getNodeCount(page)
    expect(expandedCount).toBeLessThan(fullCount)
    await expect(row).toHaveAttribute('data-selected', 'false')

    // 2nd click: expanded → selected
    await clickNode(page, champId)
    await expect(row).toHaveAttribute('data-selected', 'true')

    // 3rd click: selected → unselected
    await clickNode(page, champId)
    await expect(row).toHaveAttribute('data-selected', 'false')
    expect(await getNodeCount(page)).toBe(fullCount)
  })
})

// ─── Neighborhood correctness ─────────────────────────────────────────────────

test.describe('Neighborhood expansion correctness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGraph(page)
  })

  test('expanding a trait reveals exactly itself plus its champion neighbors', async ({ page }) => {
    // Compute expected count from the full graph (before any interaction)
    const { traitId, expected } = await page.evaluate(() => {
      const cy = (window as any).__cy
      const trait = cy.nodes('[type="trait"]').first()
      const championNeighbors = trait.neighborhood('[type="champion"]')
      return { traitId: trait.id(), expected: 1 + championNeighbors.length }
    })

    await clickNode(page, traitId)
    await expect.poll(() => getNodeCount(page)).toBe(expected)
  })

  test('expanding or selecting a champion reveals 2-hop neighborhood plus 6-cycle traits', async ({ page }) => {
    /**
     * Expanding and selecting a champion now share the same reveal rule:
     * 2-hop neighborhood (champion's traits + every champion sharing any of
     * those traits) + any "circle trait" that lies on a 6-cycle through the
     * champion (a trait shared by two of its 2-hop champions but not held by
     * the champion itself).
     */
    const { champId, expected } = await page.evaluate(() => {
      const cy = (window as any).__cy
      const champ = cy.nodes('[type="champion"]').first()
      const champTraits = champ.neighborhood('[type="trait"]')
      const champTraitIds = new Set<string>()
      champTraits.forEach((t: any) => champTraitIds.add(t.id()))

      const twoHopIds = new Set<string>()
      champTraits.forEach((t: any) => {
        t.neighborhood('[type="champion"]').forEach((c: any) => {
          if (c.id() !== champ.id()) twoHopIds.add(c.id())
        })
      })
      const twoHopChamps = [...twoHopIds].map((id: string) => cy.$(`#${id}`))

      const circleIds = new Set<string>()
      twoHopChamps.forEach((b: any) => {
        twoHopChamps.forEach((c: any) => {
          if (b.id() === c.id()) return
          b.neighborhood('[type="trait"]').forEach((t: any) => {
            if (!champTraitIds.has(t.id()) && c.neighborhood(`#${t.id()}`).length > 0) {
              circleIds.add(t.id())
            }
          })
        })
      })

      return {
        champId: champ.id(),
        expected: 1 + champTraits.length + twoHopIds.size + circleIds.size,
      }
    })

    // 1st click: expand
    await clickNode(page, champId)
    await expect.poll(() => getNodeCount(page)).toBe(expected)

    // 2nd click: select — visibility unchanged (rule is unified across both)
    await clickNode(page, champId)
    await expect.poll(() => getNodeCount(page)).toBe(expected)
  })
})
