/**
 * Pre-computed graph layouts.
 *
 * The actual coordinate data lives in `baked-layouts.json`, keyed by setId.
 * The graph view loads these directly via cytoscape's `preset` layout so
 * every visitor sees the same positioning of nodes.
 *
 * To capture or refresh an entry:
 *   1. Open the app in dev mode with the relevant set selected and Fixed
 *      Layout on, so the graph has settled.
 *   2. In the browser devtools console run:  __bakeLayout()
 *      The function prints (and copies to clipboard) a JSON entry of the
 *      form  "set17": [ {"id": ..., "x": ..., "y": ...}, ... ]
 *   3. Add (or replace) that key inside `baked-layouts.json`.
 *
 * Runtime falls back to the dynamic layout when no baked entry exists, so
 * adding new sets is incremental.
 */

import bakedData from './baked-layouts.json'

export type BakedNodePosition = { id: string; x: number; y: number }

const bakedLayouts = bakedData as Partial<Record<string, BakedNodePosition[]>>

export function getBakedLayout(setId: string): Map<string, { x: number; y: number }> | null {
  const arr = bakedLayouts[setId]
  if (!arr || arr.length === 0) return null
  const map = new Map<string, { x: number; y: number }>()
  for (const p of arr) map.set(p.id, { x: p.x, y: p.y })
  return map
}
