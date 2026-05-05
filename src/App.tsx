import { useState, useMemo, useEffect } from 'react'
import { GraphVisualization } from './components/GraphVisualization'
import { ControlsPanel, type ControlsPanelProps } from './components/ControlsPanel'
import { tftSets, set17 } from './lib/tft-data'
import { generateBipartiteGraph, generateTraitEdgeGraph, findNeighbors } from './lib/graph-utils'
import { VisualizationMode, TFTSet, LayoutMode } from './lib/types'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import {
  ArrowsLeftRight,
  Graph,
  Plus,
  ArrowsClockwise,
  Lock,
  List,
  SlidersHorizontal,
} from '@phosphor-icons/react'

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

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const onChange = () => {
      if (mql.matches) setControlsOpen(false)
    }
    mql.addEventListener('change', onChange)
    onChange()
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const { nodes: allNodes, edges: allEdges } = useMemo(() => {
    if (mode === 'bipartite') {
      return generateBipartiteGraph(currentSet, selectedChampions)
    } else {
      return generateTraitEdgeGraph(currentSet, selectedChampions)
    }
  }, [mode, selectedChampions, currentSet])

  const visibleNodes = useMemo(() => {
    const filteredNodes = allNodes.filter((node) => {
      if (node.type === 'champion' && node.cost !== undefined) {
        return enabledCosts.has(node.cost)
      }
      return true
    })

    if (fixedLayout && expandedNodes.length === 0 && selectedChampions.length === 0) {
      return filteredNodes
    }

    if (expandedNodes.length === 0 && selectedChampions.length === 0) {
      return filteredNodes.slice(0, 15)
    }

    const visible = new Set<string>()

    selectedChampions.forEach((champId) => {
      const nodeId = `champion-${champId}`
      visible.add(nodeId)

      const hops = mode === 'traits-as-edges' ? 1 : 2
      const neighbors = findNeighbors(nodeId, allEdges, hops)
      neighbors.forEach((n) => visible.add(n))

      if (mode === 'bipartite') {
        const revealedChampions = Array.from(neighbors).filter((n) => n.startsWith('champion-'))

        revealedChampions.forEach((champ1) => {
          revealedChampions.forEach((champ2) => {
            if (champ1 !== champ2) {
              allEdges.forEach((edge) => {
                if (
                  (edge.source === champ1 && edge.target === champ2) ||
                  (edge.source === champ2 && edge.target === champ1)
                ) {
                  return
                }

                if (
                  (edge.source === champ1 && edge.target.startsWith('trait-')) ||
                  (edge.target === champ1 && edge.source.startsWith('trait-'))
                ) {
                  const traitNode = edge.source.startsWith('trait-') ? edge.source : edge.target

                  const hasConnection = allEdges.some(
                    (e) =>
                      (e.source === champ2 && e.target === traitNode) ||
                      (e.target === champ2 && e.source === traitNode)
                  )

                  if (hasConnection && !visible.has(traitNode)) {
                    const isDirectNeighbor = neighbors.has(traitNode)
                    if (!isDirectNeighbor) {
                      visible.add(traitNode)
                    }
                  }
                }
              })
            }
          })
        })
      }
    })

    expandedNodes.forEach((nodeId) => {
      visible.add(nodeId)

      if (nodeId.startsWith('trait-')) {
        const neighbors = findNeighbors(nodeId, allEdges, 1)
        neighbors.forEach((n) => {
          if (n.startsWith('champion-')) {
            visible.add(n)
          }
        })
      } else if (nodeId.startsWith('champion-')) {
        const directNeighbors = findNeighbors(nodeId, allEdges, 1)
        directNeighbors.forEach((n) => visible.add(n))

        if (mode === 'bipartite') {
          const traitNeighbors = Array.from(directNeighbors).filter((n) => n.startsWith('trait-'))
          traitNeighbors.forEach((traitId) => {
            const championsOfTrait = findNeighbors(traitId, allEdges, 1)
            championsOfTrait.forEach((champId) => {
              if (champId.startsWith('champion-')) {
                visible.add(champId)
              }
            })
          })
        }
      }
    })

    return filteredNodes.filter((node) => visible.has(node.id))
  }, [allNodes, allEdges, selectedChampions, expandedNodes, layoutMode, mode, fixedLayout, enabledCosts])

  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))
    return allEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )
  }, [visibleNodes, allEdges])

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
      setExpandedNodes((prev) => {
        if (prev.includes(nodeId)) {
          return prev.filter((id) => id !== nodeId)
        }
        return [...prev, nodeId]
      })
    }
  }

  const handleResetExpansions = () => {
    setExpandedNodes([])
  }

  const handleResetAll = () => {
    setExpandedNodes([])
    setSelectedChampions([])
  }

  const handleCostToggle = (cost: number) => {
    setEnabledCosts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(cost)) {
        newSet.delete(cost)
      } else {
        newSet.add(cost)
      }
      return newSet
    })
  }

  const handleExpandAll = () => {
    const allVisibleNodeIds = visibleNodes.map((node) => node.id)
    setExpandedNodes(allVisibleNodeIds)
  }

  const handleSetChange = (setId: string) => {
    const newSet = tftSets.find((s) => s.id === setId)
    if (newSet) {
      setCurrentSet(newSet)
      setSelectedChampions([])
      setExpandedNodes([])
    }
  }

  const handleModeToggle = () => {
    setMode((m) => (m === 'bipartite' ? 'traits-as-edges' : 'bipartite'))
  }

  const handleLayoutToggle = () => {
    setLayoutMode((l) => (l === 'hierarchical' ? 'spring' : 'hierarchical'))
  }

  const selectedChampionNodes = visibleNodes.filter(
    (node) => node.type === 'champion' && selectedChampions.includes(node.id.replace('champion-', ''))
  )

  const sortedAndFilteredChampions = useMemo(() => {
    let champions = [...currentSet.champions]

    if (filterText) {
      champions = champions.filter((champion) =>
        champion.name.toLowerCase().includes(filterText.toLowerCase())
      )
    }

    champions.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name)
      } else {
        return a.cost - b.cost
      }
    })

    return champions
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
    onToggleChampion: (id, add) => {
      if (add) {
        setSelectedChampions((prev) => [...prev, id])
      } else {
        setSelectedChampions((prev) => prev.filter((x) => x !== id))
      }
    },
    visibleNodeCount: visibleNodes.length,
    expandedNodeCount: expandedNodes.length,
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as any).__tftClickNode = handleNodeClick
    }
  })

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:flex-row md:pb-[env(safe-area-inset-bottom)] md:pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:gap-4 md:p-6">
        <header className="relative z-10 shrink-0 space-y-3">
          <div className="hidden items-center justify-between gap-4 md:flex">
            <div className="flex min-w-0 items-center gap-3">
              <Graph size={32} className="shrink-0 text-accent" weight="duotone" />
              <h1 className="truncate text-3xl font-bold tracking-tight">TFT Graph Analysis</h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 lg:gap-4">
              <Select value={currentSet.id} onValueChange={handleSetChange}>
                <SelectTrigger className="w-[200px] lg:w-[240px]">
                  <SelectValue placeholder="Select TFT Set" />
                </SelectTrigger>
                <SelectContent>
                  {tftSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleModeToggle} variant="outline" className="gap-2">
                <ArrowsLeftRight />
                {mode === 'bipartite' ? 'Bipartite' : 'Trait Edges'}
              </Button>

              <Button onClick={handleLayoutToggle} variant="outline" className="gap-2">
                <Graph weight="duotone" />
                {layoutMode === 'hierarchical' ? 'Hierarchical' : 'Spring'}
              </Button>

              <Button
                onClick={() => setFixedLayout(!fixedLayout)}
                variant={fixedLayout ? 'default' : 'outline'}
                className="gap-2"
              >
                <Lock weight={fixedLayout ? 'fill' : 'regular'} />
                Fixed Layout
              </Button>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExpandAll} variant="outline" className="gap-2">
                  <Plus weight="bold" />
                  Expand All Nodes
                </Button>
                <Button onClick={handleResetExpansions} variant="outline" className="gap-2">
                  <ArrowsClockwise />
                  Reset Expansions
                </Button>
                <Button onClick={handleResetAll} variant="outline" className="gap-2">
                  <ArrowsClockwise weight="bold" />
                  Reset All
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center gap-2">
              <Graph size={28} className="shrink-0 text-accent" weight="duotone" />
              <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">
                TFT Graph Analysis
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="coarse:size-11 shrink-0"
                    aria-label="More graph actions"
                  >
                    <List className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    className="coarse:min-h-11 cursor-pointer"
                    onSelect={() => handleExpandAll()}
                  >
                    <Plus weight="bold" className="size-4" />
                    Expand all nodes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="coarse:min-h-11 cursor-pointer"
                    onSelect={() => handleResetExpansions()}
                  >
                    <ArrowsClockwise className="size-4" />
                    Reset expansions
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="coarse:min-h-11 cursor-pointer"
                    onSelect={() => handleResetAll()}
                  >
                    <ArrowsClockwise weight="bold" className="size-4" />
                    Reset all
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="coarse:min-h-11 cursor-pointer"
                    onSelect={() => setFixedLayout((v) => !v)}
                  >
                    <Lock className="size-4" weight={fixedLayout ? 'fill' : 'regular'} />
                    {fixedLayout ? 'Unlock layout' : 'Lock layout'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant={controlsOpen ? 'default' : 'outline'}
                className="coarse:min-h-11 shrink-0 gap-1.5 px-3"
                onClick={() => {
                  if (controlsOpen) {
                    setControlsOpen(false)
                  } else {
                    queueMicrotask(() => setControlsOpen(true))
                  }
                }}
                aria-expanded={controlsOpen}
                aria-controls="mobile-controls-sheet"
              >
                <SlidersHorizontal className="size-5" />
                Controls
              </Button>
            </div>

            <Select value={currentSet.id} onValueChange={handleSetChange}>
              <SelectTrigger className="coarse:min-h-11 w-full">
                <SelectValue placeholder="Select TFT Set" />
              </SelectTrigger>
              <SelectContent>
                {tftSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleModeToggle}
                variant="outline"
                className="coarse:min-h-11 min-w-[4.5rem] flex-1 gap-2 sm:flex-none"
                title={mode === 'bipartite' ? 'Bipartite graph' : 'Trait edges'}
              >
                <ArrowsLeftRight className="size-5 shrink-0" />
                <span className="truncate">{mode === 'bipartite' ? 'Bipartite' : 'Trait edges'}</span>
              </Button>
              <Button
                type="button"
                onClick={handleLayoutToggle}
                variant="outline"
                className="coarse:min-h-11 min-w-[4.5rem] flex-1 gap-2 sm:flex-none"
                title={layoutMode === 'hierarchical' ? 'Hierarchical layout' : 'Spring layout'}
              >
                <Graph weight="duotone" className="size-5 shrink-0" />
                <span className="truncate">
                  {layoutMode === 'hierarchical' ? 'Hierarchy' : 'Spring'}
                </span>
              </Button>
              <Button
                type="button"
                onClick={() => setFixedLayout(!fixedLayout)}
                variant={fixedLayout ? 'default' : 'outline'}
                className="coarse:min-h-11 min-w-[4.5rem] flex-1 gap-2 sm:flex-none"
                title="Fixed node positions"
              >
                <Lock weight={fixedLayout ? 'fill' : 'regular'} className="size-5 shrink-0" />
                <span className="truncate">Fixed</span>
              </Button>
            </div>
          </div>
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
