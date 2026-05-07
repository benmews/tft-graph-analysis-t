/**
 * Pre-computed graph layouts.
 *
 * Each entry is keyed by `${setId}:${mode}:${layoutMode}` and holds the
 * `(x, y)` coordinates produced by running the corresponding layout once.
 * The graph view loads these directly via cytoscape's `preset` layout so
 * every visitor sees the same positioning of nodes.
 *
 * To capture or refresh an entry:
 *   1. Open the app in dev mode with the relevant set / mode / layoutMode
 *      selected and Fixed Layout on, so the graph has settled.
 *   2. In the browser devtools console run:  __bakeLayout()
 *      The function prints (and copies to clipboard) a snippet of the form
 *      'set17:bipartite:spring': [ { id, x, y }, ... ],
 *   3. Paste that snippet into the `bakedLayouts` object below, keeping the
 *      keys sorted, and commit.
 *
 * Runtime falls back to the dynamic layout when no baked entry exists, so
 * adding new combinations is incremental.
 */

import type { LayoutMode, VisualizationMode } from './types'

export type BakedNodePosition = { id: string; x: number; y: number }
export type BakedLayoutKey = `${string}:${VisualizationMode}:${LayoutMode}`

export const bakedLayouts: Partial<Record<BakedLayoutKey, BakedNodePosition[]>> = {}

export function makeBakedLayoutKey(
  setId: string,
  mode: VisualizationMode,
  layoutMode: LayoutMode,
): BakedLayoutKey {
  return `${setId}:${mode}:${layoutMode}` as BakedLayoutKey
}

export function getBakedLayout(
  setId: string,
  mode: VisualizationMode,
  layoutMode: LayoutMode,
): Map<string, { x: number; y: number }> | null {
  const key = makeBakedLayoutKey(setId, mode, layoutMode)
  const arr = bakedLayouts[key]
  if (!arr || arr.length === 0) return null
  const map = new Map<string, { x: number; y: number }>()
  for (const p of arr) map.set(p.id, { x: p.x, y: p.y })
  return map
}
