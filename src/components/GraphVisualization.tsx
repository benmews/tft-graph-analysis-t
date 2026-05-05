import { useEffect, useRef, useState, useCallback } from 'react'
import cytoscape, { Core, NodeSingular } from 'cytoscape'
import { GraphNode, GraphEdge, VisualizationMode, LayoutMode } from '@/lib/types'
import { oklchToHex } from '@/lib/color-utils'

interface GraphVisualizationProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  mode: VisualizationMode
  layoutMode: LayoutMode
  onNodeClick?: (nodeId: string) => void
  onNodeHover?: (nodeId: string | null) => void
  selectedNodes?: string[]
  expandedNodes?: string[]
  fixedLayout?: boolean
}

export function GraphVisualization({
  nodes,
  edges,
  mode,
  layoutMode,
  onNodeClick,
  onNodeHover,
  selectedNodes = [],
  expandedNodes = [],
  fixedLayout = false,
}: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const hoverTimeoutRef = useRef<number | null>(null)
  const onNodeHoverRef = useRef(onNodeHover)
  const onNodeClickRef = useRef(onNodeClick)
  const previousNodesRef = useRef<string>('')
  const previousEdgesRef = useRef<string>('')
  const previousLayoutModeRef = useRef<LayoutMode>(layoutMode)
  const fixedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const savedZoomRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null)

  useEffect(() => {
    onNodeHoverRef.current = onNodeHover
    onNodeClickRef.current = onNodeClick
  })

  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      onNodeHoverRef.current?.(nodeId)
    }, 50)
  }, [])

  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    const s = Math.min(1, Math.max(0.55, window.innerWidth / 768))
    const px = (n: number) => `${Math.round(n * s)}px`

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': px(14),
            'font-family': 'Space Grotesk, sans-serif',
            'font-weight': 600,
            width: px(80),
            height: px(80),
            'border-width': px(2),
            'border-color': '#707070',
            'border-opacity': 0.2,
            'text-outline-width': '2px',
            'text-outline-color': '#000000',
            'text-wrap': 'wrap',
            'text-max-width': px(70),
          },
        },
        {
          selector: 'node[type="champion"]',
          style: {
            shape: 'roundrectangle',
          },
        },
        {
          selector: 'node[type="trait"]',
          style: {
            shape: 'ellipse',
            width: px(85),
            height: px(85),
            'text-max-width': px(75),
          },
        },
        {
          selector: 'node.pinned',
          style: {
            width: px(120),
            height: px(120),
            'border-width': px(14),
            'border-color': '#FFD700',
            'border-style': 'solid',
            'border-opacity': 1,
            'text-max-width': px(110),
            'font-size': px(16),
            'overlay-color': '#FFD700',
            'overlay-opacity': 0.3,
            'overlay-padding': px(8),
          },
        },
        {
          selector: 'node[type="trait"].pinned',
          style: {
            width: px(125),
            height: px(125),
            'text-max-width': px(115),
          },
        },
        {
          selector: 'node.expanded',
          style: {
            'border-width': px(4),
            'border-color': '#000000',
            'border-opacity': 1,
            'border-style': 'dotted',
          },
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#535863',
            'curve-style': 'bezier',
            opacity: 0.4,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            width: 3,
            'line-color': '#7db8c9',
            opacity: 0.8,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 400,
        nodeRepulsion: 4000,
        idealEdgeLength: Math.round(250 * s),
        edgeElasticity: 100,
        nestingFactor: 1.2,
        gravity: 1,
        numIter: 1000,
        randomize: false,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.5,
      maxZoom: 3,
    })

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      onNodeClickRef.current?.(node.id())
    })

    cy.on('taphold', 'node', (evt) => {
      const node = evt.target
      handleNodeHover(node.id())
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        handleNodeHover(null)
      }
    })

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      handleNodeHover(node.id())
    })

    cy.on('mouseout', 'node', () => {
      handleNodeHover(null)
    })

    cyRef.current = cy
    setIsInitialized(true)

    if (import.meta.env.DEV) {
      ;(window as any).__cy = cy
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (cy && !cy.destroyed()) {
        cy.destroy()
      }
      cyRef.current = null
    }
  }, [handleNodeHover])

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
      if (majorChange) {
        cy.fit(undefined, 50)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!cyRef.current || !isInitialized) return

    const cy = cyRef.current
    
    const currentNodesKey = nodes.map(n => n.id).sort().join(',')
    const currentEdgesKey = edges.map(e => `${e.source}-${e.target}`).sort().join(',')
    
    const structureChanged = 
      previousNodesRef.current !== currentNodesKey || 
      previousEdgesRef.current !== currentEdgesKey
    
    const layoutModeChanged = previousLayoutModeRef.current !== layoutMode

    if (structureChanged || layoutModeChanged) {
      if (structureChanged && !layoutModeChanged) {
        savedZoomRef.current = {
          zoom: cy.zoom(),
          pan: cy.pan()
        }
      }

      cy.elements().remove()

      const cyNodes = nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          color: oklchToHex(node.color || 'oklch(0.35 0.02 240)'),
          cost: node.cost,
        },
        classes: [
          selectedNodes.includes(node.id) ? 'pinned' : '',
          expandedNodes.includes(node.id) && !selectedNodes.includes(node.id) ? 'expanded' : '',
        ]
          .filter(Boolean)
          .join(' '),
      }))

      const cyEdges = edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
        },
      }))

      cy.add([...cyNodes, ...cyEdges])

      if (fixedLayout && fixedPositionsRef.current.size > 0) {
        nodes.forEach((node) => {
          const position = fixedPositionsRef.current.get(node.id)
          if (position) {
            const cyNode = cy.getElementById(node.id)
            if (cyNode.length > 0) {
              cyNode.position(position)
            }
          }
        })

        if (savedZoomRef.current && structureChanged && !layoutModeChanged) {
          cy.viewport({
            zoom: savedZoomRef.current.zoom,
            pan: savedZoomRef.current.pan
          })
        } else if (nodes.length > 0) {
          cy.fit(undefined, 50)
        }
      } else {
        const s = Math.min(1, Math.max(0.55, window.innerWidth / 768))
      const layoutOptions =
          layoutMode === 'spring'
            ? {
                name: 'cose',
                animate: true,
                animationDuration: 400,
                nodeRepulsion: 2000,
                idealEdgeLength: Math.round(120 * s),
                edgeElasticity: 100,
                nestingFactor: 1.2,
                gravity: 1,
                numIter: 1000,
                randomize: false,
              }
            : {
                name: 'breadthfirst',
                directed: false,
                spacingFactor: 1.0,
                animate: true,
                animationDuration: 400,
              }

        const layout = cy.layout(layoutOptions as any)
        layout.run()

        if (fixedLayout) {
          layout.on('layoutstop', () => {
            cy.nodes().forEach((node) => {
              const pos = node.position()
              fixedPositionsRef.current.set(node.id(), { x: pos.x, y: pos.y })
            })
          })
        }

        if (savedZoomRef.current && structureChanged && !layoutModeChanged) {
          layout.on('layoutstop', () => {
            cy.viewport({
              zoom: savedZoomRef.current!.zoom,
              pan: savedZoomRef.current!.pan
            })
          })
        } else if (nodes.length > 0) {
          cy.fit(undefined, 50)
        }
      }

      previousNodesRef.current = currentNodesKey
      previousEdgesRef.current = currentEdgesKey
      previousLayoutModeRef.current = layoutMode
    } else {
      nodes.forEach((node) => {
        const cyNode = cy.getElementById(node.id)
        if (cyNode.length > 0) {
          const classes = [
            selectedNodes.includes(node.id) ? 'pinned' : '',
            expandedNodes.includes(node.id) && !selectedNodes.includes(node.id) ? 'expanded' : '',
          ]
            .filter(Boolean)
            .join(' ')
          
          cyNode.classes(classes)
        }
      })
    }
  }, [nodes, edges, mode, layoutMode, selectedNodes, expandedNodes, isInitialized, fixedLayout])

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none rounded-lg border-2 border-border bg-background"
    />
  )
}
