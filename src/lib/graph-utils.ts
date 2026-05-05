import { TFTSet, GraphNode, GraphEdge, VisualizationMode } from './types'

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

export type VisibilityOptions = {
  mode: VisualizationMode
  selectedChampions: string[]
  expandedNodes: string[]
  enabledCosts: Set<number>
  fixedLayout: boolean
}

/**
 * Decide which nodes are currently visible in the graph view.
 *
 * The rules:
 *  - Cost filter is applied to champion nodes first.
 *  - With nothing selected/expanded:
 *      fixedLayout=true  → show every filtered node
 *      fixedLayout=false → show the first 15 (preview)
 *  - Selected champion: show its 2-hop neighborhood (1-hop in trait-edges
 *    mode), plus any "circle trait" that connects two of those revealed
 *    champions but isn't directly the selected champion's trait.
 *  - Expanded trait: show the trait + its champion neighbors.
 *  - Expanded champion: show the champion + its traits, and (in bipartite
 *    mode only) every other champion that shares any of those traits.
 */
export function computeVisibleNodes(
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  opts: VisibilityOptions,
): GraphNode[] {
  const { mode, selectedChampions, expandedNodes, enabledCosts, fixedLayout } = opts

  const filteredNodes = allNodes.filter((node) =>
    node.type === 'champion' && node.cost !== undefined ? enabledCosts.has(node.cost) : true,
  )

  if (selectedChampions.length === 0 && expandedNodes.length === 0) {
    return fixedLayout ? filteredNodes : filteredNodes.slice(0, 15)
  }

  const visible = new Set<string>()

  selectedChampions.forEach((champId) => {
    const nodeId = `champion-${champId}`
    visible.add(nodeId)

    const hops = mode === 'traits-as-edges' ? 1 : 2
    const neighbors = findNeighbors(nodeId, allEdges, hops)
    neighbors.forEach((n) => visible.add(n))

    if (mode === 'bipartite') {
      addCircleTraits(neighbors, allEdges, visible)
    }
  })

  expandedNodes.forEach((nodeId) => {
    visible.add(nodeId)

    if (nodeId.startsWith('trait-')) {
      findNeighbors(nodeId, allEdges, 1).forEach((n) => {
        if (n.startsWith('champion-')) visible.add(n)
      })
    } else if (nodeId.startsWith('champion-')) {
      const direct = findNeighbors(nodeId, allEdges, 1)
      direct.forEach((n) => visible.add(n))

      if (mode === 'bipartite') {
        Array.from(direct)
          .filter((n) => n.startsWith('trait-'))
          .forEach((traitId) => {
            findNeighbors(traitId, allEdges, 1).forEach((c) => {
              if (c.startsWith('champion-')) visible.add(c)
            })
          })
      }
    }
  })

  return filteredNodes.filter((node) => visible.has(node.id))
}

/**
 * Add traits that connect two revealed champions but the selected champion
 * doesn't directly belong to. Completes the "circle" A → trait → B → trait' → C
 * — see App.tsx click semantics.
 */
function addCircleTraits(
  selectedNeighbors: Set<string>,
  allEdges: GraphEdge[],
  visible: Set<string>,
) {
  const revealedChampions = Array.from(selectedNeighbors).filter((n) => n.startsWith('champion-'))

  for (const champ1 of revealedChampions) {
    for (const champ2 of revealedChampions) {
      if (champ1 === champ2) continue

      for (const edge of allEdges) {
        // skip champion ↔ champion edges (only present in trait-edge mode)
        if (
          (edge.source === champ1 && edge.target === champ2) ||
          (edge.source === champ2 && edge.target === champ1)
        ) {
          continue
        }

        // we want trait edges incident to champ1
        const isChamp1ToTrait = edge.source === champ1 && edge.target.startsWith('trait-')
        const isTraitToChamp1 = edge.target === champ1 && edge.source.startsWith('trait-')
        if (!isChamp1ToTrait && !isTraitToChamp1) continue

        const traitNode = isChamp1ToTrait ? edge.target : edge.source
        if (visible.has(traitNode)) continue
        if (selectedNeighbors.has(traitNode)) continue

        const champ2Connects = allEdges.some(
          (e) =>
            (e.source === champ2 && e.target === traitNode) ||
            (e.target === champ2 && e.source === traitNode),
        )
        if (champ2Connects) visible.add(traitNode)
      }
    }
  }
}
