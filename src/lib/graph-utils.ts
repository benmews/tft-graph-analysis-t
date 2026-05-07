import { TFTSet, GraphNode, GraphEdge } from './types'

export function getChampionColorByCost(cost: number): string {
  /**
   * Cost palette: TFT-canonical hues, picked as direct sRGB hex so the
   * vibrancy isn't lost by the oklch→sRGB approximation in oklchToHex.
   * 1g is intentionally muted (the rare cost that should look "common");
   * 5g is a bright, shining gold for the rarest tier.
   */
  const costColors: Record<number, string> = {
    1: '#b7bcc7',
    2: '#22c55e',
    3: '#3b82f6',
    4: '#f94802',
    5: '#facc15',
  }
  return costColors[cost] || '#b7bcc7'
}

export function generateBipartiteGraph(tftSet: TFTSet): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  tftSet.traits.forEach((trait) => {
    nodes.push({
      id: `trait-${trait.id}`,
      type: 'trait',
      label: trait.name,
      shortLabel: trait.shortLabel,
      color: trait.color,
    })
  })

  tftSet.champions.forEach((champion) => {
    nodes.push({
      id: `champion-${champion.id}`,
      type: 'champion',
      label: champion.name,
      shortLabel: champion.shortLabel,
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
  selectedChampions: string[]
  expandedNodes: string[]
  enabledCosts: Set<number>
  fixedLayout: boolean
  /** When false, hide trait nodes that connect to only one champion. */
  showUniqueTraits?: boolean
  /** When true, always include champions whose traits are *all* unique (i.e. they would otherwise float disconnected). */
  showUniqueChampions?: boolean
}

/**
 * Decide which nodes are currently visible in the graph view.
 *
 * The rules:
 *  - Cost filter is applied to champion nodes; the Unique-traits checkbox
 *    can hide single-champion trait nodes.
 *  - Selected and expanded nodes (and unique champions when pinned) are
 *    "overrides": they stay visible even when a filter would hide them,
 *    AND they remain valid intermediates in the reveal graph.
 *  - Filtered-out nodes that aren't overrides drop out of the reveal graph
 *    entirely. So a champion C that was only reachable as B's 2-hop
 *    neighbour disappears when B gets filtered out.
 *  - With nothing selected/expanded:
 *      fixedLayout=true  → show every allowed node
 *      fixedLayout=false → show the first 15 (preview), plus any pinned
 *                          unique champions
 *  - Selected or expanded champion: 2-hop neighbourhood (in the reveal
 *    graph) plus any "circle trait" that connects two of those revealed
 *    champions but isn't one of the champion's own traits.
 *  - Expanded trait: the trait + its champion neighbours.
 */
export function computeVisibleNodes(
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  opts: VisibilityOptions,
): GraphNode[] {
  const {
    selectedChampions,
    expandedNodes,
    enabledCosts,
    fixedLayout,
    showUniqueTraits = true,
    showUniqueChampions = false,
  } = opts

  // Trait → champion-count, used for unique-trait hiding and unique-champion pinning.
  const traitChampionCounts = new Map<string, number>()
  for (const edge of allEdges) {
    const trait = edge.source.startsWith('trait-')
      ? edge.source
      : edge.target.startsWith('trait-')
        ? edge.target
        : null
    if (!trait) continue
    traitChampionCounts.set(trait, (traitChampionCounts.get(trait) ?? 0) + 1)
  }
  const isUniqueTrait = (traitId: string) => (traitChampionCounts.get(traitId) ?? 0) <= 1

  // Champions whose every adjacent trait is unique (would otherwise float
  // disconnected and so are pinned by the Unique-champions toggle).
  const uniqueChampionIds = new Set<string>()
  if (showUniqueChampions) {
    const championTraits = new Map<string, string[]>()
    for (const edge of allEdges) {
      const champ = edge.source.startsWith('champion-')
        ? edge.source
        : edge.target.startsWith('champion-')
          ? edge.target
          : null
      const trait = edge.source.startsWith('trait-')
        ? edge.source
        : edge.target.startsWith('trait-')
          ? edge.target
          : null
      if (!champ || !trait) continue
      const list = championTraits.get(champ) ?? []
      list.push(trait)
      championTraits.set(champ, list)
    }
    for (const [champ, traits] of championTraits) {
      if (traits.length > 0 && traits.every((t) => isUniqueTrait(t))) uniqueChampionIds.add(champ)
    }
  }

  // Override nodes: visible regardless of filters, AND treated as present
  // in the reveal graph so they can serve as intermediates. Pinned unique
  // champions are NOT overrides — they still obey cost/unique-trait filters.
  const overrideIds = new Set<string>()
  for (const cid of selectedChampions) overrideIds.add(`champion-${cid}`)
  for (const eid of expandedNodes) overrideIds.add(eid)

  const passesFilter = (node: GraphNode): boolean => {
    if (node.type === 'champion') {
      return node.cost === undefined || enabledCosts.has(node.cost)
    }
    if (node.type === 'trait' && !showUniqueTraits) {
      return !isUniqueTrait(node.id)
    }
    return true
  }
  const isAllowed = (node: GraphNode): boolean =>
    overrideIds.has(node.id) || passesFilter(node)

  const allowedNodes = allNodes.filter(isAllowed)
  const allowedNodeIds = new Set(allowedNodes.map((n) => n.id))

  // Reveal traversal walks only edges between allowed endpoints, so a hidden
  // intermediate also drops anything downstream that was only reachable
  // through it.
  const effectiveEdges = allEdges.filter(
    (e) => allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target),
  )

  if (selectedChampions.length === 0 && expandedNodes.length === 0) {
    if (fixedLayout) return allowedNodes
    const base = allowedNodes.slice(0, 15)
    if (showUniqueChampions) {
      const present = new Set(base.map((n) => n.id))
      for (const node of allowedNodes) {
        if (uniqueChampionIds.has(node.id) && !present.has(node.id)) {
          base.push(node)
          present.add(node.id)
        }
      }
    }
    return base
  }

  const visible = new Set<string>()

  selectedChampions.forEach((champId) => {
    revealChampionNeighborhood(`champion-${champId}`, effectiveEdges, visible)
  })

  expandedNodes.forEach((nodeId) => {
    visible.add(nodeId)

    if (nodeId.startsWith('trait-')) {
      findNeighbors(nodeId, effectiveEdges, 1).forEach((n) => {
        if (n.startsWith('champion-')) visible.add(n)
      })
    } else if (nodeId.startsWith('champion-')) {
      revealChampionNeighborhood(nodeId, effectiveEdges, visible)
    }
  })

  // Selected and expanded overrides are always visible — even when they
  // themselves were filtered out by cost or carry no allowed edges to lean on.
  for (const id of overrideIds) visible.add(id)

  // Pinned unique champions appear when allowed (cost filter still applies).
  if (showUniqueChampions) {
    for (const id of uniqueChampionIds) {
      if (allowedNodeIds.has(id)) visible.add(id)
    }
  }

  return allowedNodes.filter((node) => visible.has(node.id))
}

/**
 * Reveal the neighborhood of a champion node (used for both selection and
 * expansion). Distance ≤ 2 plus any trait that lies on a 6-cycle through x
 * (a trait shared by two of x's 2-hop champion neighbours that x itself
 * doesn't carry).
 */
function revealChampionNeighborhood(
  champNodeId: string,
  allEdges: GraphEdge[],
  visible: Set<string>,
) {
  visible.add(champNodeId)
  const neighborhood = findNeighbors(champNodeId, allEdges, 2)
  neighborhood.forEach((n) => visible.add(n))
  addCircleTraits(neighborhood, allEdges, visible)
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

