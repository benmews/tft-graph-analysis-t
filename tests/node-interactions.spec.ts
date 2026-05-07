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

  test('toggles between unselected and expanded on repeated clicks', async ({ page }) => {
    const traitId = await firstNodeId(page, 'trait')
    const fullCount = await getNodeCount(page)

    // 1st click → expanded: only the trait and its champion neighbors are visible
    await clickNode(page, traitId)
    const expandedCount = await getNodeCount(page)
    expect(expandedCount).toBeLessThan(fullCount)

    // Traits cannot be selected, so the sidebar still says "No champions selected"
    await expect(page.locator('aside').getByText('No champions selected')).toBeVisible()

    // 2nd click → collapsed: all nodes return
    await clickNode(page, traitId)
    expect(await getNodeCount(page)).toBe(fullCount)
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
    await expect(page.locator('aside').getByText('No champions selected')).toBeVisible()

    // 1st click: unselected → expanded
    // Node count decreases; champion is not yet in "Selected Champions"
    await clickNode(page, champId)
    const expandedCount = await getNodeCount(page)
    expect(expandedCount).toBeLessThan(fullCount)
    await expect(page.locator('aside').getByText('No champions selected')).toBeVisible()

    // 2nd click: expanded → selected
    // Champion now appears in "Selected Champions"; empty-state text disappears
    await clickNode(page, champId)
    await expect(page.locator('aside').getByText('No champions selected')).not.toBeVisible()

    // 3rd click: selected → unselected
    // Empty-state text returns; all nodes visible again
    await clickNode(page, champId)
    await expect(page.locator('aside').getByText('No champions selected')).toBeVisible()
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

  test('expanding a champion reveals its traits and all champions of those traits', async ({ page }) => {
    const { champId, expected } = await page.evaluate(() => {
      const cy = (window as any).__cy
      const champ = cy.nodes('[type="champion"]').first()
      const traits = champ.neighborhood('[type="trait"]')

      // 2-hop: every champion reachable via any of those traits (excluding the champion itself)
      const twoHopIds = new Set<string>()
      traits.forEach((t: any) => {
        t.neighborhood('[type="champion"]').forEach((c: any) => {
          if (c.id() !== champ.id()) twoHopIds.add(c.id())
        })
      })

      return { champId: champ.id(), expected: 1 + traits.length + twoHopIds.size }
    })

    await clickNode(page, champId)
    await expect.poll(() => getNodeCount(page)).toBe(expected)
  })

  test('selecting a champion reveals all expansion nodes plus any circle traits', async ({ page }) => {
    /**
     * "Circle traits" are traits shared between two revealed 2-hop champions
     * that the selected champion does not directly belong to.
     * Example: A has T1, T2. B (via T1) and C (via T2) both have T3.
     * T3 is added when A is selected, completing the triangle A–B–T3–C.
     */
    const { champId, expectedExpand, expectedSelect } = await page.evaluate(() => {
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

      // Find traits that connect any pair of revealed champions but aren't A's own traits
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

      const base = 1 + champTraits.length + twoHopIds.size
      return { champId: champ.id(), expectedExpand: base, expectedSelect: base + circleIds.size }
    })

    // 1st click: expand — verify expansion neighborhood
    await clickNode(page, champId)
    await expect.poll(() => getNodeCount(page)).toBe(expectedExpand)

    // 2nd click: select — verify selection neighborhood (expansion + circle traits)
    await clickNode(page, champId)
    await expect.poll(() => getNodeCount(page)).toBe(expectedSelect)

    // Sanity: selection never shows fewer nodes than expansion
    expect(expectedSelect).toBeGreaterThanOrEqual(expectedExpand)
  })
})
