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
            'font-size': '14px',
            'font-family': 'Space Grotesk, sans-serif',
            'font-weight': 600,
            width: '80px',
            height: '80px',
            'border-width': '2px',
            'border-color': '#707070',
            'border-opacity': 0.2,
            'text-outline-width': '2px',
            'text-outline-color': '#000000',
            'text-wrap': 'wrap',
            'text-max-width': '70px',
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
            width: '85px',
            height: '85px',
            'text-max-width': '75px',
          },
        },
        {
          selector: 'node.pinned',
          style: {
            width: '120px',
            height: '120px',
            'border-width': '4px',
            'border-color': '#f4b740',
            'border-style': 'solid',
            'text-max-width': '110px',
            'font-size': '16px',
          },
        },
        {
          selector: 'node[type="trait"].pinned',
          style: {
            width: '125px',
            height: '125px',
            'text-max-width': '115px',
          },
        },
        {
          selector: 'node.expanded',
          style: {
            'border-width': '4px',
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
        idealEdgeLength: 250,
        edgeElasticity: 100,
        nestingFactor: 1.2,
        gravity: 1,
        numIter: 1000,
        randomize: false,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.3,
      maxZoom: 3,
    })

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      onNodeClickRef.current?.(node.id())
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
    if (!cyRef.current || !isInitialized) return

    const cy = cyRef.current
    
    const currentNodesKey = nodes.map(n => n.id).sort().join(',')
    const currentEdgesKey = edges.map(e => `${e.source}-${e.target}`).sort().join(',')
    
    const structureChanged = 
      previousNodesRef.current !== currentNodesKey || 
      previousEdgesRef.current !== currentEdgesKey
    
    const layoutModeChanged = previousLayoutModeRef.current !== layoutMode

    if (structureChanged || layoutModeChanged) {
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

        if (nodes.length > 0) {
          cy.fit(undefined, 50)
        }
      } else {
        const layoutOptions =
          layoutMode === 'spring'
            ? {
                name: 'cose',
                animate: true,
                animationDuration: 400,
                nodeRepulsion: 2000,
                idealEdgeLength: 120,
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

        if (nodes.length > 0) {
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
      className="w-full h-full bg-background rounded-lg border-2 border-border"
    />
  )
}
