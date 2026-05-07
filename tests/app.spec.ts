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

  test('selected champion appears in Selected Champions card', async ({ page }) => {
    await expect(page.locator('aside').getByText('No champions selected')).toBeVisible()

    await page.locator('aside').getByRole('button').filter({ hasText: /\dg/ }).first().click()

    await expect(page.locator('aside').getByText('No champions selected')).not.toBeVisible()
  })
})
