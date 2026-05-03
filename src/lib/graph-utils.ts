import { TFTSet, GraphNode, GraphEdge, VisualizationMode, Champion, Trait } from './types'

export function generateBipartiteGraph(
  tftSet: TFTSet,
  selectedChampions: string[] = []
): { nodes: GraphNode[]; edges: GraphEdge[] } {
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

export function generateTraitEdgeGraph(
  tftSet: TFTSet,
  selectedChampions: string[] = []
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  tftSet.champions.forEach((champion) => {
    nodes.push({
      id: `champion-${champion.id}`,
      type: 'champion',
      label: champion.name,
      cost: champion.cost,
    })
  })

  const championsByTrait = new Map<string, string[]>()
  tftSet.champions.forEach((champion) => {
    champion.traits.forEach((traitId) => {
      if (!championsByTrait.has(traitId)) {
        championsByTrait.set(traitId, [])
      }
      championsByTrait.get(traitId)!.push(champion.id)
    })
  })

  const edgeSet = new Set<string>()
  championsByTrait.forEach((champions, traitId) => {
    for (let i = 0; i < champions.length; i++) {
      for (let j = i + 1; j < champions.length; j++) {
        const source = champions[i]
        const target = champions[j]
        const edgeKey = [source, target].sort().join('-')
        
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey)
          const trait = tftSet.traits.find((t) => t.id === traitId)
          edges.push({
            id: `edge-${source}-${target}-${traitId}`,
            source: `champion-${source}`,
            target: `champion-${target}`,
          })
        }
      }
    }
  })

  return { nodes, edges }
}

export function findNeighbors(
  nodeId: string,
  edges: GraphEdge[],
  hops: number = 1
): Set<string> {
  const neighbors = new Set<string>()
  const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }]
  const visited = new Set<string>([nodeId])

  while (queue.length > 0) {
    const current = queue.shift()!
    
    if (current.depth >= hops) continue

    edges.forEach((edge) => {
      let neighbor: string | null = null
      
      if (edge.source === current.id) {
        neighbor = edge.target
      } else if (edge.target === current.id) {
        neighbor = edge.source
      }

      if (neighbor && !visited.has(neighbor)) {
        visited.add(neighbor)
        neighbors.add(neighbor)
        queue.push({ id: neighbor, depth: current.depth + 1 })
      }
    })
  }

  return neighbors
}

export function calculateContestedness(
  championId: string,
  opponentChampions: string[][]
): number {
  let count = 0
  opponentChampions.forEach((team) => {
    if (team.includes(championId)) {
      count++
    }
  })
  return count
}

export function findSharedTraits(champion1: Champion, champion2: Champion): string[] {
  return champion1.traits.filter((trait) => champion2.traits.includes(trait))
}

export function analyzeTraitCoverage(
  champions: Champion[],
  allTraits: Trait[]
): Map<string, number> {
  const coverage = new Map<string, number>()
  
  allTraits.forEach((trait) => {
    coverage.set(trait.id, 0)
  })

  champions.forEach((champion) => {
    champion.traits.forEach((traitId) => {
      coverage.set(traitId, (coverage.get(traitId) || 0) + 1)
    })
  })

  return coverage
}
