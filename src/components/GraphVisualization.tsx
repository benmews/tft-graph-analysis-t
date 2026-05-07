import { useCallback, useEffect, useRef, useState } from 'react'
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
  fixedLayout?: boolean
  largeLabels?: boolean
}

type Viewport = { zoom: number; pan: { x: number; y: number } }

/** Apply pinned/expanded CSS classes to a single Cytoscape node. */
function nodeClassesFor(id: string, selected: string[], expanded: string[]): string {
  const isPinned = selected.includes(id)
  const isExpanded = !isPinned && expanded.includes(id)
  return [isPinned && 'pinned', isExpanded && 'expanded'].filter(Boolean).join(' ')
}

export function GraphVisualization({
  nodes,
  edges,
  set,
  onNodeClick,
  onNodeHover,
  selectedNodes = [],
  expandedNodes = [],
  fixedLayout = false,
  largeLabels = false,
}: GraphVisualizationProps) {
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
        cyNode.classes(nodeClassesFor(node.id, selectedNodes, expandedNodes))
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

    // Save the user's current zoom/pan so we can restore it after structure changes.
    savedViewportRef.current = { zoom: cy.zoom(), pan: cy.pan() }

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
        classes: nodeClassesFor(node.id, selectedNodes, expandedNodes),
      })),
      ...edges.map((edge) => ({
        data: { id: edge.id, source: edge.source, target: edge.target },
      })),
    ])

    const restoreOrFit = () => {
      if (savedViewportRef.current) {
        cy.viewport(savedViewportRef.current)
      } else if (nodes.length > 0) {
        cy.fit(undefined, 50)
      }
    }

    // Prefer baked positions when available — every visitor sees the same
    // layout that was captured at build time.
    const baked = fixedLayout ? getBakedLayout(set.id) : null
    if (baked) {
      baked.forEach((pos, id) => fixedPositionsRef.current.set(id, pos))
      const layout = cy.layout({
        name: 'preset',
        positions: (node: any) => baked.get(node.id()),
        fit: false,
        animate: false,
      } as any)
      layout.run()
      restoreOrFit()
    } else if (fixedLayout && fixedPositionsRef.current.size > 0) {
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

      if (fixedLayout) {
        layout.on('layoutstop', () => {
          cy.nodes().forEach((node) => {
            const pos = node.position()
            fixedPositionsRef.current.set(node.id(), { x: pos.x, y: pos.y })
          })
        })
      }

      if (savedViewportRef.current) {
        const saved = savedViewportRef.current
        layout.on('layoutstop', () => cy.viewport(saved))
      } else if (nodes.length > 0) {
        cy.fit(undefined, 50)
      }
    }

    previousNodesKeyRef.current = nodesKey
    previousEdgesKeyRef.current = edgesKey
  }, [nodes, edges, set, selectedNodes, expandedNodes, isInitialized, fixedLayout])

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none rounded-lg border-2 border-border bg-background"
    />
  )
}
