import { useEffect, useMemo, useState } from 'react'
import { ControlsPanel, type ControlsPanelProps } from './components/ControlsPanel'
import { DesktopHeader } from './components/DesktopHeader'
import { GraphVisualization } from './components/GraphVisualization'
import { MobileHeader } from './components/MobileHeader'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './components/ui/drawer'
import { computeVisibleNodes, generateBipartiteGraph } from './lib/graph-utils'
import { set17, tftSets } from './lib/tft-data'
import type { TFTSet } from './lib/types'

function App() {
  const [currentSet, setCurrentSet] = useState<TFTSet>(set17)
  const [selectedChampions, setSelectedChampions] = useState<string[]>([])
  const [expandedNodes, setExpandedNodes] = useState<string[]>([])
  const [opponentTraits, setOpponentTraits] = useState<string[]>([])
  const [fixedLayout, setFixedLayout] = useState(true)
  const [sortBy, setSortBy] = useState<'alphabetical' | 'cost'>('alphabetical')
  const [filterText, setFilterText] = useState('')
  const [enabledCosts, setEnabledCosts] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))
  const [controlsOpen, setControlsOpen] = useState(false)
  const [useShortLabels, setUseShortLabels] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showUniqueTraits, setShowUniqueTraits] = useState(true)
  const [showUniqueChampions, setShowUniqueChampions] = useState(false)
  const [tidyCounter, setTidyCounter] = useState(0)

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
    () => generateBipartiteGraph(currentSet),
    [currentSet],
  )

  const visibleNodes = useMemo(
    () =>
      computeVisibleNodes(allNodes, allEdges, {
        selectedChampions,
        expandedNodes,
        opponentTraits,
        enabledCosts,
        fixedLayout,
        showUniqueTraits,
        showUniqueChampions,
      }),
    [
      allNodes,
      allEdges,
      selectedChampions,
      expandedNodes,
      opponentTraits,
      enabledCosts,
      fixedLayout,
      showUniqueTraits,
      showUniqueChampions,
    ],
  )

  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((n) => n.id))
    return allEdges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
  }, [visibleNodes, allEdges])

  const displayNodes = useMemo(
    () =>
      useShortLabels
        ? visibleNodes.map((n) => ({ ...n, label: n.shortLabel ?? n.label }))
        : visibleNodes,
    [visibleNodes, useShortLabels],
  )

  /**
   * Click semantics:
   *   - Trait node: cycle unselected → expanded → opponent-selected → unselected.
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
      const isOpponent = opponentTraits.includes(nodeId)
      const isExpanded = expandedNodes.includes(nodeId)
      if (isOpponent) {
        setOpponentTraits((prev) => prev.filter((id) => id !== nodeId))
      } else if (isExpanded) {
        setExpandedNodes((prev) => prev.filter((id) => id !== nodeId))
        setOpponentTraits((prev) => [...prev, nodeId])
      } else {
        setExpandedNodes((prev) => [...prev, nodeId])
      }
    }
  }

  const handleResetExpansions = () => setExpandedNodes([])
  const handleResetAll = () => {
    setExpandedNodes([])
    setSelectedChampions([])
    setOpponentTraits([])
  }
  const handleExpandAll = () => {
    // Trait → total champions in the data, used to detect unique traits.
    const traitChampCount = new Map<string, number>()
    for (const c of currentSet.champions) {
      for (const t of c.traits) {
        traitChampCount.set(t, (traitChampCount.get(t) ?? 0) + 1)
      }
    }
    const ids: string[] = []
    for (const c of currentSet.champions) {
      if (enabledCosts.has(c.cost)) ids.push(`champion-${c.id}`)
    }
    for (const t of currentSet.traits) {
      const count = traitChampCount.get(t.id) ?? 0
      if (count === 0) continue
      if (!showUniqueTraits && count <= 1) continue
      ids.push(`trait-${t.id}`)
    }
    setExpandedNodes(ids)
  }
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

  const handleLabelModeToggle = () => setUseShortLabels((v) => !v)
  const handleSidebarToggle = () => setSidebarOpen((v) => !v)
  const handleUniqueTraitsToggle = () => setShowUniqueTraits((v) => !v)
  const handleUniqueChampionsToggle = () => setShowUniqueChampions((v) => !v)
  const handleTidyLayout = () => setTidyCounter((c) => c + 1)
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
    const q = filterText.toLowerCase()
    const filtered = q
      ? currentSet.champions.filter((c) =>
          c.name.toLowerCase().includes(q) || (c.shortLabel?.toLowerCase().includes(q) ?? false),
        )
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
    showUniqueTraits,
    showUniqueChampions,
    onUniqueTraitsToggle: handleUniqueTraitsToggle,
    onUniqueChampionsToggle: handleUniqueChampionsToggle,
  }

  // Dev-only test hook for canvas node clicks (used by Playwright tests)
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as any).__tftClickNode = handleNodeClick
    }
  })

  const headerProps = {
    currentSet,
    fixedLayout,
    useShortLabels,
    sidebarOpen,
    onSetChange: handleSetChange,
    onFixedLayoutToggle: handleFixedLayoutToggle,
    onLabelModeToggle: handleLabelModeToggle,
    onSidebarToggle: handleSidebarToggle,
    onTidyLayout: handleTidyLayout,
    onExpandAll: handleExpandAll,
    onResetExpansions: handleResetExpansions,
    onResetAll: handleResetAll,
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:flex-row md:pb-[env(safe-area-inset-bottom)] md:pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:gap-1 md:px-3 md:pb-3 md:pt-1.5">
        <header className="relative z-10 shrink-0">
          <DesktopHeader {...headerProps} />
          <MobileHeader {...headerProps} controlsOpen={controlsOpen} onControlsToggle={handleControlsToggle} />
        </header>

        <div className="relative z-0 min-h-[min(50dvh,28rem)] flex-1 touch-none overflow-hidden rounded-lg md:min-h-0">
          <GraphVisualization
            nodes={displayNodes}
            edges={visibleEdges}
            set={currentSet}
            onNodeClick={handleNodeClick}
            selectedNodes={selectedChampions.map((id) => `champion-${id}`)}
            expandedNodes={expandedNodes}
            opponentTraits={opponentTraits}
            fixedLayout={fixedLayout}
            largeLabels={useShortLabels}
            tidyTrigger={tidyCounter}
          />
        </div>
      </div>

      <aside
        className={`${sidebarOpen ? 'md:flex' : 'md:hidden'} hidden w-[32rem] shrink-0 flex-col border-border border-l bg-card p-4 pt-1.5`}
      >
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
