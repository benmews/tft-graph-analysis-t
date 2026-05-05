import { useEffect, useMemo, useState } from 'react'
import { ControlsPanel, type ControlsPanelProps } from './components/ControlsPanel'
import { DesktopHeader } from './components/DesktopHeader'
import { GraphVisualization } from './components/GraphVisualization'
import { MobileHeader } from './components/MobileHeader'
import { Card, CardContent } from './components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './components/ui/drawer'
import { computeVisibleNodes, generateBipartiteGraph, generateTraitEdgeGraph } from './lib/graph-utils'
import { set17, tftSets } from './lib/tft-data'
import type { LayoutMode, TFTSet, VisualizationMode } from './lib/types'

function App() {
  const [currentSet, setCurrentSet] = useState<TFTSet>(set17)
  const [mode, setMode] = useState<VisualizationMode>('bipartite')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('spring')
  const [selectedChampions, setSelectedChampions] = useState<string[]>([])
  const [expandedNodes, setExpandedNodes] = useState<string[]>([])
  const [fixedLayout, setFixedLayout] = useState(true)
  const [sortBy, setSortBy] = useState<'alphabetical' | 'cost'>('alphabetical')
  const [filterText, setFilterText] = useState('')
  const [enabledCosts, setEnabledCosts] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [controlsOpen, setControlsOpen] = useState(false)

  // Auto-close the mobile drawer when the viewport widens past the md breakpoint
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const onChange = () => {
      if (mql.matches) setControlsOpen(false)
    }
    mql.addEventListener('change', onChange)
    onChange()
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const { nodes: allNodes, edges: allEdges } = useMemo(
    () => (mode === 'bipartite' ? generateBipartiteGraph(currentSet) : generateTraitEdgeGraph(currentSet)),
    [mode, currentSet],
  )

  const visibleNodes = useMemo(
    () =>
      computeVisibleNodes(allNodes, allEdges, {
        mode,
        selectedChampions,
        expandedNodes,
        enabledCosts,
        fixedLayout,
      }),
    [allNodes, allEdges, mode, selectedChampions, expandedNodes, enabledCosts, fixedLayout],
  )

  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((n) => n.id))
    return allEdges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
  }, [visibleNodes, allEdges])

  /**
   * Click semantics:
   *   - Trait node: toggle unselected ↔ expanded.
   *   - Champion node: cycle unselected → expanded → selected → unselected.
   */
  const handleNodeClick = (nodeId: string) => {
    if (nodeId.startsWith('champion-')) {
      const championId = nodeId.replace('champion-', '')
      const isSelected = selectedChampions.includes(championId)
      const isExpanded = expandedNodes.includes(nodeId)

      if (isSelected) {
        setSelectedChampions((prev) => prev.filter((id) => id !== championId))
      } else if (isExpanded) {
        setExpandedNodes((prev) => prev.filter((id) => id !== nodeId))
        setSelectedChampions((prev) => [...prev, championId])
      } else {
        setExpandedNodes((prev) => [...prev, nodeId])
      }
    } else {
      setExpandedNodes((prev) =>
        prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
      )
    }
  }

  const handleResetExpansions = () => setExpandedNodes([])
  const handleResetAll = () => {
    setExpandedNodes([])
    setSelectedChampions([])
  }
  const handleExpandAll = () => setExpandedNodes(visibleNodes.map((n) => n.id))
  const handleModeToggle = () => setMode((m) => (m === 'bipartite' ? 'traits-as-edges' : 'bipartite'))
  const handleLayoutToggle = () =>
    setLayoutMode((l) => (l === 'hierarchical' ? 'spring' : 'hierarchical'))
  const handleFixedLayoutToggle = () => setFixedLayout((v) => !v)
  const handleControlsToggle = () => {
    if (controlsOpen) setControlsOpen(false)
    else queueMicrotask(() => setControlsOpen(true))
  }

  const handleCostToggle = (cost: number) => {
    setEnabledCosts((prev) => {
      const next = new Set(prev)
      if (next.has(cost)) next.delete(cost)
      else next.add(cost)
      return next
    })
  }

  const handleSetChange = (setId: string) => {
    const next = tftSets.find((s) => s.id === setId)
    if (next) {
      setCurrentSet(next)
      setSelectedChampions([])
      setExpandedNodes([])
    }
  }

  const selectedChampionNodes = visibleNodes.filter(
    (node) => node.type === 'champion' && selectedChampions.includes(node.id.replace('champion-', '')),
  )

  const sortedAndFilteredChampions = useMemo(() => {
    const filtered = filterText
      ? currentSet.champions.filter((c) => c.name.toLowerCase().includes(filterText.toLowerCase()))
      : [...currentSet.champions]
    return filtered.sort((a, b) =>
      sortBy === 'alphabetical' ? a.name.localeCompare(b.name) : a.cost - b.cost,
    )
  }, [currentSet.champions, sortBy, filterText])

  const controlsProps: ControlsPanelProps = {
    currentSet,
    enabledCosts,
    onCostToggle: handleCostToggle,
    selectedChampionNodes,
    filterText,
    onFilterTextChange: setFilterText,
    sortBy,
    onSortByChange: setSortBy,
    sortedAndFilteredChampions,
    selectedChampions,
    onToggleChampion: (id, add) =>
      setSelectedChampions((prev) => (add ? [...prev, id] : prev.filter((x) => x !== id))),
    visibleNodeCount: visibleNodes.length,
    expandedNodeCount: expandedNodes.length,
  }

  // Dev-only test hook for canvas node clicks (used by Playwright tests)
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as any).__tftClickNode = handleNodeClick
    }
  })

  const headerProps = {
    currentSet,
    mode,
    layoutMode,
    fixedLayout,
    onSetChange: handleSetChange,
    onModeToggle: handleModeToggle,
    onLayoutToggle: handleLayoutToggle,
    onFixedLayoutToggle: handleFixedLayoutToggle,
    onExpandAll: handleExpandAll,
    onResetExpansions: handleResetExpansions,
    onResetAll: handleResetAll,
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:flex-row md:pb-[env(safe-area-inset-bottom)] md:pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:gap-4 md:p-6">
        <header className="relative z-10 shrink-0 space-y-3">
          <DesktopHeader {...headerProps} />
          <MobileHeader {...headerProps} controlsOpen={controlsOpen} onControlsToggle={handleControlsToggle} />
        </header>

        <div className="relative z-0 min-h-[min(50dvh,28rem)] flex-1 touch-none overflow-hidden rounded-lg md:min-h-0">
          <GraphVisualization
            nodes={visibleNodes}
            edges={visibleEdges}
            mode={mode}
            layoutMode={layoutMode}
            onNodeClick={handleNodeClick}
            selectedNodes={selectedChampions.map((id) => `champion-${id}`)}
            expandedNodes={expandedNodes}
            fixedLayout={fixedLayout}
          />
        </div>

        <Card className="relative z-10 shrink-0 bg-card/50 backdrop-blur">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-2 text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono">{visibleNodes.length} nodes</span>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono">{visibleEdges.length} edges</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">
                  {mode === 'bipartite' ? 'Bipartite graph' : 'Trait edge graph'}
                </span>
              </div>
              <p className="text-xs md:text-xs">
                <span className="md:hidden">Tap nodes to expand · Pinch to zoom · Drag to pan</span>
                <span className="hidden md:inline">
                  Click nodes to expand neighbors · Scroll to zoom · Drag to pan
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="hidden w-96 shrink-0 flex-col gap-4 overflow-y-auto border-border border-l bg-card p-6 md:flex">
        <h2 className="text-xl font-semibold">Controls</h2>
        <ControlsPanel {...controlsProps} />
      </aside>

      <Drawer open={controlsOpen} onOpenChange={setControlsOpen} shouldScaleBackground={false}>
        <DrawerContent
          id="mobile-controls-sheet"
          aria-labelledby="mobile-controls-title"
          className="max-h-[92dvh] gap-0 border-t p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <DrawerHeader className="shrink-0 border-b px-4 py-3 text-left">
            <DrawerTitle id="mobile-controls-title">Controls</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[min(78dvh,calc(92dvh-4rem))] overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
            <ControlsPanel {...controlsProps} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default App
