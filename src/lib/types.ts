export interface Trait {
  id: string
  name: string
  color: string
}

export interface Champion {
  id: string
  name: string
  cost: number
  traits: string[]
}

export interface TFTSet {
  name: string
  champions: Champion[]
  traits: Trait[]
}

export type VisualizationMode = 'bipartite' | 'traits-as-edges'

export interface GraphNode {
  id: string
  type: 'champion' | 'trait'
  label: string
  color?: string
  cost?: number
  expanded?: boolean
  pinned?: boolean
  contestedness?: number
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
