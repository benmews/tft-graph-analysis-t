import { TFTSet, GraphNode, GraphEdge } from './types'

function getChampionColorByCost(cost: number): string {
  const costColors: Record<number, string> = {
    1: 'oklch(0.55 0.15 240)',
    2: 'oklch(0.55 0.35 145)',
    3: 'oklch(0.65 0.35 95)',
    4: 'oklch(0.60 0.35 55)',
    5: 'oklch(0.50 0.40 15)',
  }
  return costColors[cost] || 'oklch(0.55 0.15 240)'
}

export function generateBipartiteGraph(tftSet: TFTSet): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  tftSet.traits.forEach((trait) => {
    nodes.push({
      id: `trait-${trait.id}`,
      type: 'trait',
      label: trait.name,
      color: trait.color,
    })
  })

  tftSet.champions.forEach((champion) => {
    nodes.push({
      id: `champion-${champion.id}`,
      type: 'champion',
      label: champion.name,
      cost: champion.cost,
      color: getChampionColorByCost(champion.cost),
    })

    champion.traits.forEach((traitId) => {
      edges.push({
        id: `edge-${champion.id}-${traitId}`,
        source: `champion-${champion.id}`,
        target: `trait-${traitId}`,
      })
    })
  })

  return { nodes, edges }
}

export function generateTraitEdgeGraph(tftSet: TFTSet): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  tftSet.champions.forEach((champion) => {
    nodes.push({
      id: `champion-${champion.id}`,
      type: 'champion',
      label: champion.name,
      cost: champion.cost,
      color: getChampionColorByCost(champion.cost),
    })
  })

  const championsByTrait = new Map<string, string[]>()
  tftSet.champions.forEach((champion) => {
    champion.traits.forEach((traitId) => {
      if (!championsByTrait.has(traitId)) championsByTrait.set(traitId, [])
      championsByTrait.get(traitId)!.push(champion.id)
    })
  })

  const seen = new Set<string>()
  championsByTrait.forEach((champions, traitId) => {
    for (let i = 0; i < champions.length; i++) {
      for (let j = i + 1; j < champions.length; j++) {
        const [a, b] = [champions[i], champions[j]].sort()
        const key = `${a}-${b}`
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({
          id: `edge-${a}-${b}-${traitId}`,
          source: `champion-${a}`,
          target: `champion-${b}`,
        })
      }
    }
  })

  return { nodes, edges }
}

export function findNeighbors(nodeId: string, edges: GraphEdge[], hops = 1): Set<string> {
  const neighbors = new Set<string>()
  const visited = new Set<string>([nodeId])
  const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.depth >= hops) continue

    edges.forEach((edge) => {
      const neighbor =
        edge.source === current.id ? edge.target : edge.target === current.id ? edge.source : null

      if (neighbor && !visited.has(neighbor)) {
        visited.add(neighbor)
        neighbors.add(neighbor)
        queue.push({ id: neighbor, depth: current.depth + 1 })
      }
    })
  }

  return neighbors
}
