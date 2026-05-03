import { useEffect, useRef, useState, useCallback } from 'react'
import cytoscape, { Core, NodeSingular } from 'cytoscape'
import { GraphNode, GraphEdge, VisualizationMode } from '@/lib/types'

interface GraphVisualizationProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  mode: VisualizationMode
  onNodeClick?: (nodeId: string) => void
  onNodeHover?: (nodeId: string | null) => void
  selectedNodes?: string[]
  expandedNodes?: string[]
}

export function GraphVisualization({
  nodes,
  edges,
  mode,
  onNodeClick,
  onNodeHover,
  selectedNodes = [],
  expandedNodes = [],
}: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const hoverTimeoutRef = useRef<number | null>(null)

  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      onNodeHover?.(nodeId)
    }, 50)
  }, [onNodeHover])

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
            'font-size': '11px',
            'font-family': 'Space Grotesk, sans-serif',
            'font-weight': 400,
            width: '70px',
            height: '70px',
            'border-width': '2px',
            'border-color': 'rgba(255, 255, 255, 0.2)',
            'text-outline-width': '0px',
            'text-wrap': 'wrap',
            'text-max-width': '60px',
          },
        },
        {
          selector: 'node[type="champion"]',
          style: {
            'background-color': 'oklch(0.30 0.05 240)',
            shape: 'roundrectangle',
          },
        },
        {
          selector: 'node[type="trait"]',
          style: {
            shape: 'ellipse',
            width: '80px',
            height: '80px',
          },
        },
        {
          selector: 'node.selected',
          style: {
            'border-width': '3px',
            'border-color': 'oklch(0.75 0.15 200)',
          },
        },
        {
          selector: 'node.expanded',
          style: {
            'border-width': '3px',
            'border-color': 'oklch(0.70 0.20 45)',
          },
        },
        {
          selector: 'node:hover',
          style: {
            'border-width': '3px',
            'border-color': 'oklch(0.70 0.20 45)',
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
            'line-color': 'oklch(0.40 0.03 240)',
            'curve-style': 'bezier',
            opacity: 0.4,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            width: 3,
            'line-color': 'oklch(0.75 0.15 200)',
            opacity: 0.8,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 400,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
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
      onNodeClick?.(node.id())
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
      cy.destroy()
    }
  }, [handleNodeHover])

  useEffect(() => {
    if (!cyRef.current || !isInitialized) return

    const cy = cyRef.current

    cy.elements().remove()

    const cyNodes = nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        color: node.color || 'oklch(0.35 0.02 240)',
        cost: node.cost,
      },
      classes: [
        selectedNodes.includes(node.id) ? 'selected' : '',
        expandedNodes.includes(node.id) ? 'expanded' : '',
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

    const layoutOptions =
      mode === 'bipartite'
        ? {
            name: 'breadthfirst',
            directed: false,
            spacingFactor: 1.5,
            animate: true,
            animationDuration: 400,
          }
        : {
            name: 'cose',
            animate: true,
            animationDuration: 400,
            nodeRepulsion: 8000,
            idealEdgeLength: 100,
            edgeElasticity: 100,
            nestingFactor: 1.2,
            gravity: 1,
            numIter: 1000,
            randomize: false,
          }

    const layout = cy.layout(layoutOptions as any)
    layout.run()

    if (nodes.length > 0) {
      cy.fit(undefined, 50)
    }
  }, [nodes, edges, mode, selectedNodes, expandedNodes, isInitialized])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-background rounded-lg border-2 border-border"
    />
  )
}
