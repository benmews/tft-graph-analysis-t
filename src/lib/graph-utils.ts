import { TFTSet, GraphNode, GraphEdge, VisualizationMode, Champion, Trait } from './types'

function parseOklch(oklchString: string): { L: number; C: number; H: number } {
  const match = oklchString.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  if (!match) return { L: 0.5, C: 0.15, H: 200 }
  return {
    L: parseFloat(match[1]),
    C: parseFloat(match[2]),
    H: parseFloat(match[3]),
  }
}

function mixOklchColors(colors: string[]): string {
  if (colors.length === 0) return 'oklch(0.50 0.15 200)'
  if (colors.length === 1) return colors[0]

  const parsed = colors.map(parseOklch)
  
  const avgL = parsed.reduce((sum, c) => sum + c.L, 0) / parsed.length
  const avgC = parsed.reduce((sum, c) => sum + c.C, 0) / parsed.length
  
  let sinSum = 0
  let cosSum = 0
  parsed.forEach(c => {
    const hueRad = (c.H * Math.PI) / 180
    sinSum += Math.sin(hueRad)
    cosSum += Math.cos(hueRad)
  })
  
  const avgHueRad = Math.atan2(sinSum / parsed.length, cosSum / parsed.length)
  let avgH = (avgHueRad * 180) / Math.PI
  if (avgH < 0) avgH += 360
  
  return `oklch(${avgL.toFixed(2)} ${avgC.toFixed(2)} ${avgH.toFixed(0)})`
}

function getChampionColorByCost(cost: number): string {
  const costColors: Record<number, string> = {
    1: 'oklch(0.75 0.01 240)',
    2: 'oklch(0.75 0.15 145)',
    3: 'oklch(0.85 0.18 95)',
    4: 'oklch(0.75 0.20 45)',
    5: 'oklch(0.60 0.25 25)',
  }
  
  return costColors[cost] || 'oklch(0.75 0.01 240)'
}

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
      color: getChampionColorByCost(champion.cost),
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
