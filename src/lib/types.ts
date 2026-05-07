export interface Trait {
  id: string
  name: string
  color: string
  /** Optional graph-only display label for traits with long names. */
  shortLabel?: string
  /**
   * Champion-count thresholds at which the trait activates a new tier.
   * Falls back to DEFAULT_TRAIT_BREAKPOINTS when not authored per-trait.
   */
  breakpoints?: number[]
}

export const DEFAULT_TRAIT_BREAKPOINTS: readonly number[] = [2, 4, 6]

export function getTraitBreakpoints(trait: Trait): readonly number[] {
  return trait.breakpoints ?? DEFAULT_TRAIT_BREAKPOINTS
}

export interface Champion {
  id: string
  name: string
  cost: number
  traits: string[]
  /** Optional graph-only display label for champions with long names. */
  shortLabel?: string
}

export interface TFTSet {
  id: string
  name: string
  champions: Champion[]
  traits: Trait[]
}

export type VisualizationMode = 'bipartite' | 'traits-as-edges'

export type LayoutMode = 'hierarchical' | 'spring'

export interface GraphNode {
  id: string
  type: 'champion' | 'trait'
  label: string
  shortLabel?: string
  color?: string
  cost?: number
  expanded?: boolean
  pinned?: boolean
  contestedness?: number
  position?: { x: number; y: number }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface OpponentTeam {
  id: string
  champions: string[]
  traits: string[]
}
