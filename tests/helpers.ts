import { expect, Page } from '@playwright/test'

/**
 * Wait until the cytoscape instance has been mounted and populated.
 * The status-bar text was previously the "graph is ready" signal but the
 * status bar was removed; reading from `__cy` is more authoritative anyway.
 */
export async function waitForGraph(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => (window as any).__cy?.nodes().length ?? 0))
    .toBeGreaterThan(0)
}

export async function getNodeCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__cy.nodes().length)
}

export async function getEdgeCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__cy.edges().length)
}
