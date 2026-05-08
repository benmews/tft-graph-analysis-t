/**
 * Cytoscape style + layout configuration.
 *
 * Sizes scale with viewport width so the graph renders sensibly on phones.
 * `getViewportScale` clamps to [0.55, 1] (so very narrow viewports keep nodes
 * tappable; desktop and above use the full design size).
 */

export function getViewportScale(): number {
  return Math.min(1, Math.max(0.55, window.innerWidth / 768))
}

export function buildCytoscapeStyles(scale: number, largeLabels = false): any[] {
  const px = (n: number) => `${Math.round(n * scale)}px`
  const baseFont = largeLabels ? 21 : 14
  const pinnedFont = largeLabels ? 23 : 16

  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        label: 'data(label)',
        color: '#ffffff',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': px(baseFont),
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
    { selector: 'node[type="champion"]', style: { shape: 'roundrectangle' } },
    {
      selector: 'node[type="trait"]',
      style: { shape: 'ellipse', width: px(85), height: px(85), 'text-max-width': px(75) },
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
        'font-size': px(pinnedFont),
        'overlay-color': '#FFD700',
        'overlay-opacity': 0.3,
        'overlay-padding': px(8),
      },
    },
    {
      selector: 'node[type="trait"].pinned',
      style: { width: px(125), height: px(125), 'text-max-width': px(115) },
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
      selector: 'node.opponent-neighbor',
      style: {
        'border-width': px(4),
        'border-color': '#fca5a5',
        'border-style': 'solid',
        'border-opacity': 1,
        'overlay-color': '#fca5a5',
        'overlay-opacity': 0.18,
        'overlay-padding': px(2),
      },
    },
    {
      selector: 'node.opponent-trait',
      style: {
        'border-width': px(12),
        'border-color': '#dc2626',
        'border-style': 'solid',
        'border-opacity': 1,
      },
    },
    {
      selector: 'node.uncontested-near',
      style: {
        'border-width': px(4),
        'border-color': '#86efac',
        'border-style': 'solid',
        'border-opacity': 1,
      },
    },
    {
      selector: 'node.uncontested-far',
      style: {
        'border-width': px(10),
        'border-color': '#16a34a',
        'border-style': 'solid',
        'border-opacity': 1,
      },
    },
    { selector: 'node:active', style: { 'overlay-opacity': 0 } },
    {
      selector: 'edge',
      style: { width: 2, 'line-color': '#535863', 'curve-style': 'bezier', opacity: 0.4 },
    },
    {
      selector: 'edge.highlighted',
      style: { width: 3, 'line-color': '#7db8c9', opacity: 0.8 },
    },
  ]
}

/** Layout used at initial graph mount. Wider edges to give the full set room. */
export function initialLayoutOptions(scale: number) {
  return {
    name: 'cose',
    animate: true,
    animationDuration: 400,
    nodeRepulsion: 4000,
    idealEdgeLength: Math.round(250 * scale),
    edgeElasticity: 100,
    nestingFactor: 1.2,
    gravity: 1,
    numIter: 1000,
    randomize: false,
  }
}

/** Layout used for re-runs after structural changes (tighter edges than initial). */
export function relayoutOptions(scale: number) {
  return {
    name: 'cose',
    animate: true,
    animationDuration: 400,
    nodeRepulsion: 2000,
    idealEdgeLength: Math.round(120 * scale),
    edgeElasticity: 100,
    nestingFactor: 1.2,
    gravity: 1,
    numIter: 1000,
    randomize: false,
  }
}
