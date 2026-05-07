import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cytoscape, { Core } from 'cytoscape'
import { oklchToHex } from '@/lib/color-utils'
import {
  buildCytoscapeStyles,
  getViewportScale,
  initialLayoutOptions,
  relayoutOptions,
} from '@/lib/graph-styles'
import { getBakedLayout } from '@/lib/baked-layouts'
import type { GraphEdge, GraphNode, TFTSet } from '@/lib/types'

interface GraphVisualizationProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  set: TFTSet
  onNodeClick?: (nodeId: string) => void
  onNodeHover?: (nodeId: string | null) => void
  selectedNodes?: string[]
  expandedNodes?: string[]
  opponentTraits?: string[]
  fixedLayout?: boolean
  largeLabels?: boolean
  /** Increment to force a fresh cose layout on the visible nodes. */
  tidyTrigger?: number
}

type Viewport = { zoom: number; pan: { x: number; y: number } }

/** Apply pinned/expanded/opponent CSS classes to a single Cytoscape node. */
function nodeClassesFor(
  id: string,
  selected: string[],
  expanded: string[],
  opponent: string[],
  opponentNeighbors: Set<string>,
): string {
  if (id.startsWith('trait-')) {
    if (opponent.includes(id)) return 'opponent-trait'
    if (expanded.includes(id)) return 'expanded'
    return ''
  }
  // champion
  const isPinned = selected.includes(id)
  const isExpanded = !isPinned && expanded.includes(id)
  const classes = [
    isPinned && 'pinned',
    isExpanded && 'expanded',
    opponentNeighbors.has(id) && 'opponent-neighbor',
  ].filter(Boolean) as string[]
  return classes.join(' ')
}

export function GraphVisualization({
  nodes,
  edges,
  set,
  onNodeClick,
  onNodeHover,
  selectedNodes = [],
  expandedNodes = [],
  opponentTraits = [],
  fixedLayout = false,
  largeLabels = false,
  tidyTrigger = 0,
}: GraphVisualizationProps) {
  // Champions adjacent (1-hop) to any opponent-marked trait. Computed from
  // the current edge set so it stays in sync as visibility changes.
  const opponentNeighbors = useMemo(() => {
    const set = new Set<string>()
    if (opponentTraits.length === 0) return set
    const opp = new Set(opponentTraits)
    for (const e of edges) {
      if (opp.has(e.source) && e.target.startsWith('champion-')) set.add(e.target)
      if (opp.has(e.target) && e.source.startsWith('champion-')) set.add(e.source)
    }
    return set
  }, [edges, opponentTraits])

  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Latest callback refs — let event listeners on cy stay mounted while
  // the React component re-renders with new prop closures.
  const onNodeClickRef = useRef(onNodeClick)
  const onNodeHoverRef = useRef(onNodeHover)
  useEffect(() => {
    onNodeClickRef.current = onNodeClick
    onNodeHoverRef.current = onNodeHover
  })

  // Track structural state from the previous render so we know when to relayout.
  const previousNodesKeyRef = useRef('')
  const previousEdgesKeyRef = useRef('')
  const previousFixedLayoutRef = useRef(fixedLayout)
  const fixedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const savedViewportRef = useRef<Viewport | null>(null)

  // Debounce hover events so quick mouseovers don't thrash the parent state.
  const hoverTimeoutRef = useRef<number | null>(null)
  const scheduleHover = useCallback((nodeId: string | null) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = window.setTimeout(() => onNodeHoverRef.current?.(nodeId), 50)
  }, [])

  // ── 1. Initialize Cytoscape once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    const scale = getViewportScale()
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: buildCytoscapeStyles(scale, largeLabels),
      layout: initialLayoutOptions(scale) as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.5,
      maxZoom: 3,
      // Mouse-wheel deltas tend to be much larger than touchpad pinch deltas;
      // dial cytoscape's default 1 down so wheel zoom feels comparable.
      wheelSensitivity: 0.25,
    })

    cy.on('tap', 'node', (e) => onNodeClickRef.current?.(e.target.id()))
    cy.on('taphold', 'node', (e) => scheduleHover(e.target.id()))
    cy.on('tap', (e) => {
      if (e.target === cy) scheduleHover(null)
    })
    cy.on('mouseover', 'node', (e) => scheduleHover(e.target.id()))
    cy.on('mouseout', 'node', () => scheduleHover(null))

    cyRef.current = cy
    setIsInitialized(true)

    if (import.meta.env.DEV) {
      ;(window as any).__cy = cy
    }

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (!cy.destroyed()) cy.destroy()
      cyRef.current = null
    }
    // `isInitialized` is read as a one-shot guard — including it in deps
    // would tear down Cytoscape on the very next render after setIsInitialized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleHover])

  // ── 1b. Re-apply styles when label-size mode flips ────────────────────────
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !isInitialized) return
    cy.style(buildCytoscapeStyles(getViewportScale(), largeLabels) as any)
  }, [largeLabels, isInitialized])

  // ── 1d. Tidy layout: re-run cose on every visible node, no locks ─────────
  const tidyTriggerRef = useRef(tidyTrigger)
  useEffect(() => {
    if (tidyTriggerRef.current === tidyTrigger) return
    tidyTriggerRef.current = tidyTrigger
    const cy = cyRef.current
    if (!cy || !isInitialized) return
    cy.nodes().unlock()
    cy.layout(relayoutOptions(getViewportScale()) as any).run()
  }, [tidyTrigger, isInitialized])

  // ── 1c. Dev hook: print current node positions for baked-layouts.json ─────
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as any).__bakeLayout = () => {
      const cy = cyRef.current
      if (!cy) return null
      const positions = cy.nodes().map((n) => ({
        id: n.id(),
        x: Math.round(n.position('x') * 100) / 100,
        y: Math.round(n.position('y') * 100) / 100,
      }))
      const snippet = `${JSON.stringify(set.id)}: ${JSON.stringify(positions)}`
      // eslint-disable-next-line no-console
      console.log(snippet)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(snippet).catch(() => {})
      }
      return snippet
    }
  }, [set.id, isInitialized])

  // ── 2. Re-fit on container resize (orientation flip / browser chrome) ─────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let prevWidth = container.offsetWidth
    let prevHeight = container.offsetHeight

    const observer = new ResizeObserver((entries) => {
      const cy = cyRef.current
      if (!cy || cy.destroyed()) return

      const { width, height } = entries[0].contentRect
      const majorChange = Math.abs(width - prevWidth) > 50 || Math.abs(height - prevHeight) > 50
      prevWidth = width
      prevHeight = height

      cy.resize()
      if (majorChange) cy.fit(undefined, 50)
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // ── 3. Sync graph elements + classes with React state ─────────────────────
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !isInitialized) return

    const nodesKey = nodes.map((n) => n.id).sort().join(',')
    const edgesKey = edges.map((e) => `${e.source}-${e.target}`).sort().join(',')
    const structureChanged =
      previousNodesKeyRef.current !== nodesKey || previousEdgesKeyRef.current !== edgesKey
    const fixedLayoutChanged = previousFixedLayoutRef.current !== fixedLayout
    previousFixedLayoutRef.current = fixedLayout

    // Cheap path: structure unchanged → sync labels + classes, and react to a
    // fixedLayout toggle (snap to baked/cached positions when turning on, or
    // re-run cose when turning off).
    if (!structureChanged) {
      nodes.forEach((node) => {
        const cyNode = cy.getElementById(node.id)
        if (cyNode.length === 0) return
        cyNode.classes(nodeClassesFor(node.id, selectedNodes, expandedNodes, opponentTraits, opponentNeighbors))
        if (cyNode.data('label') !== node.label) {
          cyNode.data('label', node.label)
        }
      })

      if (fixedLayoutChanged) {
        if (fixedLayout) {
          const baked = getBakedLayout(set.id)
          const positions = baked ?? (fixedPositionsRef.current.size > 0 ? fixedPositionsRef.current : null)
          if (positions) {
            positions.forEach((pos, id) => {
              if (baked) fixedPositionsRef.current.set(id, pos)
              const cyNode = cy.getElementById(id)
              if (cyNode.length > 0) cyNode.position(pos)
            })
          }
        } else {
          const layout = cy.layout(relayoutOptions(getViewportScale()) as any)
          layout.run()
        }
      }
      return
    }

    // Snapshot the current camera so we can restore it after structure changes.
    savedViewportRef.current = { zoom: cy.zoom(), pan: cy.pan() }

    if (fixedLayout) {
      // Fixed mode: rebuild from scratch and apply baked or cached positions.
      cy.elements().remove()
      cy.add([
        ...nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            color: oklchToHex(node.color || 'oklch(0.35 0.02 240)'),
            cost: node.cost,
          },
          classes: nodeClassesFor(node.id, selectedNodes, expandedNodes, opponentTraits, opponentNeighbors),
        })),
        ...edges.map((edge) => ({
          data: { id: edge.id, source: edge.source, target: edge.target },
        })),
      ])

      const restoreOrFit = () => {
        if (savedViewportRef.current) cy.viewport(savedViewportRef.current)
        else if (nodes.length > 0) cy.fit(undefined, 50)
      }

      const baked = getBakedLayout(set.id)
      if (baked) {
        baked.forEach((pos, id) => fixedPositionsRef.current.set(id, pos))
        cy.layout({
          name: 'preset',
          positions: (node: any) => baked.get(node.id()),
          fit: false,
          animate: false,
        } as any).run()
        restoreOrFit()
      } else if (fixedPositionsRef.current.size > 0) {
        nodes.forEach((node) => {
          const pos = fixedPositionsRef.current.get(node.id)
          if (pos) {
            const cyNode = cy.getElementById(node.id)
            if (cyNode.length > 0) cyNode.position(pos)
          }
        })
        restoreOrFit()
      } else {
        const layout = cy.layout(relayoutOptions(getViewportScale()) as any)
        layout.run()
        layout.on('layoutstop', () => {
          cy.nodes().forEach((node) => {
            const pos = node.position()
            fixedPositionsRef.current.set(node.id(), { x: pos.x, y: pos.y })
          })
          if (savedViewportRef.current) cy.viewport(savedViewportRef.current)
        })
      }
    } else {
      // Unfixed mode: incremental diff so existing nodes keep their positions,
      // then lock them and let cose lay out only the new ones.
      const incomingNodeIds = new Set(nodes.map((n) => n.id))
      const incomingEdgeIds = new Set(edges.map((e) => e.id))

      cy.nodes().forEach((n) => {
        if (!incomingNodeIds.has(n.id())) n.remove()
      })
      cy.edges().forEach((e) => {
        if (!incomingEdgeIds.has(e.id())) e.remove()
      })

      const newNodeIds: string[] = []
      nodes.forEach((node) => {
        const existing = cy.getElementById(node.id)
        if (existing.length === 0) {
          cy.add({
            group: 'nodes',
            data: {
              id: node.id,
              label: node.label,
              type: node.type,
              color: oklchToHex(node.color || 'oklch(0.35 0.02 240)'),
              cost: node.cost,
            },
            classes: nodeClassesFor(node.id, selectedNodes, expandedNodes, opponentTraits, opponentNeighbors),
          })
          newNodeIds.push(node.id)
        } else {
          existing.classes(nodeClassesFor(node.id, selectedNodes, expandedNodes, opponentTraits, opponentNeighbors))
          if (existing.data('label') !== node.label) existing.data('label', node.label)
        }
      })

      edges.forEach((edge) => {
        if (cy.getElementById(edge.id).length === 0) {
          cy.add({ group: 'edges', data: { id: edge.id, source: edge.source, target: edge.target } })
        }
      })

      // Seed each new node near the centroid of its already-positioned
      // neighbours so cose has a sensible starting point and the simulation
      // doesn't pull old nodes around as it untangles overlap.
      const newNodeIdSet = new Set(newNodeIds)
      newNodeIds.forEach((id) => {
        const newNode = cy.getElementById(id)
        const settledNeighbours = newNode
          .connectedNodes()
          .filter((n: any) => !newNodeIdSet.has(n.id()))
        if (settledNeighbours.length === 0) return
        let sx = 0
        let sy = 0
        settledNeighbours.forEach((n: any) => {
          const p = n.position()
          sx += p.x
          sy += p.y
        })
        const cx = sx / settledNeighbours.length
        const cy0 = sy / settledNeighbours.length
        // Tiny jitter so co-arrivals don't perfectly overlap.
        newNode.position({
          x: cx + (Math.random() - 0.5) * 80,
          y: cy0 + (Math.random() - 0.5) * 80,
        })
      })

      if (newNodeIds.length > 0) {
        const existingNodes = cy.nodes().filter((n: any) => !newNodeIdSet.has(n.id()))
        existingNodes.lock()
        const layout = cy.layout(relayoutOptions(getViewportScale()) as any)
        layout.on('layoutstop', () => existingNodes.unlock())
        layout.run()
      }
      // Don't fit/restore — keep camera exactly where the user left it.
    }

    previousNodesKeyRef.current = nodesKey
    previousEdgesKeyRef.current = edgesKey
  }, [nodes, edges, set, selectedNodes, expandedNodes, opponentTraits, opponentNeighbors, isInitialized, fixedLayout])

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none rounded-lg border-2 border-border bg-background"
    />
  )
}
