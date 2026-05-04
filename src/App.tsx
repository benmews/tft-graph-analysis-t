import { useState, useMemo } from 'react'
import { GraphVisualization } from './components/GraphVisualization'
import { tftSets, set13, set14, set17 } from './lib/tft-data'
import { generateBipartiteGraph, generateTraitEdgeGraph, findNeighbors } from './lib/graph-utils'
import { VisualizationMode, GraphNode, GraphEdge, TFTSet, LayoutMode } from './lib/types'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Switch } from './components/ui/switch'
import { Badge } from './components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Input } from './components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import { 
  ArrowsLeftRight, 
  MagnifyingGlass, 
  Sparkle, 
  Graph,
  Plus,
  Minus,
  ArrowsClockwise,
  Lock,
  SortAscending,
  Coins
} from '@phosphor-icons/react'

function App() {
  const [currentSet, setCurrentSet] = useState<TFTSet>(set17)
  const [mode, setMode] = useState<VisualizationMode>('bipartite')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('spring')
  const [selectedChampions, setSelectedChampions] = useState<string[]>([])
  const [expandedNodes, setExpandedNodes] = useState<string[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [fixedLayout, setFixedLayout] = useState(true)
  const [sortBy, setSortBy] = useState<'alphabetical' | 'cost'>('alphabetical')
  const [filterText, setFilterText] = useState('')

  const { nodes: allNodes, edges: allEdges } = useMemo(() => {
    if (mode === 'bipartite') {
      return generateBipartiteGraph(currentSet, selectedChampions)
    } else {
      return generateTraitEdgeGraph(currentSet, selectedChampions)
    }
  }, [mode, selectedChampions, currentSet])

  const visibleNodes = useMemo(() => {
    if (fixedLayout && expandedNodes.length === 0 && selectedChampions.length === 0) {
      return allNodes
    }
    
    if (expandedNodes.length === 0 && selectedChampions.length === 0) {
      return allNodes.slice(0, 15)
    }

    const visible = new Set<string>()
    
    selectedChampions.forEach((champId) => {
      const nodeId = `champion-${champId}`
      visible.add(nodeId)
      
      const hops = mode === 'traits-as-edges' ? 1 : 2
      const neighbors = findNeighbors(nodeId, allEdges, hops)
      neighbors.forEach((n) => visible.add(n))
    })

    expandedNodes.forEach((nodeId) => {
      visible.add(nodeId)
      const neighbors = findNeighbors(nodeId, allEdges, 1)
      neighbors.forEach((n) => visible.add(n))
    })

    return allNodes.filter((node) => visible.has(node.id))
  }, [allNodes, allEdges, selectedChampions, expandedNodes, layoutMode, mode, fixedLayout])

  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))
    return allEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )
  }, [visibleNodes, allEdges])

  const handleNodeClick = (nodeId: string) => {
    if (nodeId.startsWith('champion-')) {
      const championId = nodeId.replace('champion-', '')
      if (selectedChampions.includes(championId)) {
        setSelectedChampions((prev) => prev.filter((id) => id !== championId))
        return
      }
    }
    
    setExpandedNodes((prev) => {
      if (prev.includes(nodeId)) {
        return prev.filter((id) => id !== nodeId)
      }
      return [...prev, nodeId]
    })
  }

  const handleResetExpansions = () => {
    setExpandedNodes([])
  }

  const handleResetAll = () => {
    setExpandedNodes([])
    setSelectedChampions([])
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

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? 'traits-as-edges' : 'bipartite')
  }

  const handleLayoutToggle = (checked: boolean) => {
    setLayoutMode(checked ? 'spring' : 'hierarchical')
  }

  const selectedChampionNodes = visibleNodes.filter((node) => 
    node.type === 'champion' && selectedChampions.includes(node.id.replace('champion-', ''))
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

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="flex-1 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Graph size={32} className="text-accent" weight="duotone" />
            <h1 className="text-3xl font-bold tracking-tight">TFT Graph Analysis</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={currentSet.id} onValueChange={handleSetChange}>
              <SelectTrigger className="w-[240px]">
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

            <Button 
              onClick={() => handleModeToggle(mode === 'bipartite')}
              variant="outline"
              className="gap-2"
            >
              <ArrowsLeftRight />
              {mode === 'bipartite' ? 'Bipartite' : 'Trait Edges'}
            </Button>

            <Button 
              onClick={() => handleLayoutToggle(layoutMode === 'hierarchical')}
              variant="outline"
              className="gap-2"
            >
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
            
            <div className="flex gap-2">
              <Button 
                onClick={handleExpandAll}
                variant="outline"
                className="gap-2"
              >
                <Plus weight="bold" />
                Expand All Nodes
              </Button>
              <Button 
                onClick={handleResetExpansions}
                variant="outline"
                className="gap-2"
              >
                <ArrowsClockwise />
                Reset Expansions
              </Button>
              <Button 
                onClick={handleResetAll}
                variant="outline"
                className="gap-2"
              >
                <ArrowsClockwise weight="bold" />
                Reset All
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-lg overflow-hidden relative z-0">
          <GraphVisualization
            nodes={visibleNodes}
            edges={visibleEdges}
            mode={mode}
            layoutMode={layoutMode}
            onNodeClick={handleNodeClick}
            onNodeHover={setHoveredNode}
            selectedNodes={selectedChampions.map((id) => `champion-${id}`)}
            expandedNodes={expandedNodes}
            fixedLayout={fixedLayout}
          />
        </div>

        <Card className="bg-card/50 backdrop-blur relative z-10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{visibleNodes.length} nodes</span>
                <span>•</span>
                <span className="font-mono">{visibleEdges.length} edges</span>
                <span>•</span>
                <span>{mode === 'bipartite' ? 'Bipartite Graph' : 'Trait Edge Graph'}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Click nodes to expand neighbors • Scroll to zoom • Drag to pan
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-96 bg-card border-l border-border p-6 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <Tabs defaultValue="explore" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="explore" className="gap-2">
                <MagnifyingGlass size={16} />
                Explore
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Sparkle size={16} />
                Insights
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="explore" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Selected Champions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedChampionNodes.length > 0 ? (
                    selectedChampionNodes.map((node) => {
                      const champion = currentSet.champions.find(
                        (c) => c.id === node.id.replace('champion-', '')
                      )
                      return (
                        <div
                          key={node.id}
                          className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{node.label}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {champion?.cost}g
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            {champion?.traits.map((traitId) => {
                              const trait = currentSet.traits.find((t) => t.id === traitId)
                              return (
                                <Badge
                                  key={traitId}
                                  className="text-xs"
                                  style={{ backgroundColor: trait?.color }}
                                >
                                  {trait?.name}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No champions selected
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Champions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <MagnifyingGlass
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      placeholder="Filter champions..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSortBy('alphabetical')}
                      variant={sortBy === 'alphabetical' ? 'default' : 'outline'}
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <SortAscending size={16} />
                      A-Z
                    </Button>
                    <Button
                      onClick={() => setSortBy('cost')}
                      variant={sortBy === 'cost' ? 'default' : 'outline'}
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <Coins size={16} />
                      Cost
                    </Button>
                  </div>

                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {sortedAndFilteredChampions.map((champion) => {
                      const isSelected = selectedChampions.includes(champion.id)
                      return (
                        <button
                          key={champion.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedChampions((prev) =>
                                prev.filter((id) => id !== champion.id)
                              )
                            } else {
                              setSelectedChampions((prev) => [...prev, champion.id])
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                            isSelected
                              ? 'bg-selected/20 border border-selected'
                              : 'hover:bg-secondary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <Minus size={16} className="text-selected" weight="bold" />
                            ) : (
                              <Plus size={16} className="text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">{champion.name}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {champion.cost}g
                            </Badge>
                          </div>
                        </button>
                      )
                    })}
                    {sortedAndFilteredChampions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No champions found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get AI-powered suggestions for optimal trait combinations and synergies.
                  </p>
                  <Button className="w-full gap-2" disabled>
                    <Sparkle weight="fill" />
                    Analyze Current Team
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Coming soon
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Champions</span>
                    <span className="font-mono font-semibold">{currentSet.champions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Traits</span>
                    <span className="font-mono font-semibold">{currentSet.traits.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visible Nodes</span>
                    <span className="font-mono font-semibold">{visibleNodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expanded Nodes</span>
                    <span className="font-mono font-semibold">{expandedNodes.length}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App